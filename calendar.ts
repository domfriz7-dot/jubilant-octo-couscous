// ============================================
// AI DATE PLANNER TYPES
// ============================================

export type DateMood = 'romantic' | 'fun' | 'adventurous' | 'relaxing' | 'surprise';

export interface DatePlanRequest {
  date: string; // e.g., "This Friday evening", "Tomorrow", "Next Saturday"
  budget: number; // In dollars
  mood: DateMood; // Primary mood (backwards compat)
  moods?: DateMood[]; // Multiple moods (preferred)
  radiusKm: number; // Max distance from current location in km (e.g., 5, 10, 25, 50)
  location: {
    city: string;
    state?: string;
    country?: string;
    lat: number;
    lng: number;
  };
  preferences?: {
    dietaryRestrictions?: string[];
    favoriteCuisines?: string[];
    avoidActivities?: string[];
    otherNotes?: string;
  };
  partnerPreferences?: {
    name: string;
    likes?: string[];
    dislikes?: string[];
  };
}

export interface DateActivity {
  time: string; // e.g., "6:30 PM"
  title: string;
  description: string;
  location: {
    name: string;
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
  };
  cost: number;
  duration: number; // minutes
  category: 'food' | 'activity' | 'entertainment' | 'relaxation';
  bookingInfo?: {
    phone?: string;
    website?: string;
    reservationLink?: string;
    requiresBooking: boolean;
  };
  travelTimeFromPrevious?: number; // minutes
  distanceFromPrevious?: number; // meters
}

export interface DatePlan {
  id: string;
  title: string;
  description: string;
  activities: DateActivity[];
  totalCost: number;
  totalDuration: number; // minutes
  mood: DateMood;
  createdAt: Date;
  accepted?: boolean;
  feedback?: {
    rating?: number;
    liked: boolean;
    comments?: string;
  };
}

export interface AIDatePlannerConfig {
  anthropicApiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
