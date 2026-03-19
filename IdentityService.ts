/**
 * DateIdeasService — 200+ curated ideas (local)
 *
 * Randomly selects from a large set.
 * Optional filters: vibe, budget.
 */

export type BudgetTier = 'low' | 'mid' | 'high';

export type DateIdea = {
  title: string;
  /** Primary vibe for display */
  vibe: string;
  /** Optional: extra vibes the idea can fit (used for filtering) */
  vibes?: string[];
  budget: BudgetTier;
  category: string;
  /** Optional: Google Places-ish category (best effort) */
  placesCat?: string;
  durationMins?: number;
  details?: string;
  /** Why this idea is good (premium feel). */
  why?: string;
  /** Quick first steps to get started. */
  firstSteps?: string[];
};

export type GenerateDateIdeasOptions = {
  /** Optional preferred start time label (e.g. "Tonight", "Morning") */
  time?: string;
  budget?: BudgetTier;
  vibe?: string;
  limit?: number;
  /** legacy alias */
  count?: number;

  /** Optional: avoid idea titles/categories already used recently (currently advisory). */
  avoid?: string[];

  /** Optional: dietary preference string (currently advisory). */
  dietary?: string;

  /** Optional: distance preference (currently advisory). */
  maxDistanceKm?: number;

  /** Optional: deterministic randomness for testing */
  seed?: number;
};

import { IDEAS } from './dateIdeasCatalog';

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function matchesVibe(idea: DateIdea, vibe: string): boolean {
  if (!vibe) return true;
  if (idea.vibe === vibe) return true;
  if (Array.isArray(idea.vibes) && idea.vibes.includes(vibe)) return true;
  return false;
}

