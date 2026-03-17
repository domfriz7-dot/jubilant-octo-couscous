import CalendarService from './CalendarService';
import PulseService, { PULSE_OPTIONS } from './PulseService';
import DailyRitualService from './DailyRitualService';
import { todayKey, startOfDay, addDays, daysBetween } from '../utils/dateTime';
import { getCurrentUserId } from './IdentityService';
import { logError } from './logger';

type BalanceResultLike = {
  totals?: Record<string, number>;
  weekly?: { lastMinute?: { lateCancels?: { you?: number; partner?: number } } };
  shares?: { planningShare?: number };
} | null | undefined;

type RiskReason =
  | string
  | { icon?: string; text: string; severity?: 'low' | 'medium' | 'high' };

/**
 * ConflictPredictorService - "Early Warning System"
 * 
 * Detects patterns that typically lead to relationship conflict.
 * Provides proactive alerts and repair strategies before problems escalate.
 */


async function inferPartnerIdFromEvents(): Promise<string | null> {
  try {
    const events = await CalendarService.getEvents();
    const youId = getCurrentUserId();
    if (!events || events.length === 0) return null;

    const counts: Record<string, number> = {};
    for (const e of events) {
      const ids = new Set<string>();
      if (e?.createdBy) ids.add(String(e.createdBy));
      for (const id of (e?.sharedWith || [])) ids.add(String(id));
      ids.delete(String(youId));
      for (const id of ids) counts[id] = (counts[id] || 0) + 1;
    }
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  } catch {
    return null;
  }
}

// ─── Signal Detection ─────────────────────────────────────

/**
 * Detect behavior changes that signal conflict risk
 */
async function detectBehaviorSignals(opts: { partnerId: string | null; balance: BalanceResultLike | null }) {
  try {
    const partnerId = opts.partnerId;
    if (!partnerId) {
      return { yourCancels: 0, partnerCancels: 0, responseSpeedDelta: 0, planningImbalance: 0 };
    }

    const balance = opts.balance;
    const t = balance?.totals || {};
    const w = balance?.weekly || {};

    const yourCancels = Number(w?.lastMinute?.lateCancels?.you || 0) + Number(t.youDeclines || 0);
    const partnerCancels = Number(w?.lastMinute?.lateCancels?.partner || 0) + Number(t.partnerDeclines || 0);

    // Response speed delta: we don't have historical telemetry yet, so keep this neutral.
    // (Upgrade later once invite acceptance timestamps exist.)
    const responseSpeedDelta = 0;

    // Planning imbalance: distance from 50/50 planning share
    const planningShare = Number(balance?.shares?.planningShare ?? 0.5);
    const planningImbalance = Math.abs(planningShare - 0.5);

    return { yourCancels, partnerCancels, responseSpeedDelta, planningImbalance };
  } catch {
    return {
      yourCancels: 0,
      partnerCancels: 0,
      responseSpeedDelta: 0,
      planningImbalance: 0,
    };
  }
}

/**
 * Detect emotional signals from pulse check-ins
 */
async function detectEmotionalSignals(partnerId: string | null) {
  try {
    if (!partnerId) return { pulseDowntrend: false, avgPulse: 3, recentLowCount: 0, ritualHighStress: false, ritualNeedsBurst: false, ritualNotDoneToday: false };

    const ritual = await DailyRitualService.getSummary(partnerId, 7).catch(() => null);

    const recentPulses = await PulseService.getRecentPulses?.(partnerId, 7);
    if (!recentPulses || recentPulses.length === 0) {
      return { pulseDowntrend: false, avgPulse: 3, recentLowCount: 0, ritualHighStress: false, ritualNeedsBurst: false, ritualNotDoneToday: false };
    }

    // Calculate average
    const avgPulse = recentPulses.reduce((sum, p) => sum + ((PULSE_OPTIONS.find((opt) => opt.id === p.pulseId)?.weight ?? 3) || 3), 0) / recentPulses.length;

    // Detect downtrend (last 3 days worse than previous 4)
    if (recentPulses.length >= 5) {
      const recent3 = recentPulses.slice(0, 3).reduce((s, p) => s + ((PULSE_OPTIONS.find((opt) => opt.id === p.pulseId)?.weight ?? 3) || 3), 0) / 3;
      const older4 = recentPulses.slice(3).reduce((s, p) => s + ((PULSE_OPTIONS.find((opt) => opt.id === p.pulseId)?.weight ?? 3) || 3), 0) / 4;
      const pulseDowntrend = recent3 < older4 - 0.5; // Significant drop

      return {
        pulseDowntrend,
        avgPulse,
        recentLowCount: recentPulses.slice(0, 3).filter((p: { pulseId?: string }) => ((PULSE_OPTIONS.find((opt) => opt.id === p.pulseId)?.weight ?? 3) || 3) <= 2).length,
        ritualHighStress: ritual?.stressAvg != null && ritual.stressAvg >= 3.8,
        ritualNeedsBurst: (ritual?.needsCount || 0) >= 3,
        ritualNotDoneToday: ritual?.todayDone === false,
      };
    }

    return {
      pulseDowntrend: false,
      avgPulse,
      recentLowCount: recentPulses.filter((p: { pulseId?: string }) => ((PULSE_OPTIONS.find((opt) => opt.id === p.pulseId)?.weight ?? 3) || 3) <= 2).length,
      ritualHighStress: ritual?.stressAvg != null && ritual.stressAvg >= 3.8,
      ritualNeedsBurst: (ritual?.needsCount || 0) >= 3,
      ritualNotDoneToday: ritual?.todayDone === false,
    };
  } catch {
    return { pulseDowntrend: false, avgPulse: 3, recentLowCount: 0, ritualHighStress: false, ritualNeedsBurst: false, ritualNotDoneToday: false };
  }
}

