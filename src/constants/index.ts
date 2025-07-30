// Constants for Midnight Mile app

// Geographic restrictions - app only works in Delhi and San Francisco
export const SUPPORTED_CITIES = {
  DELHI: {
    name: "Delhi",
    center: { lat: 28.6139, lng: 77.209 },
    bounds: {
      north: 28.8836,
      south: 28.4044,
      east: 77.3462,
      west: 77.072,
    },
  },
  SAN_FRANCISCO: {
    name: "San Francisco",
    center: { lat: 37.7749, lng: -122.4194 },
    bounds: {
      north: 37.8099,
      south: 37.7099,
      east: -122.3549,
      west: -122.5149,
    },
  },
} as const;

// Fixed starting location - Samvidhan Sadan
export const FIXED_STARTING_LOCATION = {
  lat: 28.6215,
  lng: 77.2095,
  address:
    "Samvidhan Sadan, J685+V7V, Sansad Marg, Gokul Nagar, Janpath, Connaught Place, New Delhi, Delhi 110001",
};

// Maximum travel radius in miles
export const MAX_TRAVEL_RADIUS_MILES = 10;
export const MAX_TRAVEL_RADIUS_METERS = MAX_TRAVEL_RADIUS_MILES * 1609.34;

// Brand colors
export const COLORS = {
  // Primary
  NAVY: "#0C1E3C",
  WHITE: "#FFFFFF",

  // Secondary
  SLATE: "#4A5568",
  BEIGE: "#F5EDE0",
  TEAL: "#3D828B",

  // Alerts
  AMBER: "#FFB100",
  CORAL: "#E37B7B",
  DANGER: "#DC2626",
  SUCCESS: "#10B981",

  // Safety indicators
  SAFE_GREEN: "#10B981",
  MODERATE_YELLOW: "#F59E0B",
  DANGER_RED: "#DC2626",
} as const;

// Safety scoring thresholds
export const SAFETY_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 40,
  LOW: 0,
} as const;

// Safety colors for route visualization
export const SAFETY_COLORS = {
  HIGH: "#10B981", // Green for 80%+ safety
  MEDIUM: "#F59E0B", // Yellow/Amber for 40-80% safety
  LOW: "#EF4444", // Red for <40% safety
} as const;

// Map configuration
export const MAP_CONFIG = {
  DEFAULT_ZOOM: 15,
  MIN_ZOOM: 10,
  MAX_ZOOM: 20,
  DEFAULT_MAP_TYPE: "roadmap" as google.maps.MapTypeId,
  NIGHT_MODE_STYLES: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ],
} as const;

// Safe spot types and their markers
export const SAFE_SPOT_TYPES = {
  POLICE: {
    type: "police",
    icon: "🚔",
    color: COLORS.TEAL,
    priority: 1,
  },
  HOSPITAL: {
    type: "hospital",
    icon: "🏥",
    color: COLORS.CORAL,
    priority: 2,
  },
  STORE: {
    type: "store",
    icon: "🏪",
    color: COLORS.AMBER,
    priority: 3,
  },
} as const;

// Check-in settings
export const CHECK_IN = {
  DEFAULT_TIMEOUT_MINUTES: 10,
  REMINDER_INTERVALS: [5, 3, 1], // minutes before timeout
  MAX_RETRIES: 3,
} as const;

// Voice companion settings
export const VOICE_COMPANION = {
  CHECKIN_INTERVALS: [300, 600, 900], // seconds (5, 10, 15 minutes)
  VOICE_SPEED: 1.0,
  VOICE_PITCH: 1.0,
  DEFAULT_VOICE_ID: "x3gYeuNB0kLLYxOZsaSh", // Eleven Labs voice ID
  BACKGROUND_MONITORING: true,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  GOOGLE_PLACES: "https://maps.googleapis.com/maps/api/place",
  GOOGLE_DIRECTIONS: "https://maps.googleapis.com/maps/api/directions",
  ELEVEN_LABS: "https://api.elevenlabs.io/v1",
} as const;

// Place types for safe spots
export const GOOGLE_PLACE_TYPES = {
  POLICE: "police",
  HOSPITAL: "hospital",
  STORE_24H: "convenience_store",
} as const;

// Emergency contact limits
export const CONTACT_LIMITS = {
  MAX_TRUSTED_CONTACTS: 5,
  MIN_EMERGENCY_CONTACTS: 1,
  MAX_EMERGENCY_CONTACTS: 3,
} as const;
