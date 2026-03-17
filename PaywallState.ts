// src/services/XPService.js
// U&Me Experience Points & Leveling System
// Social growth journey: Introverted → Extroverted → Social Butterfly → Life of the Party

import { readJsonWithSchema, writeJson } from '../utils/storage';
import { zXpData } from '../config/storageSchemas';
import { logError } from './logger';
import { createObservable } from '../utils/observable';
import { todayKey } from '../utils/dateTime';

const XP_STORAGE_KEY = '@uandme_xp_data';

// Level progression theme: Social growth journey
export const LEVELS: Array<{ level: number; title: string; xpRequired: number; icon: string; description: string }> = [
  // Starting Out (Levels 1-3)
  { level: 1, title: 'Just Starting Out', xpRequired: 0, icon: '🌱', description: 'Taking the first steps' },
  { level: 2, title: 'Getting Comfortable', xpRequired: 100, icon: '🌿', description: 'Finding your rhythm' },
  { level: 3, title: 'Building Confidence', xpRequired: 250, icon: '🍃', description: 'Growing stronger' },
  
  // Introverted (Levels 4-6)
  { level: 4, title: 'Quiet Observer', xpRequired: 450, icon: '🌙', description: 'Watching and learning' },
  { level: 5, title: 'Thoughtful Planner', xpRequired: 700, icon: '📚', description: 'Careful and deliberate' },
  { level: 6, title: 'Deep Thinker', xpRequired: 1000, icon: '🧠', description: 'Reflective and wise' },
  
  // Opening Up (Levels 7-9)
  { level: 7, title: 'Warming Up', xpRequired: 1400, icon: '🌅', description: 'Starting to shine' },
  { level: 8, title: 'Making Connections', xpRequired: 1900, icon: '🤝', description: 'Building bridges' },
  { level: 9, title: 'Finding Your Voice', xpRequired: 2500, icon: '🗣️', description: 'Speaking up' },
  
  // Extroverted (Levels 10-13)
  { level: 10, title: 'Social Spark', xpRequired: 3200, icon: '✨', description: 'Energy and enthusiasm' },
  { level: 11, title: 'Natural Connector', xpRequired: 4000, icon: '🌟', description: 'Bringing people together' },
  { level: 12, title: 'Conversation Starter', xpRequired: 4900, icon: '💬', description: 'Never a dull moment' },
  { level: 13, title: 'Group Energizer', xpRequired: 5900, icon: '⚡', description: 'Lighting up the room' },
  
  // Social Butterfly (Levels 14-17)
  { level: 14, title: 'Social Butterfly', xpRequired: 7000, icon: '🦋', description: 'Fluttering everywhere' },
  { level: 15, title: 'Event Magnet', xpRequired: 8200, icon: '🎭', description: 'Where the action is' },
  { level: 16, title: 'Circle Expander', xpRequired: 9500, icon: '🌐', description: 'Ever-growing network' },
  { level: 17, title: 'Connection Master', xpRequired: 11000, icon: '🎪', description: 'Master of relationships' },
  
  // Life of the Party (Levels 18-20)
  { level: 18, title: 'Party Starter', xpRequired: 12700, icon: '🎉', description: 'Making things happen' },
  { level: 19, title: 'Social Superstar', xpRequired: 14500, icon: '🌟', description: 'Everyone knows you' },
  { level: 20, title: 'Life of the Party', xpRequired: 16500, icon: '🎊', description: 'The ultimate social champion!' },
];

// XP rewards for different actions
export type XPData = {
  totalXP: number;
  currentLevel: number;
  xpToNextLevel: number | null;
  achievements: unknown[];
  streaks: { current: number; best: number; lastCompletedDate: string | null };
  dailyTaskXP: { date: string; count: number };
  stats: { tasksCompleted: number; eventsCreated: number; eventsAttended: number; calendarsShared: number; daysActive: number };
  history: Array<{ timestamp?: string; [key: string]: unknown }>;
  [k: string]: unknown;
};

export const XP_REWARDS = {
  // Task completion
  TASK_COMPLETE: 5,              // Changed from 10 to 5
  TASK_COMPLETE_EARLY: 5,        // Changed from 15 to 5
  TASK_STREAK_BONUS: 5,          // Per day in streak
  MAX_DAILY_TASK_XP: 4,          // Max 4 tasks per day get XP
  
  // Event management
  EVENT_CREATE: 5,
  EVENT_ATTEND: 8,
  EVENT_SHARE: 10,
  CONNECTION_INVITE: 10,        // Sent an invite to connect
  EVENT_WITH_MULTIPLE: 15,      // Event with 3+ people
  
  // Social interactions
  SHARE_CALENDAR: 20,
  ACCEPT_SHARE: 15,
  FIRST_CONNECTION: 25,
  
  // Daily engagement
  DAILY_LOGIN: 3,
  WEEKLY_STREAK: 20,
  MONTHLY_ACTIVE: 50,
  
  // Special achievements
  COMPLETE_ONBOARDING: 30,
  FIRST_EVENT: 15,
  FIRST_TASK: 10,
  TEN_EVENTS: 50,
  FIFTY_TASKS: 100,
};

