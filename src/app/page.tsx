"use client";

import { useState, useEffect } from "react";
import { MapPin, MessageCircle, Clock, X } from "lucide-react";
import MapComponent from "@/components/MapComponent";
import SearchBar from "@/components/SearchBar";
import { Location, Route, SafeSpot, WalkSession } from "@/types";
import { googleMapsService } from "@/services/googleMaps";
import { elevenLabsService } from "@/services/elevenLabs";
import { SUPPORTED_CITIES, FIXED_STARTING_LOCATION } from "@/constants";
import { isWithinTravelRadius, formatDuration, formatDistance } from "@/utils";

export default function Home() {
  // Core state
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [destination, setDestination] = useState<
    (Location & { address: string }) | null
  >(null);
  const [routes, setRoutes] = useState<Route[] | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [safeSpots, setSafeSpots] = useState<SafeSpot[]>([]);
  const [walkSession, setWalkSession] = useState<WalkSession | null>(null);

  // UI state
  const [isLocationLoading, setIsLocationLoading] = useState(true);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWalkControls, setShowWalkControls] = useState(false);
  const [voiceCompanionEnabled, setVoiceCompanionEnabled] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // Set fixed starting location (Samvidhan Sadan) on app load
  useEffect(() => {
    const setDefaultLocation = () => {
      setIsLocationLoading(true);

      // Set fixed starting location - Samvidhan Sadan
      setCurrentLocation(FIXED_STARTING_LOCATION);
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

  // Find safe spots when location changes (based on fixed starting location)
  useEffect(() => {
    const findSafeSpots = async () => {
      // Always use fixed starting location for safe spots
      const baseLocation = FIXED_STARTING_LOCATION;

      try {
        // Add a small delay to ensure Google Maps API is fully loaded
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const spots = await googleMapsService.findNearbySafeSpots(baseLocation);
        setSafeSpots(spots);
      } catch (err) {
        console.error("Error finding safe spots:", err);
        // Don't show error to user for safe spots failure, just log it
      }
    };

    findSafeSpots();
  }, []); // Only run once since starting location is fixed

  // Handle destination selection with automatic route preview
  const handleDestinationSelect = async (
    dest: Location & { address: string }
  ) => {
    if (!currentLocation) return;

    // Check if destination is within Delhi bounds
    const isDestinationInDelhi =
      dest.lat >= SUPPORTED_CITIES.DELHI.bounds.south &&
      dest.lat <= SUPPORTED_CITIES.DELHI.bounds.north &&
      dest.lng >= SUPPORTED_CITIES.DELHI.bounds.west &&
      dest.lng <= SUPPORTED_CITIES.DELHI.bounds.east;

    if (!isDestinationInDelhi) {
      setError(
        "Destination must be within Delhi. Please select a location in Delhi."
      );
      return;
    }

    // Check if within travel radius from fixed starting location
    if (!isWithinTravelRadius(FIXED_STARTING_LOCATION, dest)) {
      setError(
        "Destination is too far from starting location. Maximum distance is 10 miles."
      );
      return;
    }

    setDestination(dest);
    setIsRouteLoading(true);
    setError(null);

    try {
      // Calculate multiple route alternatives from fixed starting location to destination
      const routeAlternatives =
        await googleMapsService.calculateRouteAlternatives(
          FIXED_STARTING_LOCATION,
          dest
        );

      if (routeAlternatives && routeAlternatives.length > 0) {
        // Add safe spots to each route (filter spots within 1km of route)
        const routesWithSafeSpots = routeAlternatives.map((route) => ({
          ...route,
          safeSpots: safeSpots.filter((spot) => spot.distance <= 1000),
        }));

        // Sort routes by safety score (safest first)
        const sortedRoutes = routesWithSafeSpots.sort(
          (a, b) => b.safetyScore.overall - a.safetyScore.overall
        );

        setRoutes(sortedRoutes);
        setSelectedRoute(sortedRoutes[0]); // Auto-select the safest route
        setShowWalkControls(true);
      }
    } catch (err) {
      setError("Unable to calculate route. Please try again.");
      console.error("Route calculation error:", err);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Handle route selection from drawer
  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);

    // Automatically start navigation when route is selected
    if (currentLocation) {
      setSimulationProgress(0); // Reset progress

      const session: WalkSession = {
        id: Date.now().toString(),
        userId: "user", // In real app, this would be from auth
        route: route,
        startTime: new Date(),
        status: "active",
        checkInStatus: "pending",
        voiceCompanionEnabled,
      };

      setWalkSession(session);

      // Start voice companion if enabled
      if (voiceCompanionEnabled && elevenLabsService.isConfigured()) {
        const greeting = elevenLabsService.generateCompanionMessage(
          "greeting",
          {
            userName: "there", // In real app, get from user profile
          }
        );
        elevenLabsService.playVoiceMessage(greeting).catch(console.error);
      }
    }
  };

  // Start walking session
  const handleStartWalk = () => {
    if (!selectedRoute || !currentLocation) return;

    const session: WalkSession = {
      id: Date.now().toString(),
      userId: "user", // In real app, this would be from auth
      route: selectedRoute,
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

  // Get dynamic navigation instruction based on progress
  const getNavigationInstruction = (progress: number) => {
    if (progress < 25) {
      return {
        action: "Continue straight",
        street: "Head north on Sansad Marg",
        distance: "200m",
      };
    } else if (progress < 50) {
      return {
        action: "Turn right",
        street: "onto Rajpath",
        distance: "150m",
      };
    } else if (progress < 75) {
      return {
        action: "Continue straight",
        street: "Walk towards destination",
        distance: "100m",
      };
    } else if (progress < 100) {
      return {
        action: "You're almost there",
        street: "Destination ahead",
        distance: "50m",
      };
    } else {
      return {
        action: "You have arrived",
        street: "at your destination",
        distance: "0m",
      };
    }
  };

  const currentInstruction = getNavigationInstruction(simulationProgress);

  // Get center location for map
  const getMapCenter = (): Location => {
    if (currentLocation) return currentLocation;
    return FIXED_STARTING_LOCATION; // Default to Samvidhan Sadan
  };

  // Loading screen
  if (isLocationLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#3D828B] border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-[#0C1E3C] mb-2">
            Setting up your location...
          </h2>
          <p className="text-gray-600">
            Initializing Samvidhan Sadan as your starting point
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-white overflow-hidden">
      {/* Map - Full screen like Google Maps */}
      <div className="absolute inset-0">
        <MapComponent
          center={getMapCenter()}
          routes={routes}
          selectedRoute={selectedRoute}
          safeSpots={safeSpots}
          currentLocation={currentLocation || undefined}
          className="w-full h-full"
          onRouteSelect={handleRouteSelect}
          walkSession={walkSession}
          onSimulationProgress={setSimulationProgress}
        />
      </div>

      {/* Floating search bar - Enhanced styling */}
      <div className="absolute top-6 left-6 right-6 z-10">
        <SearchBar
          onDestinationSelect={handleDestinationSelect}
          currentLocation={FIXED_STARTING_LOCATION}
          disabled={isRouteLoading}
          placeholder="Search for destinations in Delhi..."
        />
      </div>

      {/* Error message - floating with better positioning and auto-dismiss */}
      {error && (
        <div className="absolute top-20 left-6 right-6 z-50">
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 fade-in-0 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1">
                <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                </div>
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-2 p-1 hover:bg-red-100 rounded-full transition-colors flex-shrink-0"
                aria-label="Dismiss error"
              >
                <X className="h-3 w-3 text-red-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active walk session - Google Maps navigation style */}
      {/* Navigation Interface - Active Walking Session */}
      {walkSession && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Navigation Header */}
            <div className="bg-blue-600 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-semibold text-white text-sm">
                      Navigation Active
                    </p>
                    <p className="text-blue-100 text-xs">
                      {walkSession.route.id.includes("safest")
                        ? "Safest Route"
                        : "Fastest Route"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-medium">
                    {formatDuration(walkSession.route.estimatedTime)}
                  </p>
                  <p className="text-blue-100 text-xs">
                    {formatDistance(walkSession.route.distance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Instructions */}
            <div className="p-4 bg-gray-50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {currentInstruction.action}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {currentInstruction.street}
                  </p>
                </div>
                <p className="text-gray-500 text-xs">
                  {currentInstruction.distance}
                </p>
              </div>

              {/* Safety Status */}
              <div className="flex items-center space-x-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      walkSession.route.safetyScore.overall >= 70
                        ? "#10B981"
                        : walkSession.route.safetyScore.overall >= 40
                        ? "#F59E0B"
                        : "#EF4444",
                  }}
                ></div>
                <span className="text-xs text-gray-600">
                  Current area:{" "}
                  {walkSession.route.safetyScore.overall >= 70
                    ? "Safe"
                    : walkSession.route.safetyScore.overall >= 40
                    ? "Moderate"
                    : "Caution needed"}
                  ({Math.round(walkSession.route.safetyScore.overall)}% safety)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{simulationProgress}% completed</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${simulationProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={handleVoiceToggle}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    voiceCompanionEnabled
                      ? "bg-blue-100 text-blue-700 border border-blue-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300"
                  }`}
                >
                  {voiceCompanionEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors">
                  🚨 SOS
                </button>
                <button
                  onClick={() => {
                    setWalkSession(null);
                    setSimulationProgress(0);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700 transition-colors"
                >
                  End Navigation
                </button>
              </div>
            </div>

            {/* Quick Stats Footer */}
            <div className="bg-white px-4 py-2 border-t border-gray-200">
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  Started: {walkSession.startTime.toLocaleTimeString()}
                </span>
                <span>
                  ETA:{" "}
                  {new Date(
                    Date.now() + walkSession.route.estimatedTime * 60000
                  ).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isRouteLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-lg p-6 mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
              <p className="text-gray-900 font-medium">Finding safe route...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
