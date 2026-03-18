const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();

/**
 * Send a push notification when a new event is shared with a user.
 */
exports.onEventShared = onDocumentCreated('events/{eventId}', async (event) => {
  const data = event.data?.data();
  if (!data) return;

  const { sharedWith = [], title, ownerId } = data;
  if (!sharedWith.length) return;

  const db = getFirestore();
  const messaging = getMessaging();

  // Fetch FCM tokens for all recipients
  const tokenDocs = await Promise.all(
    sharedWith.map((uid) => db.doc(`users/${uid}`).get())
  );

  const tokens = tokenDocs
    .map((doc) => doc.data()?.fcmToken)
    .filter(Boolean);

  if (!tokens.length) return;

  await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: 'New shared event',
      body: `${ownerId} shared "${title}" with you`,
    },
    data: { kind: 'event_shared', eventId: event.params.eventId },
  });
});