class XPService {
  private _obs: ReturnType<typeof createObservable<[XPData | null]>>;
  private currentData: XPData | null;

  constructor() {
    this._obs = createObservable<[XPData | null]>();
    this.currentData = null;
  }

  // Initialize XP data
  async initialize(): Promise<XPData> {
    const data = await this.loadXPData();
    this.currentData = data;
    return data;
  }

  // Load XP data from storage
  async loadXPData(): Promise<XPData> {
    try {
      const data = await readJsonWithSchema(XP_STORAGE_KEY, zXpData, this.createDefaultData(), 'xpData');
      // If storage had data, return it; otherwise seed defaults
      if (data && typeof data === 'object') {
        // Ensure today's date is set for dailyTaskXP
        const today = todayKey();
        if (data.dailyTaskXP?.date !== today) {
          data.dailyTaskXP = { date: today, count: 0 };
        }
        return data;
      }
      
      // Initialize new user
      const newData: XPData = {
        totalXP: 0,
        currentLevel: 1,
        xpToNextLevel: LEVELS[1].xpRequired,
        achievements: [],
        streaks: {
          current: 0,
          best: 0,
          lastCompletedDate: null,
        },
        dailyTaskXP: {
          date: todayKey(),
          count: 0,
        },
        stats: {
          tasksCompleted: 0,
          eventsCreated: 0,
          eventsAttended: 0,
          calendarsShared: 0,
          daysActive: 1,
        },
        history: [],
      };
      
      await this.saveXPData(newData);
      return newData;
    } catch (error: unknown) {
      logError('XPService.loadXPData', error);
      return this.createDefaultData();
    }
  }

  // Save XP data
  async saveXPData(data: XPData): Promise<void> {
    try {
      await writeJson(XP_STORAGE_KEY, data);
      this.currentData = data;
      this.notifyListeners();
    } catch (error: unknown) {
      logError('XPService.saveXPData', error);
    }
  }

  // Award XP
  async awardXP(amount, reason) {
    const data = await this.loadXPData();
    
    data.totalXP += amount;
    
    // Add to history
    data.history.unshift({
      amount,
      reason,
      timestamp: new Date().toISOString(),
    });
    
    // Keep only last 50 entries
    if (data.history.length > 50) {
      data.history = data.history.slice(0, 50);
    }
    
    // Check for level up
    const levelUpData = this.checkLevelUp(data);
    
    await this.saveXPData(levelUpData.data);
    
    return {
      newXP: data.totalXP,
      xpGained: amount,
      leveledUp: levelUpData.leveledUp,
      newLevel: levelUpData.newLevel,
      levelData: levelUpData.levelData,
    };
  }

  // Check if user leveled up
  checkLevelUp(data: XPData) {
    let leveledUp = false;
    let newLevel = data.currentLevel;
    let levelData: (typeof LEVELS)[number] | null = null;
    
    // Check all levels from current to max
    for (let i = data.currentLevel; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      if (data.totalXP >= level.xpRequired && i + 1 > data.currentLevel) {
        leveledUp = true;
        newLevel = i + 1;
        levelData = LEVELS[i];
        data.currentLevel = newLevel;
        
        // Set XP to next level
        if (i + 1 < LEVELS.length) {
          data.xpToNextLevel = LEVELS[i + 1].xpRequired;
        } else {
          data.xpToNextLevel = null; // Max level
        }
      }
    }
    
    return { leveledUp, newLevel, levelData, data };
  }

  // Get current level info
  getCurrentLevelInfo(data: Pick<XPData, "totalXP" | "currentLevel">) {
    const currentLevelData = LEVELS[data.currentLevel - 1];
    const nextLevelData = data.currentLevel < LEVELS.length ? LEVELS[data.currentLevel] : null;
    
    let xpInCurrentLevel = 0;
    let xpNeededForNext = 0;
    let progressPercent = 0;
    
    if (nextLevelData) {
      const currentLevelStart = currentLevelData.xpRequired;
      const nextLevelStart = nextLevelData.xpRequired;
      
      xpInCurrentLevel = data.totalXP - currentLevelStart;
      xpNeededForNext = nextLevelStart - data.totalXP;
      progressPercent = (xpInCurrentLevel / (nextLevelStart - currentLevelStart)) * 100;
    } else {
      // Max level
      progressPercent = 100;
    }
    
    return {
      currentLevelData,
      nextLevelData,
      xpInCurrentLevel,
      xpNeededForNext,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      isMaxLevel: data.currentLevel >= LEVELS.length,
    };
  }

