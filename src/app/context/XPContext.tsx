import React, { createContext, useContext } from 'react';

type AwardXP = (amount: number, reason: string) => Promise<void>;

const XPContext = createContext<AwardXP>(async () => {});

export const XPProvider = XPContext.Provider;

/** Returns the awardXP function. Safe to call when Firebase / XP system is unavailable — it no-ops. */
export function useAwardXP(): AwardXP {
  return useContext(XPContext);
}
