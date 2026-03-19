const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore } = require('firebase-admin/firestore');
const functionsV1 = require('firebase-functions');

initializeApp();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getFcmToken(uid) {
  const snap = await getFirestore().doc(`users/${uid}`).get();
  return snap.data()?.fcmToken ?? null;
}

/**
 * Send an FCM push notification to a single user.
 * Errors are caught and logged but never re-thrown — a messaging failure
 * must never crash a Firestore trigger and cause unwanted retries.
 */
async function notifyUser(uid, title, body, data) {
  try {
    const token = await getFcmToken(uid);
    if (!token) return;
    await getMessaging().send({ token, notification: { title, body }, data: data ?? {} });
  } catch (err) {
    console.error(`notifyUser(${uid}) failed:`, err);
  }
}

// ─── Callable: findUserByEmail ────────────────────────────────────────────────

/**
 * Look up a registered Firebase Auth user by email.
 * Returns { found: true, uid, displayName } or { found: false }.
 * Using a Cloud Function keeps user data private — clients never need
 * broad read access to the /users collection.
 */
exports.findUserByEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }
  const email = (request.data?.email ?? '').toLowerCase().trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'A valid email is required.');
  }
  try {
    const record = await getAdminAuth().getUserByEmail(email);
    return { found: true, uid: record.uid, displayName: record.displayName ?? null };
  } catch (err) {
    if (err.code === 'auth/user-not-found') return { found: false };
    throw new HttpsError('internal', 'User lookup failed.');
  }
});

// ─── Trigger: invitation created → notify recipient ───────────────────────────

exports.onInvitationCreated = onDocumentCreated('invitations/{inviteId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { toEmail, toUid, fromName, fromUid } = data;
  let recipientUid = toUid;

  // Patch toUid if the client didn't resolve it (user existed but lookup failed)
  if (!recipientUid && toEmail) {
    try {
      const record = await getAdminAuth().getUserByEmail(toEmail);
      recipientUid = record.uid;
      await event.data.ref.update({ toUid: recipientUid });
    } catch {
      // Recipient not registered yet — invitation waits with toUid = null
    }
  }

  if (!recipientUid || recipientUid === fromUid) return;

  await notifyUser(
    recipientUid,
    'New calendar invite',
    `${fromName || fromUid} wants to share calendars with you`,
    { kind: 'invite_received', inviteId: event.params.inviteId }
  );
});

// ─── Trigger: invitation updated (accepted / declined) ────────────────────────

exports.onInvitationUpdated = onDocumentUpdated('invitations/{inviteId}', async (event) => {
  const before = event.data?.before?.data();
  const after  = event.data?.after?.data();
  if (!before || !after || before.status === after.status) return;

  if (after.status === 'declined' && before.status === 'pending') {
    const { fromUid, toEmail } = after;
    if (fromUid) {
      await notifyUser(fromUid, 'Invitation declined', `${toEmail} declined your invite`, {
        kind: 'invite_declined',
        inviteId: event.params.inviteId,
      });
    }
  }
});

// ─── Trigger: connection created → notify sender ──────────────────────────────

exports.onConnectionCreated = onDocumentCreated('connections/{connectionId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { fromUid, toUid, fromName, toName } = data;

  // Notify the inviter that their invite was accepted
  if (fromUid) {
    await notifyUser(
      fromUid,
      'Invitation accepted!',
      `${toName || 'Someone'} accepted your calendar invite`,
      { kind: 'invite_accepted', connectionId: event.params.connectionId }
    );
  }

  // Notify the acceptor that the connection is now live
  if (toUid) {
    await notifyUser(
      toUid,
      "You're now connected!",
      `You are now sharing calendars with ${fromName || 'someone'}`,
      { kind: 'invite_accepted', connectionId: event.params.connectionId }
    );
  }
});

// ─── Trigger: event shared → notify recipients ────────────────────────────────

exports.onEventShared = onDocumentCreated('events/{eventId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { sharedWith = [], title, ownerId } = data;
  if (!sharedWith.length) return;

  try {
    const db = getFirestore();

    // Resolve the owner's display name so the notification reads naturally.
    let ownerName = ownerId;
    try {
      const ownerSnap = await db.doc(`users/${ownerId}`).get();
      const ownerData = ownerSnap.data();
      ownerName = ownerData?.displayName || ownerData?.email || ownerId;
    } catch {
      // Non-fatal — fall back to UID in the notification body
    }

    const tokenDocs = await Promise.all(sharedWith.map((uid) => db.doc(`users/${uid}`).get()));
    const tokens = tokenDocs.map((d) => d.data()?.fcmToken).filter(Boolean);
    if (!tokens.length) return;

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title: 'New shared event', body: `${ownerName} shared "${title}" with you` },
      data: { kind: 'event_shared', eventId: event.params.eventId },
    });
  } catch (err) {
    console.error('onEventShared failed:', err);
  }
});

// ─── Auth trigger: new user → create profile + resolve pending invites ────────

exports.onAuthUserCreated = functionsV1.auth.user().onCreate(async (user) => {
  const db = getFirestore();

  try {
    // Initialise user profile
    await db.doc(`users/${user.uid}`).set({
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? null,
      fcmToken: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error(`onAuthUserCreated: failed to create profile for ${user.uid}:`, err);
    // Return without backfilling invitations — profile write is the priority;
    // a retry will re-attempt profile creation.
    return;
  }

  // Backfill toUid on invitations that arrived before the user registered
  if (!user.email) return;
  try {
    const pending = await db.collection('invitations')
      .where('toEmail', '==', user.email.toLowerCase())
      .where('toUid', '==', null)
      .where('status', '==', 'pending')
      .get();

    if (pending.empty) return;
    const batch = db.batch();
    pending.docs.forEach((doc) => batch.update(doc.ref, { toUid: user.uid }));
    await batch.commit();
  } catch (err) {
    console.error(`onAuthUserCreated: invitation backfill failed for ${user.email}:`, err);
  }
});