function decorateIdea(idea: DateIdea): DateIdea {
  // Keep curated fields if present.
  if (idea.why || (idea.firstSteps && idea.firstSteps.length)) return idea;

  const titleRaw = idea.title || '';
  const title = titleRaw.toLowerCase();
  const category = (idea.category || '').toLowerCase();
  const vibe = (idea.vibe || '').toLowerCase();
  const isHome = idea.placesCat === 'home' || category.includes('home') || title.includes('at home') || title.includes('home');

  // Deterministic pick to keep copy stable per idea.
  const pick = <T,>(arr: T[]): T => {
    let h = 0;
    for (let i = 0; i < titleRaw.length; i++) h = (h * 31 + titleRaw.charCodeAt(i)) >>> 0;
    return arr[h % arr.length];
  };

  const firstSteps: string[] = [];
  const addDurationTips = () => {
    if (idea.budget === 'low') firstSteps.push('Set a small spend cap so it stays effortless.');
    if (idea.durationMins && idea.durationMins <= 60) firstSteps.push('Keep it light—aim to leave on a high note.');
    if (idea.durationMins && idea.durationMins >= 180) firstSteps.push('Add a quick “intermission” plan (coffee/dessert) so it stays fun.');
  };

  // Keyword + category based dialogue so it doesn't repeat for every date.
  const isFood = category.includes('food') || title.includes('dinner') || title.includes('brunch') || title.includes('tapas') || title.includes('ramen');
  const isOutdoors = category.includes('outdoor') || title.includes('walk') || title.includes('hike') || title.includes('picnic') || title.includes('sunset');
  const isGames = category.includes('game') || title.includes('board game') || title.includes('arcade') || title.includes('trivia');
  const isCulture = category.includes('culture') || title.includes('museum') || title.includes('gallery') || title.includes('cinema') || title.includes('theatre') || title.includes('exhibit');
  const isWellness = category.includes('wellness') || title.includes('spa') || title.includes('sauna') || title.includes('yoga') || title.includes('massage');
  const isAdventure = category.includes('adventure') || title.includes('drive-in') || title.includes('escape') || title.includes('kayak') || title.includes('climb');
  const isCreative = category.includes('creative') || title.includes('craft') || title.includes('paint') || title.includes('pottery') || title.includes('cook');

  let why = '';

  if (isHome) {
    why = pick([
      `Low friction, high connection. “${titleRaw}” works because you can relax and make it your vibe.`,
      `Cozy + intentional. “${titleRaw}” creates space to talk more and laugh more without the stress of going out.`,
      `At-home dates win when they’re simple. “${titleRaw}” keeps it easy while still feeling special.`,
    ]);
    firstSteps.push(pick([
      'Pick a start time and set a cozy vibe (music + lighting).',
      'Choose a “start in 10” time so you actually do it.',
      'Do a quick reset together (10 minutes) so the space feels intentional.',
    ]));
    firstSteps.push(pick([
      'Do a 5-minute setup sprint together before you begin.',
      'Agree on one small “no phones” window to stay present.',
      'Pick one shared rule (e.g., best-of-3, one new thing each).',
    ]));
    addDurationTips();
    return { ...idea, why, firstSteps };
  }

  // Going-out baseline steps
  firstSteps.push(pick([
    'Pick a time window and book/confirm the spot if needed.',
    'Choose a start time that fits your energy (and lock it in).',
    'Decide if this is “quick win” (60–90m) or “full date” (2–3h).',
  ]));
  firstSteps.push(pick([
    'Decide on a simple meet-up plan (who gets there first, transport).',
    'Pick the easiest logistics (closest suburb, least traffic, simplest parking).',
    'Send a quick “we’re doing this” text and share the address.',
  ]));

  if (isFood) {
    why = pick([
      `Food dates are easy bonding — you get conversation, shared tastes, and a clear “next step”. “${titleRaw}” is a safe win.`,
      `A meal date removes awkwardness because there’s always something to talk about. “${titleRaw}” feels intentional without being heavy.`,
      `Eating together is underrated intimacy. “${titleRaw}” gives you little moments (ordering, sharing, joking) that build closeness.`,
    ]);
    firstSteps.unshift(pick([
      'Pick one “safe pick” and one “wild card” item to share.',
      'Decide the cuisine first, then pick the closest solid option.',
      'Check dietary needs quickly so it’s smooth.',
    ]));
  } else if (isOutdoors) {
    why = pick([
      `Fresh air + movement = better mood. “${titleRaw}” is great for easy conversation without pressure.`,
      `Outdoors dates feel effortless but memorable. “${titleRaw}” gives you a shared view and a natural flow.`,
      `A little adventure boosts connection. “${titleRaw}” works because you’re side‑by‑side, not face‑to‑face the whole time.`,
    ]);
    firstSteps.unshift(pick([
      'Check the weather and pick the best 60–90 minute window.',
      'Bring water + one small snack so you don’t fade.',
      'Pick a simple “turnaround point” so it doesn’t become a mission.',
    ]));
  } else if (isGames) {
    why = pick([
      `Playful competition creates chemistry fast. “${titleRaw}” gives you laughs + inside jokes.`,
      `Games are a shortcut to connection — you’re collaborating, teasing, and celebrating wins. “${titleRaw}” is perfect for that.`,
      `A game date avoids small talk and creates momentum. “${titleRaw}” keeps it light and fun.`,
    ]);
    firstSteps.unshift(pick([
      'Pick a “best-of-3” rule so it stays playful, not endless.',
      'Set a tiny stake (loser buys dessert/coffee) to make it spicy.',
      'Choose something you can learn in 2 minutes — not a 40-page rulebook.',
    ]));
  } else if (isCulture) {
    why = pick([
      `Culture dates are built-in conversation. “${titleRaw}” gives you talking points before, during, and after.`,
      `Novelty is attractive. “${titleRaw}” feels like a mini-adventure and makes the night memorable.`,
      `Doing something “new” together boosts closeness. “${titleRaw}” is a clean way to get that.`,
    ]);
    firstSteps.unshift(pick([
      'Check session times/tickets first so you don’t get stuck.',
      'Pick one thing to “look out for” (a theme, a piece, a scene) so it’s more engaging.',
      'Plan a 15-minute post-chat (walk/coffee) to debrief — that’s where connection happens.',
    ]));
  } else if (isWellness) {
    why = pick([
      `Wellness dates lower stress and raise warmth. “${titleRaw}” helps you both feel better — together.`,
      `A calm shared reset is underrated romance. “${titleRaw}” is connection without needing big energy.`,
      `When life is busy, this kind of date is gold. “${titleRaw}” feels nurturing and close.`,
    ]);
    firstSteps.unshift(pick([
      'Book ahead if needed — the best times disappear.',
      'Wear comfy clothes and plan a slow finish (tea/juice after).',
      'Decide your “no rush” rule — you’re not cramming this between errands.',
    ]));
  } else if (isAdventure || isCreative) {
    why = pick([
      `Shared novelty builds a strong memory. “${titleRaw}” gives you a story to tell later.`,
      `Doing something slightly different together is instant bonding. “${titleRaw}” nails that.`,
      `This kind of date creates teamwork + laughs. “${titleRaw}” is fun and energizing.`,
    ]);
    firstSteps.unshift(pick([
      'Check any booking/entry requirements first so it’s smooth.',
      'Pick a simple “start point” and go — don’t overplan it.',
      'Decide one “photo moment” so you remember it without being on your phone all night.',
    ]));
  } else {
    why = pick([
      `It feels like an “event” without overplanning. “${titleRaw}” gives you an easy shared experience and good momentum.`,
      `Simple shared experiences create connection fast. “${titleRaw}” is a low-stress way to feel closer.`,
      `This is an easy “yes” date — fun, simple, and memorable. “${titleRaw}” is a solid pick.`,
    ]);
  }

  // Light tone match by vibe.
  if (vibe.includes('romantic')) {
    firstSteps.push(pick([
      'Pick one small “romance detail” (a view, a dessert, a slow walk).',
      'Choose a slightly nicer time slot and make it a little dressed-up.',
    ]));
  } else if (vibe.includes('playful')) {
    firstSteps.push(pick([
      'Add a tiny challenge (best-of-3, silly photo, surprise pick).',
      'Keep it light and let the joke run.',
    ]));
  } else if (vibe.includes('cozy')) {
    firstSteps.push(pick([
      'Aim for quiet seating / low-noise vibe.',
      'Pick comfort-first logistics (closest, easiest, warm).',
    ]));
  }

  addDurationTips();
  return { ...idea, why, firstSteps };
}

