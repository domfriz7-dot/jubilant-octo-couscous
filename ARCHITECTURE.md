# CalendarShare Architecture

## Overview

CalendarShare is built with React Native using Expo, providing a cross-platform solution for iOS and Android with a single codebase.

## Technology Stack

### Core Technologies
- **React Native 0.81**: JavaScript framework for native apps
- **Expo 54**: Development platform and tooling
- **React Navigation 7**: Navigation system
- **AsyncStorage**: Local backup + lightweight storage
- **expo-sqlite**: Primary storage for calendar events (indexed by date) data persistence

### UI Components
- **react-native-calendars**: Calendar picker component
- **expo-linear-gradient**: Gradient backgrounds
- **React Native built-in components**: View, Text, TouchableOpacity, etc.

## Architecture Pattern

### Component-Based Architecture
```
App.js (Navigation Container)
  ├── TabNavigator
  │   ├── HomeScreen (Calendar Tab)
  │   ├── SharedScreen (Shared Tab)
  │   └── ProfileScreen (Profile Tab)
  └── Modal Screens
      ├── AddEventScreen
      └── EventDetailsScreen
```

### Data Flow
```
User Action → Screen Component → CalendarService → AsyncStorage
                     ↓                    ↓
              State Update ← Notification ← Data Change
```

## Core Components

### 1. Navigation System

**Stack Navigator** (Main)
- Handles modal presentations
- Manages screen transitions
- Provides navigation prop to all screens

**Tab Navigator** (Bottom Tabs)
- Calendar view (Home)
- Shared calendars (Shared)
- User profile (Profile)

### 2. Data Service Layer

**CalendarService.js**
- Singleton pattern for global state
- Handles CRUD operations for events
- Manages local storage with AsyncStorage
- Implements observer pattern for real-time updates
- Provides mock user data

Key Methods:
```javascript
getEvents()           // Fetch all events
addEvent(event)       // Create new event
updateEvent(id, data) // Update existing event
deleteEvent(id)       // Remove event
getEventsForDate(date)// Get events for specific date
subscribe(callback)   // Listen for changes
```

### 3. Screens

#### HomeScreen
- **Purpose**: Main calendar view
- **Features**:
  - Interactive calendar with marked dates
  - Color-coded event dots
  - Daily event list
  - Floating action button for new events
- **State Management**:
  - selectedDate (currently viewing date)
  - events (all events)
  - markedDates (calendar markers)

#### AddEventScreen
- **Purpose**: Create new events
- **Features**:
  - Form inputs (title, time, description)
  - Color picker (8 colors)
  - Multi-select user sharing
  - Date display
- **Validation**:
  - Required: title, time
  - Optional: description, sharing

#### EventDetailsScreen
- **Purpose**: View event information
- **Features**:
  - Complete event details
  - Creator information
  - Shared users list
  - Delete functionality
- **Actions**:
  - Delete event (with confirmation)
  - Navigate back

#### SharedScreen
- **Purpose**: View shared calendars
- **Features**:
  - Group events by user
  - Show upcoming events per user
  - Event counts
  - Quick event access
- **Data Structure**:
  ```javascript
  {
    userId: [event1, event2, event3]
  }
  ```

#### ProfileScreen
- **Purpose**: User settings and info
- **Features**:
  - User profile display
  - Connected people list
  - App information
  - Data management (clear all)
- **Mock Data**: Currently shows static user list

## Data Models

### Event Object
```javascript
{
  id: string,           // Unique identifier
  title: string,        // Event title
  date: string,         // ISO date (YYYY-MM-DD)
  time: string,         // Time string (e.g., "09:00")
  description: string,  // Optional description
  color: string,        // Hex color
  createdBy: string,    // User ID of creator
  sharedWith: string[], // Array of user IDs
  createdAt: string,    // ISO timestamp
}
```

### User Object
```javascript
{
  id: string,       // Unique identifier
  name: string,     // Display name
  email: string,    // Email address
  color: string,    // User's color theme
}
```

## State Management

### Local Component State
Each screen manages its own state using React hooks:
- `useState` for local data
- `useEffect` for side effects and subscriptions

