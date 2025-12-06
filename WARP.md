# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Frontend Development
- `npm run dev` - Start development server on port 3000 with auto-open
- `npm run build` - Build production bundle to `/dist`
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on JS/JSX files

### Firebase Functions Development
Navigate to functions directory first: `cd functions` or `cd quizzer-functions`
- `npm run build` - Compile TypeScript functions
- `npm run build:watch` - Watch mode for TypeScript compilation
- `npm run serve` - Start Firebase emulators for local functions testing
- `npm run shell` - Firebase functions shell for testing
- `npm run deploy` - Deploy functions to Firebase
- `npm run logs` - View Firebase functions logs

### Firebase Services
- `firebase login` - Authenticate with Firebase CLI
- `firebase deploy` - Deploy all services (hosting, functions, firestore)
- `firebase deploy --only hosting` - Deploy frontend only
- `firebase deploy --only functions` - Deploy functions only
- `firebase deploy --only firestore` - Deploy Firestore rules and indexes
- `firebase emulators:start` - Start all Firebase emulators locally

## Architecture Overview

Quizzer is a real-time quiz platform with React frontend and Firebase backend services.

### Core Architecture Pattern
- **React Context Pattern**: Three main contexts manage global state
  - `AuthContext` - Authentication state (Google OAuth + Guest mode)
  - `QuizContext` - Quiz operations and real-time state management
  - `ToastContext` - Global notification system
- **Route-based Pages**: Each major feature is a separate page component
- **Firebase Integration**: Real-time data synchronization using Firestore listeners

### State Management Strategy
- React contexts provide centralized state management
- Real-time updates through Firebase `onSnapshot` listeners
- Local state for UI interactions, context state for cross-component data
- Leaderboard calculations happen server-side and sync in real-time

### Data Flow Architecture
1. User actions trigger context methods (`createQuiz`, `joinQuiz`, etc.)
2. Context methods interact with Firebase services
3. Firestore listeners update local state automatically
4. Components re-render with new data
5. Real-time sync keeps all connected clients updated

## Firebase Configuration

### Project Structure
- **Primary Firebase Project**: `quizzer-54259`
- **Frontend**: React SPA deployed to Firebase Hosting
- **Backend**: Cloud Functions in `functions/` and `quizzer-functions/`
- **Database**: Firestore with real-time listeners

### Key Firebase Services Used
- **Firestore**: Quiz data, player data, leaderboards
- **Authentication**: Google Sign-In with guest mode fallback
- **Hosting**: Static site hosting with SPA routing
- **Cloud Functions**: Server-side logic (leaderboard calculations, etc.)

### Local Development Setup
Firebase config is in `src/firebase/config.js` with credentials already configured. For local development with emulators:
1. Enable Firestore test mode in Firebase Console
2. Use `firebase emulators:start` for local backend testing
3. Functions are in TypeScript and auto-compile

## Component Architecture

### Page Components (`src/pages/`)
- `Home.jsx` - Landing page with navigation options
- `CreateQuiz.jsx` - Quiz creation form with question builder
- `JoinQuiz.jsx` - Quiz joining interface with code entry
- `QuizRoom.jsx` - Live quiz gameplay with real-time features

### Context Providers (`src/contexts/`)
All contexts provide both state and actions, following the provider pattern with custom hooks (`useAuth`, `useQuiz`, `useToast`).

### Firebase Integration Pattern
The app uses a retry wrapper (`withRetry`) for Firebase operations to handle network issues and provides enhanced error handling for common Firebase connection problems.

## Styling System

### Tailwind CSS Configuration
- **Custom Color Palette**: Primary (blue), Secondary (purple), Accent (pink)
- **Design System**: Glassmorphism effects with custom shadows and blur
- **Animation System**: Custom keyframe animations for smooth UX
- **Responsive Breakpoints**: Mobile-first design with tablet/desktop variants

### Animation Strategy
- Framer Motion for complex animations
- Custom CSS animations defined in `tailwind.config.js`
- Smooth transitions between quiz states and loading states

## Development Guidelines

### Firebase Operations
- Always use the `withRetry` wrapper for Firestore operations
- Handle offline scenarios gracefully
- Use `serverTimestamp()` for consistent timestamps across clients

### State Management
- Use contexts for cross-component state
- Keep component state local when possible
- Implement proper loading and error states

### Real-time Features
- Quiz state updates propagate automatically via Firestore listeners
- Leaderboard calculations happen in real-time
- Player actions sync immediately across all connected clients

### Component Patterns
- Custom hooks for context consumption (`useAuth`, `useQuiz`, `useToast`)
- Consistent error handling across all Firebase operations
- Toast notifications for user feedback

## Common Development Tasks

### Adding New Quiz Features
1. Add data structure to Firestore collections
2. Update `QuizContext` with new methods
3. Implement UI in relevant page components
4. Add real-time listeners if needed

### Modifying Authentication
- Authentication logic centralized in `AuthContext`
- Supports both Google OAuth and guest mode
- Guest users have temporary local authentication state

### Deployment Process
1. Build frontend: `npm run build`
2. Deploy all services: `firebase deploy`
3. Alternatively use targeted deploys with `--only` flag

### Testing Firebase Connection
Use the diagnostic page available at `/diagnostic` or call `testFirebaseConnection()` from `src/firebase/config.js`.