/**
 * Detect future gap (lack of upcoming plans)
 */
async function detectFutureGapSignals(partnerId: string | null) {
  try {
    const events = await CalendarService.getEvents();
    const youId = getCurrentUserId();
    if (!partnerId) return { upcomingPlans: 1, daysSinceLastDate: 0, nextDateIn: 0 };
    const today = startOfDay(new Date());
    const next7Days = startOfDay(addDays(new Date(), 7));

    // Shared events in next 7 days
    const upcoming = (events || []).filter((e: { date?: string; sharedWith?: string[]; createdBy?: string }) => {
      const involvesYou = (e.createdBy === youId) || (e.sharedWith||[]).includes(youId);
      const involvesPartner = (e.createdBy === partnerId) || (e.sharedWith||[]).includes(partnerId);
      const eventDate = new Date(e.date + 'T00:00:00');
      const isFuture = eventDate >= today && eventDate < next7Days;
      return involvesYou && involvesPartner && isFuture && !e.cancelled;
    });

    // Days since last shared event
    const past = (events || []).filter((e: { date?: string; sharedWith?: string[]; createdBy?: string }) => {
      const involvesYou = (e.createdBy === youId) || (e.sharedWith||[]).includes(youId);
      const involvesPartner = (e.createdBy === partnerId) || (e.sharedWith||[]).includes(partnerId);
      const eventDate = new Date(e.date + 'T00:00:00');
      return involvesYou && involvesPartner && eventDate < today && !e.cancelled;
    }).sort((a,b) => b.date.localeCompare(a.date));

    const lastEvent = past[0];
    // Clean onboarding: no history should not scream "999 days".
    // Use 0 so first-run values remain neutral.
    const daysSinceLastDate = lastEvent ? daysBetween(lastEvent.date, todayKey()) : 0;

    // Days until next event
    const nextEvent = upcoming[0];
    const nextDateIn = nextEvent ? daysBetween(todayKey(), nextEvent.date) : 0;

    return {
      upcomingPlans: upcoming.length,
      daysSinceLastDate,
      nextDateIn,
    };
  } catch {
    return { upcomingPlans: 1, daysSinceLastDate: 0, nextDateIn: 0 };
  }
}

// ─── Risk Scoring ─────────────────────────────────────────

