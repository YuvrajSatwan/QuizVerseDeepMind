# 🚀 Quizzer Full-Stack Deployment Guide

## Complete Backend + Frontend Live Deployment

### Prerequisites
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Install dependencies: `npm install`

### Step 1: Firebase Project Setup
```bash
# Login to Firebase
firebase login

# Initialize Firebase project (if not already done)
firebase init

# Select:
# - Firestore: Configure security rules and indexes
# - Functions: Configure Cloud Functions
# - Hosting: Configure files for Firebase Hosting
```

### Step 2: Deploy Backend Services
```bash
# Install function dependencies
cd functions
npm install
cd ..

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Cloud Functions
firebase deploy --only functions
```

### Step 3: Build and Deploy Frontend
```bash
# Build the React app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Step 4: Deploy Everything Together
```bash
# Deploy all services at once
firebase deploy
```

## Alternative Deployment Options

### Option 1: Netlify + Firebase Backend
```bash
# Build frontend
npm run build

# Deploy backend to Firebase
firebase deploy --only firestore,functions

# Deploy frontend to Netlify (drag dist folder to netlify.com)
```

### Option 2: Vercel + Firebase Backend
```bash
# Deploy backend
firebase deploy --only firestore,functions

# Deploy frontend
npx vercel --prod
```

## Production Configuration

### Environment Variables (if needed)
Create `.env.production`:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

### Custom Domain Setup
1. In Firebase Console → Hosting
2. Add custom domain
3. Follow DNS configuration steps

## Backend Services Included

### 🔥 Firebase Services
- **Firestore Database**: Real-time quiz data
- **Authentication**: Google OAuth + Guest mode
- **Cloud Functions**: Server-side logic
- **Hosting**: Static file serving

### ⚡ Cloud Functions
- `calculateLeaderboard`: Auto-updates leaderboards
- `onQuizStatusChange`: Handles quiz state changes
- `getQuizStats`: API for quiz statistics
- `cleanupOldQuizzes`: Automatic cleanup

### 🔒 Security Rules
- Production-ready Firestore security rules
- Proper authentication checks
- Player data protection

## Live URLs After Deployment

### Firebase Hosting
- **Frontend**: `https://your-project-id.web.app`
- **Custom Domain**: `https://your-domain.com`

### API Endpoints
- **Quiz Stats**: `https://us-central1-your-project-id.cloudfunctions.net/getQuizStats`

## Monitoring & Analytics
- Firebase Console for real-time monitoring
- Cloud Functions logs
- Hosting analytics
- Performance monitoring

## Cost Estimation
- **Free Tier**: Up to 50,000 reads/writes per day
- **Paid**: Pay-as-you-go pricing
- **Functions**: 2 million invocations free per month

Your Quizzer will be fully live with:
✅ Real-time backend services
✅ Scalable cloud infrastructure  
✅ Global CDN distribution
✅ Automatic SSL certificates
✅ Production monitoring
