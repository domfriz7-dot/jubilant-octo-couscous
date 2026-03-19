/**
 * ConnectionsContext
 *
 * Lifts useInvitations to the app root so that Firestore connection
 * subscriptions are active regardless of which tab the user is on.
 * This ensures ConnectionsService._liveConnections is populated before
 * the user opens AddEventScreen or EventDetailsScreen.
 */
import React, { createContext, useContext } from 'react';
import useInvitations, { InvitationsState } from '../bootstrap/useInvitations';

const ConnectionsContext = createContext<InvitationsState | null>(null);

export function ConnectionsProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const state = useInvitations();
  return <ConnectionsContext.Provider value={state}>{children}</ConnectionsContext.Provider>;
}

/**
 * Returns the shared invitations/connections state.
 * Must be used inside ConnectionsProvider (wraps the NavigationContainer in App.tsx).
 */
export function useConnectionsContext(): InvitationsState {
  const ctx = useContext(ConnectionsContext);
  if (!ctx) throw new Error('useConnectionsContext must be inside ConnectionsProvider');
  return ctx;
}
