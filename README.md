# 🌙 Midnight Mile - Personal Safety App

**Tagline:** "Security in every step."

A modern, AI-powered personal safety app with a beautiful landing page and Supabase authentication. Built with Next.js, designed to provide secure navigation and peace of mind during nighttime walks.

![Midnight Mile](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38BDF8?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Auth-green?style=for-the-badge&logo=supabase)

## ✨ Features

### � Modern Landing Page
- **Stunning gradient design** with purple/pink theme
- **Hero section** with compelling copy and call-to-action
- **Feature showcase** with interactive cards and icons
- **User testimonials** with real avatars and ratings
- **Statistics section** with animated counters
- **Responsive design** for all devices

### 🔐 Authentication System
- **Supabase OAuth** integration with GitHub and Google
- **Email/password** authentication with validation
- **Protected routes** and user session management
- **User profile dropdown** with settings and sign-out
- **Beautiful auth modal** with modern design

### 🗺️ Core Safety Features

- **Map-First Interface**: Full-screen map with night mode optimized for visibility
- **Safe Route Calculation**: Routes prioritized for safety over speed
- **Nearby Safe Spots**: Real-time locations of police stations, hospitals, and 24/7 stores
- **AI Voice Companion**: Realistic male companion using Eleven Labs for voice synthesis
- **Auto Check-In**: Automatic arrival detection with emergency contact notifications
- **Geographic Restrictions**: Currently supports Delhi and San Francisco (10-mile radius)

### Safety Scoring System

Routes are evaluated based on:

- Lighting levels
- Foot traffic density
- Police presence
- Crime data overlays

### Walk With Me AI Companion

- Natural, conversational male voice companion
- Situational awareness and location-based updates
- Background audio monitoring for threat detection
- Emergency contact alerts on unresponsiveness

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Google Maps API Key
- Eleven Labs API Key (optional, for voice features)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Setup environment variables:**

```bash
cp .env.example .env.local
```

3. **Configure API keys in `.env.local`:**

```bash
# Required: Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Optional: Eleven Labs API Key (for AI voice companion)
ELEVEN_LABS_API_KEY=your_eleven_labs_api_key_here
```

4. **Run the development server:**

```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000) to view the app**

### API Key Setup

#### Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API
   - Directions API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the key to your domain for production

#### Eleven Labs API Key (Optional)

1. Sign up at [Eleven Labs](https://elevenlabs.io/)
2. Get your API key from the dashboard
3. Add to `.env.local`

## 🗂️ Project Structure

```
src/
├── app/                  # Next.js app router
│   ├── globals.css      # Global styles with brand colors
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Main application page
├── components/          # React components
│   ├── MapComponent.tsx # Google Maps integration
│   └── SearchBar.tsx    # Destination search
├── services/           # External service integrations
│   ├── googleMaps.ts   # Google Maps API service
│   └── elevenLabs.ts   # Eleven Labs voice service
├── types/              # TypeScript type definitions
│   └── index.ts        # Core types for the app
├── constants/          # App constants and configuration
│   └── index.ts        # Brand colors, settings, etc.
└── utils/              # Utility functions
    └── index.ts        # Helper functions
```

## 🎨 Brand Guidelines

### Colors

- **Background**: Pure White (#FFFFFF)
- **Primary**: Deep Navy (#0C1E3C)
- **Secondary**: Slate Gray (#4A5568)
- **Accents**: Warm Beige (#F5EDE0), Muted Teal (#3D828B)
- **Alerts**: Safety Amber (#FFB100), Soft Coral (#E37B7B)

### Typography

- **Headlines**: Inter (modern, clean)
- **Body**: Inter (readable, accessible)

## 🔧 Configuration

### Supported Cities

Currently operational in:

- **Delhi, India**
- **San Francisco, California**

### Safety Settings

- Maximum travel radius: 10 miles
- Auto check-in timeout: 10 minutes
- Voice companion check-in intervals: 5, 10, 15 minutes

## 🛠️ Development

### Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Google Maps JavaScript API
- **Voice**: Eleven Labs API
- **Icons**: Lucide React

## 🚀 Deployment

### Environment Variables for Production

Ensure these are set in your deployment environment:

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `ELEVEN_LABS_API_KEY`
- `NEXT_PUBLIC_APP_URL`

### Recommended Platforms

- Vercel (optimized for Next.js)
- Netlify
- Railway
- AWS Amplify

## 🔒 Security Considerations

### Privacy

- Location data is not stored permanently
- API keys should be properly restricted
- User consent required for location access

### Safety Features

- Emergency contact system
- Real-time location sharing
- Background audio monitoring (with permissions)

## 📱 Mobile Optimization

The app is designed mobile-first with:

- Touch-friendly interface
- Responsive design
- GPS integration
- Background location tracking
- Optimized for iOS and Android browsers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For technical issues or feature requests:

- Create an issue in the repository
- Ensure you have the latest version
- Include steps to reproduce any bugs

## 📄 License

This project is for demonstration purposes. Please ensure compliance with all applicable laws and regulations when implementing safety features.

---

**Note**: This app requires location permissions and internet connectivity to function properly. Always inform users about data usage and privacy policies.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
