"use client";

import { useState, useEffect } from "react";
import { Shield, MapPin, MessageCircle, Clock, X } from "lucide-react";
import MapComponent from "@/components/MapComponent";
import SearchBar from "@/components/SearchBar";
import { Location, Route, SafeSpot, WalkSession } from "@/types";
import { googleMapsService } from "@/services/googleMaps";
import { elevenLabsService } from "@/services/elevenLabs";
import { SUPPORTED_CITIES } from "@/constants";
import {
  isSupportedLocation,
  isWithinTravelRadius,
  formatDuration,
  formatDistance,
} from "@/utils";

export default function Home() {
  // Core state
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [destination, setDestination] = useState<
    (Location & { address: string }) | null
  >(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>([]);
  const [walkSession, setWalkSession] = useState<WalkSession | null>(null);

  // UI state
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalkControls, setShowWalkControls] = useState(false);
  const [voiceCompanionEnabled, setVoiceCompanionEnabled] = useState(false);

  // Set Delhi as default location on app load
  useEffect(() => {
    const setDefaultLocation = () => {
      setIsLocationLoading(true);

      // Set Delhi as the default location
      const delhiLocation = SUPPORTED_CITIES.DELHI.center;
      setCurrentLocation(delhiLocation);
      setError(null);
      setIsLocationLoading(false);
    };

    setDefaultLocation();
  }, []);

  // Auto-dismiss error messages after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 3000); // 3 seconds

      return () => clearTimeout(timer);
    }
  }, [error]);

  // Find safe spots when location changes
  useEffect(() => {
    const findSafeSpots = async () => {
      if (!currentLocation) return;

      try {
        const spots = await googleMapsService.findNearbySafeSpots(
          currentLocation
        );
        setSafeSpots(spots);
      } catch (err) {
        console.error("Error finding safe spots:", err);
      }
    };

    findSafeSpots();
  }, [currentLocation]);

  // Handle destination selection
  const handleDestinationSelect = async (
    dest: Location & { address: string }
  ) => {
    if (!currentLocation) return;

    // Check if current location is supported
    if (!isSupportedLocation(currentLocation)) {
      setError(
        "Route calculation is only available in supported areas (Delhi and San Francisco)."
      );
      return;
    }

    // Check if within travel radius
    if (!isWithinTravelRadius(currentLocation, dest)) {
      setError("Destination is too far. Maximum distance is 10 miles.");
      return;
    }

    setDestination(dest);
    setIsRouteLoading(true);
    setError(null);

    try {
      const calculatedRoute = await googleMapsService.calculateSafeRoute(
        currentLocation,
        dest
      );
      if (calculatedRoute) {
        // Add safe spots to route
        const routeWithSafeSpots = {
          ...calculatedRoute,
          safeSpots: safeSpots.filter(
            (spot) => spot.distance <= 1000 // Only include spots within 1km of route
          ),
        };
        setRoute(routeWithSafeSpots);
        setShowWalkControls(true);
      }
    } catch (err) {
      setError("Unable to calculate route. Please try again.");
      console.error("Route calculation error:", err);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Start walking session
  const handleStartWalk = () => {
    if (!route || !currentLocation) return;

    const session: WalkSession = {
      id: Date.now().toString(),
      userId: "user", // In real app, this would be from auth
      route,
      startTime: new Date(),
      status: "active",
      checkInStatus: "pending",
      voiceCompanionEnabled,
    };

    setWalkSession(session);

    // Start voice companion if enabled
    if (voiceCompanionEnabled && elevenLabsService.isConfigured()) {
      const greeting = elevenLabsService.generateCompanionMessage("greeting", {
        userName: "there", // In real app, get from user profile
      });
      elevenLabsService.playVoiceMessage(greeting).catch(console.error);
    }
  };

  // Toggle voice companion
  const handleVoiceToggle = () => {
    setVoiceCompanionEnabled(!voiceCompanionEnabled);
  };

  // Get center location for map
  const getMapCenter = (): Location => {
    if (currentLocation) return currentLocation;
    return SUPPORTED_CITIES.DELHI.center; // Default to Delhi
  };

  // Loading screen
  if (isLocationLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#3D828B] border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-[#0C1E3C] mb-2">
            Finding your location...
          </h2>
          <p className="text-gray-600">
            Please allow location access to continue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-white overflow-hidden">
      {/* Header with search */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white shadow-lg">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-[#3D828B]" />
              <h1 className="text-xl font-bold text-[#0C1E3C]">
                Midnight Mile
              </h1>
            </div>
            <div className="text-xs text-gray-500">
              {currentLocation && <span>📍 Delhi (Default Location)</span>}
            </div>
          </div>

          <SearchBar
            onDestinationSelect={handleDestinationSelect}
            currentLocation={currentLocation || undefined}
            disabled={isRouteLoading}
          />

          {/* Error message with auto-dismiss */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-800 flex-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 p-1 hover:bg-red-100 rounded-full transition-colors flex-shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="h-3 w-3 text-red-600" />
                </button>
              </div>
            </div>
          )}

          {/* Route info */}
          {route && (
            <div className="mt-4 p-4 bg-[#F5EDE0] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-[#0C1E3C]">
                  Route to {destination?.address}
                </h3>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    route.safetyScore.overall >= 70
                      ? "bg-green-100 text-green-800"
                      : route.safetyScore.overall >= 50
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  Safety: {Math.round(route.safetyScore.overall)}%
                </div>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(route.estimatedTime)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{formatDistance(route.distance)}</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="absolute inset-0 pt-[240px] sm:pt-[220px]">
        <MapComponent
          center={getMapCenter()}
          route={route}
          safeSpots={safeSpots}
          currentLocation={currentLocation || undefined}
          className="w-full h-full"
        />
      </div>

      {/* Walk controls */}
      {showWalkControls && !walkSession && (
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleVoiceToggle}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                voiceCompanionEnabled
                  ? "bg-[#3D828B] text-white border-[#3D828B]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">Walk With Me</span>
            </button>
            <button
              onClick={handleStartWalk}
              className="px-6 py-3 bg-[#3D828B] text-white rounded-lg font-semibold hover:bg-[#2d6269] transition-colors"
            >
              Start Walk
            </button>
          </div>
          {voiceCompanionEnabled && (
            <p className="text-xs text-gray-600 text-center">
              AI companion will provide guidance and check-ins during your walk
            </p>
          )}
        </div>
      )}

      {/* Active walk session */}
      {walkSession && (
        <div className="absolute bottom-0 left-0 right-0 bg-[#0C1E3C] text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Walking in progress...</p>
              <p className="text-sm text-gray-300">
                Started at {walkSession.startTime.toLocaleTimeString()}
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Emergency
              </button>
              <button
                onClick={() => setWalkSession(null)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700"
              >
                End Walk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isRouteLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white p-6 rounded-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#3D828B] border-t-transparent mx-auto mb-3"></div>
            <p className="text-[#0C1E3C] font-medium">
              Calculating safe route...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
