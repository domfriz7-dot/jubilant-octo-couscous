import type { Functions } from 'firebase/functions';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { getFirebaseApp } from './firebaseClient';
import { err, ok } from '../../types/result';
import type { Result } from '../../types/result';

let fns: Functions | null = null;

export function getFirebaseFunctions(): Functions | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!fns) fns = getFunctions(app);
  return fns;
}

export async function callCallable<TReq extends Record<string, unknown>, TRes>(
  name: string,
  data: TReq
): Promise<Result<TRes>> {
  try {
    const functions = getFirebaseFunctions();
    if (!functions) return err('Firebase not configured', 'UNSUPPORTED');

    const fn = httpsCallable<TReq, TRes>(functions, name);
    const res = await fn(data);
    return ok(res.data);
  } catch (e) {
    return err(`Callable failed: ${name}`, 'NETWORK', { cause: e });
  }
}
