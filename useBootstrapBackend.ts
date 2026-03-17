import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { logEvent, logError } from '../../services/logger';
import { reportError } from '../../utils/reportError';

/**
 * Bootstrap deep-link handling.
 *
 * Supports:
 * - uandme://join/<code>
 * - uandme://join?code=<code>
 * - https://<domain>/join/<code>
 *
 * @param {import('react').RefObject<any>} navigationRef - ref passed to <NavigationContainer ref={...}/>
 * @returns {void}
 */
export default function useBootstrapDeepLinks(navigationRef) {
  const pendingRef = useRef(null);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    const clearRetry = () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const tryNavigate = (routeName, params) => {
      const nav = navigationRef?.current;
      // React Navigation ref becomes usable after NavigationContainer mounts.
      if (nav && typeof nav.navigate === 'function') {
        nav.navigate(routeName, params);
        pendingRef.current = null;
        clearRetry();
        return true;
      }
      return false;
    };

    const scheduleRetry = () => {
      if (retryTimerRef.current) return;
      let attempts = 0;
      retryTimerRef.current = setInterval(() => {
        attempts += 1;
        const pending = pendingRef.current;
        if (!pending) return clearRetry();

        const ok = tryNavigate(pending.routeName, pending.params);
        if (ok || attempts >= 20) {
          clearRetry();
        }
      }, 250);
    };

    const extractJoinCode = (url) => {
      if (!url || typeof url !== 'string') return null;

      try {
        // RN Linking.parse — may not exist in all environments
        if (typeof Linking.parse === 'function') {
          const parsed = Linking.parse(url);
          const host = parsed?.hostname ? String(parsed.hostname) : '';
          const path = parsed?.path ? String(parsed.path) : '';
          const query = parsed?.queryParams || {};

          const combined = [host, path].filter(Boolean).join('/').replace(/^\/+/, '');

          if (String(query.code || '').trim()) return String(query.code).trim();

          if (combined.startsWith('join/')) {
            const code = combined.split('/')[1];
            return code ? String(code).trim() : null;
          }
        }
      } catch {
        // Linking.parse failed — fall through to URL constructor
        // Parse fallback — non-critical
      }

      // Fallback: URL constructor (works for https:// and many schemes)
      try {
        const u = new URL(url);
        const codeQ = u.searchParams.get('code');
        if (codeQ) return String(codeQ).trim();
        const parts = (u.pathname || '').split('/').filter(Boolean);
        if (parts[0] === 'join' && parts[1]) return String(parts[1]).trim();
      } catch (e) { reportError('Bootstrap.DeepLinks', e); // ignore
      }

      // Last resort: regex
      const m = String(url).match(/\bjoin\/(\w[\w-]{2,})/i);
      return m?.[1] ? String(m[1]).trim() : null;
    };

    const handleUrl = async (url) => {
      try {
        const code = extractJoinCode(url);
        if (!code) return;

        logEvent('DeepLinkReceived', { url, code });

        const ok = tryNavigate('Invite', { prefillCode: code });
        if (!ok) {
          pendingRef.current = { routeName: 'Invite', params: { prefillCode: code } };
          scheduleRetry();
        }
      } catch (e) {
        await logError('DeepLinkHandlingFailed', e, { url });
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    Linking.getInitialURL()
      .then((url) => { if (url) handleUrl(url); })
      .catch((e) => { reportError('Bootstrap.DeepLinks.getInitialURL', e); });

    return () => {
      sub.remove();
      clearRetry();
      pendingRef.current = null;
    };
  }, [navigationRef]);
}