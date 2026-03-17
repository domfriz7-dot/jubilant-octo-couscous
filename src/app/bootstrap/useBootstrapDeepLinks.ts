import { useEffect, MutableRefObject } from 'react';
import { Linking } from 'react-native';
import { reportError } from '../../utils/reportError';

type NavRef = MutableRefObject<any>;

function handleUrl(url: string, nav: NavRef): void {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, '');
    const segments = path.split('/');
    if (!nav.current?.navigate) return;
    if (segments[0] === 'event' && segments[1]) {
      nav.current.navigate('EventDetails', { eventId: segments[1] });
    } else if (segments[0] === 'invite' && segments[1]) {
      nav.current.navigate('MainTabs', { screen: 'Connections' });
    }
  } catch (e) {
    reportError('useBootstrapDeepLinks', e);
  }
}

export default function useBootstrapDeepLinks(navRef: NavRef): void {
  useEffect(() => {
    // Handle link that opened the app from cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url, navRef);
    });

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url, navRef));
    return () => sub.remove();
  }, [navRef]);
}
