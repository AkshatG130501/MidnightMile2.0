// Utility functions for Midnight Mile app

import { Location, SafetyScore } from "@/types";
import {
  SUPPORTED_CITIES,
  MAX_TRAVEL_RADIUS_METERS,
  SAFETY_THRESHOLDS,
} from "@/constants";

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(point1: Location, point2: Location): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if a location is within supported cities
 */
export function isSupportedLocation(location: Location): boolean {
  return Object.values(SUPPORTED_CITIES).some((city) => {
    return (
      location.lat >= city.bounds.south &&
      location.lat <= city.bounds.north &&
      location.lng >= city.bounds.west &&
      location.lng <= city.bounds.east
    );
  });
}

/**
 * Check if distance is within maximum travel radius
 */
export function isWithinTravelRadius(start: Location, end: Location): boolean {
  const distance = calculateDistance(start, end);
  return distance <= MAX_TRAVEL_RADIUS_METERS;
}

/**
 * Get the nearest supported city
 */
export function getNearestCity(location: Location) {
  let nearestCity = null;
  let minDistance = Infinity;

  Object.entries(SUPPORTED_CITIES).forEach(([key, city]) => {
    const distance = calculateDistance(location, city.center);
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = { key, ...city };
    }
  });

  return nearestCity;
}

/**
 * Calculate overall safety score from individual components
 */
export function calculateOverallSafetyScore(
  lighting: number,
  footTraffic: number,
  policePresence: number,
  crimeData: number
): SafetyScore {
  // Weighted average (lighting and crime data are more important)
  const overall = Math.round(
    lighting * 0.3 + footTraffic * 0.2 + policePresence * 0.2 + crimeData * 0.3
  );

  return {
    overall: Math.max(0, Math.min(100, overall)),
    lighting: Math.max(0, Math.min(100, lighting)),
    footTraffic: Math.max(0, Math.min(100, footTraffic)),
    policePresence: Math.max(0, Math.min(100, policePresence)),
    crimeData: Math.max(0, Math.min(100, crimeData)),
  };
}

/**
 * Get safety level from score
 */
export function getSafetyLevel(score: number): "high" | "medium" | "low" {
  if (score >= SAFETY_THRESHOLDS.HIGH) return "high";
  if (score >= SAFETY_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}

/**
 * Get safety color based on score
 */
export function getSafetyColor(score: number): string {
  const level = getSafetyLevel(score);
  switch (level) {
    case "high":
      return "#10B981";
    case "medium":
      return "#F59E0B";
    case "low":
      return "#DC2626";
    default:
      return "#6B7280";
  }
}

/**
 * Format time duration in human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format distance in human readable format
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  const kilometers = meters / 1000;
  if (kilometers < 10) {
    return `${kilometers.toFixed(1)}km`;
  }
  return `${Math.round(kilometers)}km`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if user's current location has changed significantly
 */
export function hasLocationChanged(
  currentLocation: Location,
  lastLocation: Location,
  threshold: number = 10 // meters
): boolean {
  const distance = calculateDistance(currentLocation, lastLocation);
  return distance > threshold;
}

/**
 * Get current time in user's timezone
 */
export function getCurrentTime(): Date {
  return new Date();
}

/**
 * Check if current time is within night hours (for night mode default)
 */
export function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 19 || hour <= 6; // 7 PM to 6 AM
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculate ETA based on distance and walking speed
 */
export function calculateETA(
  distanceMeters: number,
  walkingSpeedKmh: number = 5
): number {
  const distanceKm = distanceMeters / 1000;
  const timeHours = distanceKm / walkingSpeedKmh;
  return timeHours * 60; // return in minutes
}

/**
 * Check if app is running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
}

/**
 * Get user's preferred language/locale
 */
export function getUserLocale(): string {
  if (typeof window !== "undefined") {
    return navigator.language || "en-US";
  }
  return "en-US";
}
