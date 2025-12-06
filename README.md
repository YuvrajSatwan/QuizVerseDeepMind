# Quizzer 🧠

A modern, interactive quiz platform built with React, Firebase, and beautiful animations. Create, share, and play quizzes in real-time with a stunning user interface.

## ✨ Features

- **🎨 Beautiful UI/UX**: Modern design with smooth animations and glassmorphism effects
- **🚀 Real-time Updates**: Live quiz sessions with instant synchronization
- **📱 Responsive Design**: Works perfectly on all devices
- **🔐 Authentication**: Google Sign-In and guest mode support
- **⚡ Fast Performance**: Built with Vite and optimized React components
- **🎯 Multiple Question Types**: MCQ, True/False, and Short Answer questions
- **🏆 Live Leaderboard**: Real-time scoring and competition
- **⏱️ Timer System**: Configurable time limits per question
- **📊 Progress Tracking**: Visual progress indicators and analytics

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend**: Firebase (Firestore, Authentication)
- **Styling**: Tailwind CSS with custom design system
- **Routing**: React Router DOM

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Firebase account

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd quizzer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Authentication (Google Sign-In)
4. Enable Firestore Database
5. Get your Firebase config

### 4. Configure Firebase

Update `src/firebase/config.js` with your Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
}
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.jsx     # Navigation component
│   └── ToastContainer.jsx # Notification system
├── contexts/           # React contexts
│   ├── AuthContext.jsx # Authentication state
│   ├── QuizContext.jsx # Quiz state management
│   └── ToastContext.jsx # Toast notifications
├── pages/              # Page components
│   ├── Home.jsx       # Landing page
│   ├── CreateQuiz.jsx # Quiz creation form
│   ├── JoinQuiz.jsx   # Quiz joining interface
│   └── QuizRoom.jsx   # Live quiz interface
├── firebase/           # Firebase configuration
│   └── config.js      # Firebase setup
├── App.jsx            # Main app component
├── main.jsx           # App entry point
└── index.css          # Global styles and Tailwind
```

## 🎮 How to Use

### Creating a Quiz

1. Click "Create Quiz" on the homepage
2. Fill in quiz details (title, description, time limits)
3. Add questions with multiple choice, true/false, or short answer options
4. Set correct answers for scoring
5. Get a unique quiz code to share

### Joining a Quiz

1. Click "Join Quiz" on the homepage
2. Enter the 6-digit quiz code
3. Enter your name
4. Start playing when the host begins

### Playing the Quiz

- Answer questions within the time limit
- See live leaderboard updates
- View progress and results in real-time
- Compete with other players

## 🎨 Customization

### Colors and Themes

The app uses a custom design system with CSS variables. Update `tailwind.config.js` to modify:

- Primary colors
- Secondary colors
- Accent colors
- Shadows and borders

### Animations

Customize animations in `tailwind.config.js`:

```javascript
animation: {
  'fade-in': 'fadeIn 0.5s ease-in-out',
  'fade-in-up': 'fadeInUp 0.6s ease-out',
  'slide-in': 'slideIn 0.3s ease-out',
  // Add your custom animations
}
```

## 📱 Responsive Design

The app is fully responsive with breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Firebase Hosting

1. Build the project:
   ```bash
   npm run build
   ```

2. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

3. Initialize Firebase:
   ```bash
   firebase init hosting
   ```

4. Deploy:
   ```bash
   firebase deploy
   ```

### Other Platforms

The app can be deployed to any static hosting platform:
- Vercel
- Netlify
- GitHub Pages
- AWS S3

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Firebase](https://firebase.google.com/) - Backend services
- [Lucide](https://lucide.dev/) - Beautiful icons

## 📞 Support

If you have any questions or need help:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Create a new issue with detailed information
3. Contact the development team

---

**Happy Quizzing! 🎉**

