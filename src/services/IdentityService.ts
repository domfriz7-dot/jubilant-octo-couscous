import AsyncStorage from '@react-native-async-storage/async-storage';

const IDENTITY_KEY = '@uandme/identity';

interface Identity {
  userId: string;
  createdAt: string;
}

let _identity: Identity | null = null;

/** Generate a random hex string without any native crypto dependency. */
function makeLocalId(): string {
  const rand = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `local_${rand()}${rand()}`.slice(0, 24);
}

/** Initialise (or restore) a stable local identity for this device. */
export async function initIdentityResult(): Promise<Identity> {
  if (_identity) return _identity;

  const stored = await AsyncStorage.getItem(IDENTITY_KEY);
  if (stored) {
    _identity = JSON.parse(stored) as Identity;
    return _identity;
  }

  _identity = { userId: makeLocalId(), createdAt: new Date().toISOString() };
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(_identity));
  return _identity;
}

export function getIdentity(): Identity | null {
  return _identity;
}

export function getUserId(): string {
  return _identity?.userId ?? 'anonymous';
}