  // Award task completion XP
  async completeTask(hasDeadline = false, completedEarly = false) {
    const data = await this.loadXPData();
    
    // Check daily task XP limit
    const today = todayKey();
    
    // Initialize or reset daily counter
    if (!data.dailyTaskXP || data.dailyTaskXP.date !== today) {
      data.dailyTaskXP = {
        date: today,
        count: 0,
      };
    }
    
    // Check if already awarded XP for 4 tasks today
    if (data.dailyTaskXP.count >= XP_REWARDS.MAX_DAILY_TASK_XP) {
      // No XP awarded, but still update stats
      data.stats.tasksCompleted += 1;
      await this.saveXPData(data);
      
      return {
        newXP: data.totalXP,
        xpGained: 0,
        leveledUp: false,
        newLevel: data.currentLevel,
        message: 'Task completed! (Daily XP limit reached)',
      };
    }
    
    let xp = XP_REWARDS.TASK_COMPLETE; // Always 5 XP now
    let reason = 'Task completed! 🎯';
    
    // Increment daily task XP counter
    data.dailyTaskXP.count += 1;
    
    // Update streak
    const lastDate = data.streaks.lastCompletedDate;
    
    if (lastDate === today) {
      // Already completed today
    } else if (this.isYesterday(lastDate)) {
      // Continue streak
      data.streaks.current += 1;
      if (data.streaks.current > data.streaks.best) {
        data.streaks.best = data.streaks.current;
      }
      // Note: Removed streak bonus to keep XP at 5
    } else {
      // Streak broken, restart
      data.streaks.current = 1;
    }
    
    data.streaks.lastCompletedDate = today;
    data.stats.tasksCompleted += 1;
    
    await this.saveXPData(data);
    
    return await this.awardXP(xp, reason);
  }

  // Award event XP
  async createEvent(sharedWithCount = 0) {
    const data = await this.loadXPData();
    
    let xp = XP_REWARDS.EVENT_CREATE;
    let reason = 'Event created';
    
    if (sharedWithCount >= 3) {
      xp = XP_REWARDS.EVENT_WITH_MULTIPLE;
      reason = `Event with ${sharedWithCount} people! 🎉`;
    } else if (sharedWithCount > 0) {
      xp += XP_REWARDS.EVENT_SHARE;
      reason = 'Event created & shared';
    }
    
    data.stats.eventsCreated += 1;
    await this.saveXPData(data);
    
    return await this.awardXP(xp, reason);
  }

  // Award sharing XP
  async shareCalendar() {
    const data = await this.loadXPData();
    
    const isFirst = data.stats.calendarsShared === 0;
    const xp = isFirst ? XP_REWARDS.FIRST_CONNECTION : XP_REWARDS.SHARE_CALENDAR;
    const reason = isFirst ? 'First connection made! 🤝' : 'Calendar shared';
    
    data.stats.calendarsShared += 1;
    await this.saveXPData(data);
    
    return await this.awardXP(xp, reason);
  }

  // Check if date is yesterday
  isYesterday(dateString: string | null) {
    if (!dateString) return false;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = todayKey(yesterday);
    
    return dateString === yesterdayStr;
  }

  // Get all achievements
  getAchievements(data: XPData) {
    const achievements: Array<{ id: string; title: string; icon: string; unlocked: boolean }> = [];
    
    // Task achievements
    if (data.stats.tasksCompleted >= 1) {
      achievements.push({ id: 'first_task', title: 'First Steps', icon: '✓', unlocked: true });
    }
    if (data.stats.tasksCompleted >= 10) {
      achievements.push({ id: 'task_10', title: 'Getting Things Done', icon: '✅', unlocked: true });
    }
    if (data.stats.tasksCompleted >= 50) {
      achievements.push({ id: 'task_50', title: 'Productivity Master', icon: '🏆', unlocked: true });
    }
    
    // Event achievements
    if (data.stats.eventsCreated >= 1) {
      achievements.push({ id: 'first_event', title: 'Party Starter', icon: '🎈', unlocked: true });
    }
    if (data.stats.eventsCreated >= 10) {
      achievements.push({ id: 'event_10', title: 'Social Planner', icon: '📅', unlocked: true });
    }
    
    // Sharing achievements
    if (data.stats.calendarsShared >= 1) {
      achievements.push({ id: 'first_share', title: 'Connected', icon: '🤝', unlocked: true });
    }
    if (data.stats.calendarsShared >= 5) {
      achievements.push({ id: 'share_5', title: 'Social Circle', icon: '👥', unlocked: true });
    }
    
    // Streak achievements
    if (data.streaks.best >= 3) {
      achievements.push({ id: 'streak_3', title: '3 Day Streak', icon: '🔥', unlocked: true });
    }
    if (data.streaks.best >= 7) {
      achievements.push({ id: 'streak_7', title: 'Week Warrior', icon: '⚡', unlocked: true });
    }
    if (data.streaks.best >= 30) {
      achievements.push({ id: 'streak_30', title: 'Monthly Master', icon: '👑', unlocked: true });
    }
    
    return achievements;
  }