### Global State (via CalendarService)
- Events stored in AsyncStorage
- Observer pattern for reactive updates
- All screens subscribe to changes

### Update Flow
```
User Action
  → CalendarService.addEvent()
    → AsyncStorage.setItem()
      → CalendarService.notifyListeners()
        → All subscribed components re-render
```

## Storage Strategy

### AsyncStorage Structure
```javascript
'calendar_events': JSON.stringify([event1, event2, ...])
```

### Advantages
- Simple implementation
- Persistent across app restarts
- No backend required for demo

### Limitations
- Not synced across devices
- Limited storage capacity
- No real-time collaboration

## Navigation Flow

```
Main Stack
  └── Tab Navigator
      ├── Calendar Tab
      │   └── [Event Details Modal]
      ├── Shared Tab
      │   └── [Event Details Modal]
      └── Profile Tab

Modal Stack
  ├── Add Event (from any tab)
  └── Event Details (from Calendar/Shared)
```

### Navigation Parameters
- **AddEvent**: `{ selectedDate }`
- **EventDetails**: `{ event }`

## Styling System

### Design Tokens
```javascript
Colors:
  Primary: #4F46E5 (Indigo)
  Secondary: #7C3AED (Purple)
  Success: #10B981 (Green)
  Warning: #F59E0B (Amber)
  Danger: #EF4444 (Red)
  
Gradients:
  Primary: ['#4F46E5', '#7C3AED']

Typography:
  Title: 32px, weight 800
  Heading: 20px, weight 700
  Body: 16px, weight 400
  Caption: 14px, weight 500

Spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
```

### Component Patterns
- Card-based layouts
- Consistent padding (16-20px)
- Shadow/elevation for depth
- Gradient headers
- Rounded corners (8-16px)

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Components render only visible events
2. **Memoization**: Could add React.memo for event cards
3. **Efficient Re-renders**: Subscription pattern limits updates
4. **Local Storage**: Async operations don't block UI

### Current Limitations
- No pagination for large event lists
- Calendar renders all months (not virtualized)
- No image optimization (no images yet)

## Security Considerations

### Current Implementation (Demo)
- No authentication
- All users share same device
- No encryption
- Mock user data

### Production Requirements
- User authentication (Firebase Auth, Auth0)
- API key management
- Encrypted storage for sensitive data
- HTTPS API calls
- Input sanitization
- Rate limiting

## Scalability Path

### Phase 1: Local App (Current)
- Local storage
- Mock users
- Single device

### Phase 2: Backend Integration
- REST/GraphQL API
- User authentication
- Cloud database
- Push notifications

### Phase 3: Real-time Sync
- WebSocket connections
- Optimistic updates
- Conflict resolution
- Offline support

### Phase 4: Advanced Features
- Recurring events
- Calendar import/export
- Video calls integration
- AI scheduling assistant

## Testing Strategy

### Unit Tests (Recommended)
- CalendarService methods
- Date formatting utilities
- Event validation logic

### Integration Tests
- Navigation flows
- Event CRUD operations
- Storage persistence

### E2E Tests
- Create and share event
- View shared calendar
- Delete event

### Tools
- Jest (React Native default)
- React Native Testing Library
- Detox (E2E)

## Deployment

### Development
```bash
expo start
```

### Production Builds
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

### Distribution
- iOS: TestFlight → App Store
- Android: Internal Testing → Google Play

## Future Enhancements

### Short-term
- [ ] Event editing
- [ ] Event search
- [ ] Calendar week view
- [ ] Event categories

### Medium-term
- [ ] Backend API
- [ ] User authentication
- [ ] Push notifications
- [ ] Event reminders

### Long-term
- [ ] Calendar sync (Google, Apple)
- [ ] Video conferencing
- [ ] Team features
- [ ] AI scheduling

## Dependencies Management

### Critical Dependencies
- React Native: Core framework
- Expo: Development platform
- React Navigation: Navigation
- AsyncStorage: Storage

### Update Strategy
1. Check for breaking changes
2. Test in development
3. Update lockfile
4. Test on both platforms
5. Deploy

---

This architecture provides a solid foundation for a calendar sharing app while remaining simple enough for easy understanding and modification.
