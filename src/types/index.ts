// Core types for Midnight Mile app

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface SafetyScore {
  overall: number; // 0-100 scale
  lighting: number;
  footTraffic: number;
  policePresence: number;
  crimeData: number;
}

export interface SafeSpot {
  id: string;
  name: string;
  type: "police" | "hospital" | "store";
  location: Location;
  isOpen24Hours: boolean;
  distance: number; // in meters
  contactInfo?: string;
  openHours?: string;
}

export interface Route {
  id: string;
  start: Location;
  end: Location;
  waypoints: Location[];
  safetyScore: SafetyScore;
  estimatedTime: number; // in minutes
  distance: number; // in meters
  dangerZones: DangerZone[];
  safeSpots: SafeSpot[];
}

export interface DangerZone {
  id: string;
  location: Location;
  radius: number; // in meters
  severity: "low" | "medium" | "high";
  reason: string;
  lastUpdated: Date;
}

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  trustedContacts: TrustedContact[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark";
  voiceEnabled: boolean;
  autoCheckIn: boolean;
  checkInTimeout: number; // in minutes
  emergencyContacts: string[]; // contact IDs
}

export interface WalkSession {
  id: string;
  userId: string;
  route: Route;
  startTime: Date;
  endTime?: Date;
  status: "active" | "completed" | "emergency";
  checkInStatus: "pending" | "confirmed" | "overdue";
  voiceCompanionEnabled: boolean;
}

export interface AICompanionMessage {
  id: string;
  type: "greeting" | "checkin" | "warning" | "encouragement" | "arrival";
  message: string;
  timestamp: Date;
  audioUrl?: string;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  sessionId: string;
  type: "no_response" | "panic_button" | "unusual_sound" | "route_deviation";
  location: Location;
  timestamp: Date;
  status: "active" | "resolved" | "false_alarm";
  notifiedContacts: string[];
}

// Google Maps related types
export interface MapConfig {
  center: Location;
  zoom: number;
  mapTypeId: google.maps.MapTypeId;
  restriction?: {
    latLngBounds: google.maps.LatLngBounds;
  };
}

// API Response types
export interface SafeRouteResponse {
  route: Route;
  alternatives: Route[];
  warnings: string[];
}

export interface NearbyPlacesResponse {
  places: SafeSpot[];
  total: number;
}

export interface VoiceMessage {
  text: string;
  audioUrl: string;
  duration: number;
}
