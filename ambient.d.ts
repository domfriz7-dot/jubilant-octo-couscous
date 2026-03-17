export type ConnectionRelationship = 'partner' | 'friend' | 'family' | 'coworker' | 'other' | 'self';

// Back-compat exports used by older services.
export type RelationshipKind = ConnectionRelationship;

export type AppUser = {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  color?: string;
  relationship?: RelationshipKind;
  level?: number;
  linkedVia?: string;
};

export type UserProfile = {
  id: string;
  // Legacy fields used throughout the app
  name?: string;
  displayName?: string;
  email?: string;
  avatar?: string | null;
  photoUri?: string | null;
  color?: string;
  relationship?: RelationshipKind;
};

export type ConnectionStatus = 'draft' | 'pending' | 'connected';

export type Connection = {
  id: string;
  name: string;
  email?: string;
  color?: string;
  avatar?: string | null;
  relationship?: ConnectionRelationship;
  level?: number;
  linkedVia?: string;
  createdAt?: number;
  remoteUid?: string | null;
  inviteId?: string | null;
  pairedAt?: number;
  status?: ConnectionStatus;
};

export type Invite = {
  id: string;
  code: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  createdAt: number;
  acceptedAt?: number;
};
