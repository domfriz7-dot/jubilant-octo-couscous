import { EVENT_COLORS } from '../ui/theme/tokens';

export interface Connection {
  id: string;
  name: string;
  email: string;
  color: string;
  status: 'active' | 'pending';
}

// In production this list comes from the backend / real-time database.
// Until backend integration is wired up this module is the single source of
// truth for demo connection data so that all screens stay in sync.
const CONNECTIONS: Connection[] = [
  { id: 'u1', name: 'Jordan', email: 'jordan@example.com', color: EVENT_COLORS[0], status: 'active' },
  { id: 'u2', name: 'Sam',    email: 'sam@example.com',    color: EVENT_COLORS[2], status: 'active' },
  { id: 'u3', name: 'Riley',  email: 'riley@example.com',  color: EVENT_COLORS[4], status: 'pending' },
];

export function getConnections(): Connection[] {
  return CONNECTIONS;
}

export function getConnectionById(id: string): Connection | undefined {
  return CONNECTIONS.find((c) => c.id === id);
}

export function getActiveConnections(): Connection[] {
  return CONNECTIONS.filter((c) => c.status === 'active');
}