export async function predictConflictRisk(opts?: { partnerId?: string | null; balance?: BalanceResultLike | null }) {
  const partnerId = opts?.partnerId ?? (await inferPartnerIdFromEvents());
  const balance = opts?.balance ?? null;

  // ── New user guard ────────────────────────────────────────────────────────
  // If there's no partner and no events yet, there is no data to analyse.
  // Return a clean "no data yet" state instead of triggering false risk signals
  // (e.g. "No plans in next 7 days" fires on day 1 for everyone).
  if (!partnerId) {
    try {
      const { default: CalendarService } = await import('./CalendarService');
      const events = await CalendarService.getEvents();
      if (!events || events.length === 0) {
        return {
          riskLevel: 'low' as const,
          riskScore: 0,
          riskPoints: 0,
          color: '#9CA3AF',
          message: 'Add your first shared plan to start tracking relationship patterns.',
          reasons: [],
          repairMoves: [],
          isNewUser: true,
        };
      }
    } catch (e) { logError('ConflictPredictorService.nonFatal', e); }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── 14-day warmup guard (matches HealthScoreService) ───────────────────
  // New accounts with a partner but sparse data should not see tension alerts.
  if (partnerId) {
    try {
      const { default: CalendarService } = await import('./CalendarService');
      const allEvents = await CalendarService.getEvents().catch(() => []);
      const sharedEvents = (allEvents || []).filter((e: { sharedWith?: string[]; createdBy?: string }) => {
        return e.createdBy === partnerId || (e.sharedWith || []).includes(partnerId);
      });
      let earliest: Date | null = null;
      for (const e of sharedEvents) {
        const d = new Date(e.date || e.startTime || 0);
        if (d instanceof Date && !isNaN(d.valueOf()) && (!earliest || d < earliest)) earliest = d;
      }
      const daysSince = earliest ? Math.floor((Date.now() - earliest.getTime()) / 86400000) : 0;
      if (sharedEvents.length < 3 || daysSince < 14) {
        return {
          riskLevel: 'low' as const,
          riskScore: 0, riskPoints: 0,
          color: '#9CA3AF',
          message: 'Collecting data — tension alerts will appear after 2 weeks of activity.',
          reasons: [], repairMoves: [],
          isNewUser: true, isWarmup: true,
        };
      }
    } catch (e) { logError('ConflictPredictorService.nonFatal', e); }
  }

  // Gather all signals
  const [behavior, emotional, futureGap] = await Promise.all([
    detectBehaviorSignals({ partnerId, balance }),
    detectEmotionalSignals(partnerId),
    detectFutureGapSignals(partnerId),
  ]);

  // Compile signals
  const signals = {
    ...behavior,
    ...emotional,
    ...futureGap,
  };

  // Risk scoring algorithm
  let riskPoints = 0;
  const reasons: RiskReason[] = [];

  // Behavior signals
  if (signals.yourCancels >= 3) {
    riskPoints += 30;
    reasons.push({
      icon: 'x-circle',
      text: `You\'ve canceled ${signals.yourCancels} times recently`,
      severity: 'high',
    });
  } else if (signals.yourCancels >= 2) {
    riskPoints += 15;
    reasons.push({
      icon: 'alert-circle',
      text: `${signals.yourCancels} recent cancellations`,
      severity: 'medium',
    });
  }

  if (signals.partnerCancels >= 3) {
    riskPoints += 20;
    reasons.push({
      icon: 'alert-triangle',
      text: `Your partner canceled ${signals.partnerCancels} times`,
      severity: 'high',
    });
  }

  if (signals.responseSpeedDelta > 0.3) {
    riskPoints += 25;
    reasons.push({
      icon: 'clock',
      text: 'Response time significantly slower than usual',
      severity: 'high',
    });
  } else if (signals.responseSpeedDelta > 0.15) {
    riskPoints += 12;
    reasons.push({
      icon: 'clock',
      text: 'Response time has slowed down',
      severity: 'medium',
    });
  }

  if (signals.planningImbalance > 0.3) {
    riskPoints += 15;
    reasons.push({
      icon: 'trending-up',
      text: `Planning split is ${Math.round(signals.planningImbalance * 200)}% off balance`,
      severity: 'medium',
    });
  }

  // Emotional signals
  
  // Daily ritual signals (fast + high-signal)
  if (signals.ritualHighStress) {
    riskPoints += 2;
    reasons.push({ icon: 'activity', text: 'High stress trend (via Daily Ritual)', severity: 'medium' });
  }
  if (signals.ritualNeedsBurst) {
    riskPoints += 2;
    reasons.push({ icon: 'flag', text: 'Multiple needs logged lately (via Daily Ritual)', severity: 'medium' });
  }
  if (signals.ritualNotDoneToday) {
    riskPoints += 1;
    reasons.push({ icon: 'message-circle', text: 'No check-in today (risk of silent drift)', severity: 'low' });
  }

if (signals.pulseDowntrend) {
    riskPoints += 20;
    reasons.push({
      icon: 'trending-down',
      text: 'Emotional check-ins trending downward',
      severity: 'high',
    });
  }

  if (signals.recentLowCount >= 2) {
    riskPoints += 15;
    reasons.push({
      icon: 'frown',
      text: 'Multiple "rough" or "bad" days recently',
      severity: 'high',
    });
  } else if (signals.avgPulse < 3.0) {
    riskPoints += 10;
    reasons.push({
      icon: 'meh',
      text: 'Recent mood has been below average',
      severity: 'medium',
    });
  }

  // Future gap signals
  if (signals.upcomingPlans === 0) {
    riskPoints += 20;
    reasons.push({
      icon: 'calendar',
      text: 'No plans scheduled for next 7 days',
      severity: 'high',
    });
  }

  if (signals.daysSinceLastDate > 14) {
    riskPoints += 15;
    reasons.push({
      icon: 'calendar',
      text: `${signals.daysSinceLastDate} days since last quality time`,
      severity: 'high',
    });
  } else if (signals.daysSinceLastDate > 10) {
    riskPoints += 10;
    reasons.push({
      icon: 'calendar',
      text: `${signals.daysSinceLastDate} days since last date`,
      severity: 'medium',
    });
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  let color: string;
  let message: string;
  if (riskPoints >= 60) {
    riskLevel = 'high';
    color = '#EF4444'; // red
    message = 'High tension risk detected. Take action now to prevent conflict.';
  } else if (riskPoints >= 30) {
    riskLevel = 'medium';
    color = '#F59E0B'; // amber
    message = 'Some warning signs detected. A small repair move can help.';
  } else {
    riskLevel = 'low';
    color = '#10B981'; // green
    message = 'No major tension signals. Relationship dynamics look healthy.';
  }

  // Generate repair recommendations
  const repairMoves = generateRepairMoves(signals, riskPoints);

  return {
    riskLevel,
    riskScore: riskPoints,
    riskPoints,
    color,
    message,
    signals,
    reasons: reasons.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 } as const;
      const sa: 'low' | 'medium' | 'high' = (a && typeof a === 'object' && 'severity' in a) ? (a as { severity?: 'low' | 'medium' | 'high' }).severity ?? 'low' : 'low';
      const sb: 'low' | 'medium' | 'high' = (b && typeof b === 'object' && 'severity' in b) ? (b as { severity?: 'low' | 'medium' | 'high' }).severity ?? 'low' : 'low';
      return severityOrder[sa] - severityOrder[sb];
    }),
    repairMoves,
  };
}