  // Accept an invite / share
  async acceptShare() {
    const data = await this.loadXPData();

    const isFirst = data.stats.calendarsShared === 0;
    const xp = XP_REWARDS.ACCEPT_SHARE;
    const reason = isFirst ? 'First connection made! 🤝' : 'Invite accepted';

    // We treat accept as a "connection moment" as well.
    if (isFirst) data.stats.calendarsShared = 1;

    await this.saveXPData(data);
    return await this.awardXP(xp, reason);
  }

  // Invite a new connection
  async inviteConnection() {
    return this.awardXP(XP_REWARDS.CONNECTION_INVITE, 'Sent a connection invite');
  }

  // Alias: screens call getXPData() but the original method is loadXPData()
  async getXPData() {
    return this.loadXPData();
  }

  // Alias: screens call getLevelInfo(totalXP) but the original is getCurrentLevelInfo(data)
  // Accepts either a number (totalXP) or a full data object.
  getLevelInfo(xpOrData: number | Pick<XPData, "totalXP" | "currentLevel">) {
    if (typeof xpOrData === 'number') {
      // Find level from raw XP value
      let currentLevel = 1;
      for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xpOrData >= LEVELS[i].xpRequired) {
          currentLevel = i + 1;
          break;
        }
      }
      const data: Pick<XPData, "totalXP" | "currentLevel"> = { totalXP: xpOrData, currentLevel };
      const info = this.getCurrentLevelInfo(data);
      return {
        level: currentLevel,
        title: info.currentLevelData?.title || '',
        icon: info.currentLevelData?.icon || '',
        progress: info.progressPercent / 100,
        ...info,
      };
    }
    // Full data object
    const info = this.getCurrentLevelInfo(xpOrData);
    return {
      level: xpOrData.currentLevel,
      title: info.currentLevelData?.title || '',
      icon: info.currentLevelData?.icon || '',
      progress: info.progressPercent / 100,
      ...info,
    };
  }

  // Subscribe to XP changes
  subscribe(listener: (data: XPData | null) => void) {
    return this._obs.subscribe(listener);
  }


  // Notify all listeners
  notifyListeners() {
    this._obs.notify(this.currentData);
  }
// Create default data
  createDefaultData() {
    return {
      totalXP: 0,
      currentLevel: 1,
      xpToNextLevel: LEVELS[1].xpRequired,
      achievements: [],
      streaks: {
        current: 0,
        best: 0,
        lastCompletedDate: null,
      },
      dailyTaskXP: {
        date: todayKey(),
        count: 0,
      },
      stats: {
        tasksCompleted: 0,
        eventsCreated: 0,
        eventsAttended: 0,
        calendarsShared: 0,
        daysActive: 1,
      },
      history: [],
    };
  }
}


// ─── Snapshot Integration (optional) ──────────────────────
// Mild unification: XP can derive weekly targets from the canonical RelationshipSnapshot.
// This does NOT change existing XP flows; it provides a single-source-of-truth hook.
export function getWeeklyTargetsFromSnapshot(snapshot) {
  const m = snapshot?.metrics01 || {};
  const e = snapshot?.events || {};
  const targets: Array<{ title: string; xp: number }> = [];

  if ((m.balance ?? 0.5) < 0.48) targets.push({ title: 'Plan one thoughtful date', xp: 30 });
  if ((m.responseSpeed ?? 0.7) < 0.6) targets.push({ title: 'Reply faster this week', xp: 15 });
  if ((m.friction ?? 0.2) > 0.35) targets.push({ title: 'Do one repair conversation', xp: 20 });
  if ((e.datesCount ?? 0) === 0) targets.push({ title: 'Schedule a shared plan', xp: 25 });

  return targets.slice(0, 4);
}

export default new XPService();