/**
 * Partner/Relationship Utilities
 *
 * Centralized logic for identifying intimate partners and relationship types.
 */

export type RelationshipLike = { relationship?: string } | null | undefined;

/**
 * Relationship types considered "intimate partners"
 * Used for features like daily pulse, relationship engine, etc.
 */
export const INTIMATE_TYPES = [
  'partner',
  'boyfriend',
  'girlfriend',
  'husband',
  'wife',
  'fiance',
  'fiancee',
  'spouse',
] as const;

/** Check if a user is an intimate partner */
export function isIntimatePartner(user: RelationshipLike): boolean {
  if (!user || !user.relationship) return false;
  return (INTIMATE_TYPES as readonly string[]).includes(user.relationship.toLowerCase());
}

/** Find the first intimate partner in a list of users */
export function findIntimatePartner<T extends RelationshipLike>(users: T[]): T | null {
  if (!Array.isArray(users)) return null;
  return users.find(isIntimatePartner) ?? null;
}

/** Get all intimate partners from a list of users */
export function getIntimatePartners<T extends RelationshipLike>(users: T[]): T[] {
  if (!Array.isArray(users)) return [];
  return users.filter(isIntimatePartner);
}

/** Check if a relationship type string is intimate */
export function isIntimateRelationshipType(relationshipType: unknown): boolean {
  if (!relationshipType || typeof relationshipType !== 'string') return false;
  return (INTIMATE_TYPES as readonly string[]).includes(relationshipType.toLowerCase());
}

/**
 * Extract the first name from a full name string.
 * Falls back to the provided fallback (default: 'Partner').
 *
 * @example getFirstName('Jane Doe')        // → 'Jane'
 * @example getFirstName(undefined, 'them') // → 'them'
 */
export function getFirstName(name: string | null | undefined, fallback = 'Partner'): string {
  if (!name || typeof name !== 'string') return fallback;
  return name.split(' ')[0] || fallback;
}