/**
 * @param {object} opts
 * @param {'low'|'mid'|'high'=} opts.budget
 * @param {string=} opts.vibe
 * @param {number=} opts.limit - how many to return
 * @returns {Array<object>} ideas
 */
export function generate(opts: GenerateDateIdeasOptions = {}): DateIdea[] {
  const { budget, vibe } = opts;
  const limit = opts.limit ?? opts.count ?? 12;

  let pool = IDEAS;

  if (budget) pool = pool.filter((x) => x.budget === budget);
  if (vibe) pool = pool.filter((x) => matchesVibe(x, vibe));

  // If filters are too strict, fall back gracefully.
  if (!pool.length) pool = IDEAS;

  // Shuffle deterministically per refresh (or per call), then take unique titles.
  const seed = opts.seed ?? Date.now();
  const shuffled = shuffleWithSeed(pool, seed);

  const out: DateIdea[] = [];
  const usedTitle = new Set<string>();
  for (const item of shuffled) {
    if (out.length >= Math.max(1, Math.min(limit, shuffled.length))) break;
    if (usedTitle.has(item.title)) continue;
    usedTitle.add(item.title);
    out.push(decorateIdea(item));
  }

  return out;
}

/**
 * Returns the Google Places category string for nearby-place lookups,
 * or null if the idea is a stay-at-home activity.
 */
export function getPlacesCategory(idea: DateIdea | null | undefined): string | null {
  if (!idea) return null;
  const cat = idea.placesCat;
  if (!cat || cat === 'home') return null;
  return cat;
}

export default { generate, getPlacesCategory };