// ─── Repair Recommendations ──────────────────────────────

type RepairMove = { title: string; description: string; action: string | null; script: string | null; priority: string };

function generateRepairMoves(signals: Record<string, unknown>, riskPoints: number) {
  const partner = 'your partner'; // Replace with actual name in UI
  const moves: RepairMove[] = [];

  // High-priority repairs
  if (signals.yourCancels >= 3) {
    moves.push({
      title: 'Acknowledge your flakiness',
      description: `You\'ve canceled ${signals.yourCancels} times. Send them a message recognizing this and commit to ONE solid plan this week.`,
      action: 'Send message',
      script: `"Hey, I know I\'ve been flaky lately and I\'m sorry. Life has been overwhelming, but that\'s not fair to you. Let\'s lock in something for [specific day] - anything you want to do, I\'m there. No canceling."`,
      priority: 'high',
    });
  }

  if (signals.upcomingPlans === 0) {
    moves.push({
      title: 'Schedule something now',
      description: 'No plans in the next week creates distance. Schedule one simple thing today.',
      action: 'Pick a date',
      script: null,
      priority: 'high',
    });
  }

  if (signals.planningImbalance > 0.3) {
    const youPlanTooMuch = signals.planningImbalance > 0.5;
    if (youPlanTooMuch) {
	    moves.push({
	      title: 'Let them lead',
	      description: "You\'re planning most things. Ask them to pick the next date.",
        action: 'Send request',
        script: `"Hey, I\'ve been doing a lot of planning lately. Would you mind picking something for us to do this week? Whatever you want, I\'m in!"`,
        priority: 'medium',
      });
    } else {
      moves.push({
        title: 'Step up on planning',
        description: 'They\'ve been doing most of the planning. Take the initiative this time.',
        action: 'Plan something',
        script: null,
        priority: 'medium',
      });
    }
  }

  if (signals.pulseDowntrend || signals.avgPulse < 3.0) {
    moves.push({
      title: 'Have an emotional check-in',
      // Use double quotes here because the copy contains an apostrophe (something's)
      description: "Recent pulse scores suggest something's off. Have an honest conversation.",
      action: 'Start conversation',
      script: `"I\'ve noticed we've both been feeling a bit off lately. Want to talk about what's going on? No pressure, just checking in."`,
      priority: 'high',
    });
  }

  if (signals.responseSpeedDelta > 0.2) {
    moves.push({
      title: 'Respond faster',
      description: 'Your response times have slowed significantly. Quick replies show you care.',
      action: 'Set reminder',
      script: null,
      priority: 'medium',
    });
  }

  if (signals.daysSinceLastDate > 10 && signals.upcomingPlans === 0) {
    moves.push({
      title: 'Break the dry spell',
      description: `It\'s been ${signals.daysSinceLastDate} days since quality time. Do something small today.`,
      action: 'Emergency date',
      script: null,
      priority: 'high',
    });
  }

  // If no major issues, provide maintenance advice
  if (moves.length === 0) {
    moves.push({
      title: 'Keep the momentum',
      description: 'Things are healthy. Maintain your rhythm and stay consistent.',
      action: null,
      script: null,
      priority: 'low',
    });
  }

  return moves.slice(0, 3); // Top 3 most important
}

// ─── Utilities ────────────────────────────────────────────

async function getHistoricalResponseSpeed() {
  // TODO: Track historical average response speed
  // For now, return reasonable default
  return 0.8;
}

// ─── Exports ──────────────────────────────────────────────

export default {
  predictConflictRisk,
};