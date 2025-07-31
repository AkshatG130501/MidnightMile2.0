"use client";

import { useState, useEffect } from "react";
import { X, Menu, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import MapComponent from "@/components/MapComponent";
import SearchBar from "@/components/SearchBar";
import RouteBottomDrawer from "@/components/RouteBottomDrawer";
import LandingPage from "@/components/LandingPage";
import UserProfileDropdown from "@/components/UserProfileDropdown";
import { Location, Route, SafeSpot, WalkSession } from "@/types";
import { handleEmergencyAlertFromVoice } from "@/services/emergencyAlertBridge";
import { googleMapsService } from "@/services/googleMaps";
import { elevenLabsService } from "@/services/elevenLabs";
import { SUPPORTED_CITIES, FIXED_STARTING_LOCATION } from "@/constants";
import { isWithinTravelRadius, formatDuration, formatDistance } from "@/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Augment the Window interface to include the VoiceAssistantService
declare global {
  interface Window {
    VoiceAssistantService?: {
      setCallbacks: (callbacks: {
        onEmergencyAlertRequest: () => void;
      }) => void;
    };
  }
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();

  // Wire up voice assistant emergency alert callback
  if (typeof window !== "undefined" && window.VoiceAssistantService) {
    try {
      window.VoiceAssistantService.setCallbacks({
        onEmergencyAlertRequest: handleEmergencyAlertFromVoice,
      });
    } catch (e) {
      // Ignore if not available
    }
  }
  const router = useRouter();

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
  const [voiceCompanionEnabled, setVoiceCompanionEnabled] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isRouteDrawerOpen, setIsRouteDrawerOpen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false); // New immersive navigation mode

  // Handle OAuth callback tokens in URL
  useEffect(() => {
    const handleAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");

      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Error setting session:", error);
          } else {
            console.log("Session set successfully:", data);
            // Clean up the URL
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        } catch (error) {
          console.error("Auth callback error:", error);
        }
      }
    };

    handleAuthCallback();
  }, []);

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
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest(".menu-container")) {
          setShowMenu(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

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
        setIsRouteDrawerOpen(true); // Open drawer when routes are available
      }
    } catch (err) {
      setError("Unable to calculate route. Please try again.");
      console.error("Route calculation error:", err);
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Handle clearing search
  const handleSearchClear = () => {
    setDestination(null);
    setRoutes(null);
    setSelectedRoute(null);
    setError(null);
  };

  // Handle route selection from drawer
  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);

    // Automatically start navigation when route is selected
    if (currentLocation) {
      setSimulationProgress(0); // Reset progress
      setVoiceCompanionEnabled(true); // Enable voice companion when navigation starts
      setIsImmersiveMode(true); // Enable immersive navigation mode
      setIsRouteDrawerOpen(false); // Close drawer for immersive experience

      const session: WalkSession = {
        id: Date.now().toString(),
        userId: "user", // In real app, this would be from auth
        route: route,
        startTime: new Date(),
        status: "active",
        checkInStatus: "pending",
        voiceCompanionEnabled: true, // Set to true for new session
      };

      setWalkSession(session);

      // Add haptic feedback for navigation start
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]); // Start vibration pattern
      }

      // Add smooth transition delay for immersive mode
      setTimeout(() => {
        // Additional haptic feedback for immersive mode activation
        if (navigator.vibrate) {
          navigator.vibrate([50, 50, 50]); // Triple pulse for 3D activation
        }
      }, 1000);

      // Start voice companion if enabled
      if (elevenLabsService.isConfigured()) {
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

  // Handle route preview from drawer carousel (just highlight on map, don't start navigation)
  const handleRoutePreview = (route: Route) => {
    setSelectedRoute(route);
  };

  // Start walking session
  const handleStartWalk = () => {
    if (!selectedRoute || !currentLocation) return;

    setVoiceCompanionEnabled(true); // Enable voice companion when navigation starts

    const session: WalkSession = {
      id: Date.now().toString(),
      userId: "user", // In real app, this would be from auth
      route: selectedRoute,
      startTime: new Date(),
      status: "active",
      checkInStatus: "pending",
      voiceCompanionEnabled: true, // Set to true for new session
    };

    setWalkSession(session);

    // Start voice companion if enabled
    if (elevenLabsService.isConfigured()) {
      const greeting = elevenLabsService.generateCompanionMessage("greeting", {
        userName: "there", // In real app, get from user profile
      });
      elevenLabsService.playVoiceMessage(greeting).catch(console.error);
    }
  };

  // Handle route update with safety spot
  const handleRouteUpdate = (updatedRoute: Route) => {
    console.log("📤 Received route update in page.tsx");
    console.log("🆔 Updated route ID:", updatedRoute.id);
    console.log("🛣️ Updated route waypoints:", updatedRoute.waypoints.length);

    // Update the selected route
    setSelectedRoute(updatedRoute);
    console.log("✅ Selected route updated");

    // Update the routes array if it exists
    if (routes) {
      const updatedRoutes = routes.map((route) =>
        route.id === selectedRoute?.id ? updatedRoute : route
      );
      setRoutes(updatedRoutes);
      console.log("✅ Routes array updated");
    } else {
      console.log("⚠️ No routes array to update");
    }

    // If there's an active walk session, update it with the new route
    if (walkSession) {
      setWalkSession({
        ...walkSession,
        route: updatedRoute,
      });
      console.log("✅ Walk session updated with new route");
    } else {
      console.log("ℹ️ No active walk session to update");
    }

    console.log("🎉 Route update completed successfully!");
  };

  // Handle voice end navigation request
  const handleEndNavigationFromVoice = async (): Promise<void> => {
    console.log("🎙️ Voice requested to end navigation");
    handleExitImmersiveMode();
  };

  // Handle voice change destination request
  const handleChangeDestinationFromVoice = async (
    destinationQuery: string
  ): Promise<void> => {
    try {
      console.log("🎙️ Voice requested destination change to:", destinationQuery);
      // Search for the destination near the fixed starting location
      const searchResults = await googleMapsService.searchPlaces(
        destinationQuery,
        FIXED_STARTING_LOCATION
      );

      if (!searchResults || searchResults.length === 0) {
        console.log("❌ No search results found for", destinationQuery);
        setError("Destination not found. Please try again.");
        return;
      }

      const topResult = searchResults[0];
      const lat = topResult.geometry?.location?.lat();
      const lng = topResult.geometry?.location?.lng();
      if (lat === undefined || lng === undefined) {
        console.log("❌ Top result missing geometry");
        setError("Unable to get destination location.");
        return;
      }

      const dest = {
        lat,
        lng,
        address: topResult.formatted_address || topResult.name || destinationQuery,
      } as Location & { address: string };

      // Directly calculate routes and update state
      setIsRouteLoading(true);
      const routeAlternatives =
        await googleMapsService.calculateRouteAlternatives(
          FIXED_STARTING_LOCATION,
          dest
        );
      setIsRouteLoading(false);

      if (!routeAlternatives || routeAlternatives.length === 0) {
        setError("No routes available to new destination.");
        return;
      }

      const routesWithSafeSpots = routeAlternatives.map((route) => ({
        ...route,
        safeSpots: safeSpots.filter((spot) => spot.distance <= 1000),
      }));
      const sortedRoutes = routesWithSafeSpots.sort(
        (a, b) => b.safetyScore.overall - a.safetyScore.overall
      );

      setRoutes(sortedRoutes);
      setSelectedRoute(sortedRoutes[0]);
      setDestination(dest);

      if (walkSession) {
        // Update active walk session with new route
        setWalkSession({
          ...walkSession,
          route: sortedRoutes[0],
        });
      }

    } catch (err) {
      console.error("Error changing destination:", err);
      setError("Failed to change destination. Please try again.");
    }
  };

  // Toggle voice companion
  const handleVoiceToggle = () => {
    setVoiceCompanionEnabled(!voiceCompanionEnabled);
  };

  // Handle route drawer close
  const handleRouteDrawerClose = () => {
    setIsRouteDrawerOpen(false);
  };

  // Exit immersive navigation mode and end navigation
  const handleExitImmersiveMode = () => {
    setIsImmersiveMode(false);
    setWalkSession(null); // End the navigation session
    setSimulationProgress(0); // Reset progress
    setVoiceCompanionEnabled(false); // Disable voice companion
    setSelectedRoute(null); // Clear selected route
    setRoutes(null); // Clear all routes
    setDestination(null); // Clear destination

    // Add haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]); // Double vibration for navigation end
    }
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

  // Handle navigation completion
  useEffect(() => {
    if (simulationProgress >= 100 && walkSession) {
      // Disable voice companion when destination is reached
      setVoiceCompanionEnabled(false);

      // Play arrival message if voice was enabled
      if (voiceCompanionEnabled && elevenLabsService.isConfigured()) {
        const arrivalMessage = elevenLabsService.generateCompanionMessage(
          "arrival",
          {
            userName: "there",
          }
        );
        elevenLabsService.playVoiceMessage(arrivalMessage).catch(console.error);
      }

      // Auto-end session after a short delay
      setTimeout(() => {
        setWalkSession(null);
        setSimulationProgress(0);
        setIsImmersiveMode(false); // Exit immersive mode when navigation ends
        setVoiceCompanionEnabled(false); // Disable voice companion
      }, 3000); // 3 seconds delay to show arrival message
    }
  }, [simulationProgress, walkSession, voiceCompanionEnabled]);

  const currentInstruction = getNavigationInstruction(simulationProgress);

  // Get center location for map
  const getMapCenter = (): Location => {
    if (currentLocation) return currentLocation;
    return FIXED_STARTING_LOCATION; // Default to Samvidhan Sadan
  };

  // Show loading screen while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-midnight-navy via-midnight-slate to-midnight-navy flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-midnight-teal border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading Midnight Mile...
          </h2>
          <p className="text-midnight-beige">Preparing your safety companion</p>
        </div>
      </div>
    );
  }

  // Show landing page if user is not authenticated
  if (!user) {
    return (
      <LandingPage
        onGetStarted={() => {
          // This callback is not needed since auth is handled by the AuthModal
          // Once user authenticates, the AuthContext will update and this condition will be false
        }}
      />
    );
  }

  // Loading screen for location setup
  if (isLocationLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-midnight-teal border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-midnight-navy mb-2">
            Setting up your location...
          </h2>
          <p className="text-midnight-slate">
            Initializing Samvidhan Sadan as your starting point
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-screen overflow-hidden transition-all duration-500 ${
        isImmersiveMode
          ? "bg-gray-900" // Dark background for immersive mode
          : "bg-white"
      }`}
    >
      {/* User Profile Header - Hidden in immersive mode */}
      {!isImmersiveMode && (
        <div className="absolute top-6 right-6 z-40">
          <UserProfileDropdown />
        </div>
      )}

      {/* Map - Full screen like Google Maps */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          center={getMapCenter()}
          routes={routes}
          selectedRoute={selectedRoute}
          safeSpots={safeSpots}
          currentLocation={currentLocation || undefined}
          destination={destination}
          className={`w-full h-full transition-all duration-500 ${
            isImmersiveMode ? "brightness-90 contrast-110" : ""
          }`}
          onRouteSelect={handleRouteSelect}
          onRouteUpdate={handleRouteUpdate}
          walkSession={walkSession}
          onSimulationProgress={setSimulationProgress}
          isImmersiveMode={isImmersiveMode}
          onEndNavigationRequest={handleEndNavigationFromVoice}
          onChangeDestinationRequest={handleChangeDestinationFromVoice}
        />
      </div>

      {/* Floating search bar - Hidden in immersive mode */}
      {!isImmersiveMode && (
        <div className="absolute top-6 left-6 right-20 z-20">
          <SearchBar
            onDestinationSelect={handleDestinationSelect}
            onClear={handleSearchClear}
            currentLocation={FIXED_STARTING_LOCATION}
            disabled={isRouteLoading}
            placeholder="Search for destination"
          />
        </div>
      )}

      {/* Immersive Navigation Header */}
      {isImmersiveMode && walkSession && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <div className="bg-gradient-to-b from-gray-900/95 to-transparent backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 text-white">
              {/* Exit Button */}
              <button
                onClick={handleExitImmersiveMode}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
                aria-label="Exit immersive mode"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Navigation Info */}
              <div className="flex-1 text-center">
                <div className="text-lg font-semibold">
                  {currentInstruction.action}
                </div>
                <div className="text-sm text-gray-300">
                  {currentInstruction.distance} • {currentInstruction.street}
                </div>
              </div>

              {/* Voice Toggle */}
              <button
                onClick={() => setVoiceCompanionEnabled(!voiceCompanionEnabled)}
                className={`p-2 rounded-full transition-all duration-200 backdrop-blur-sm ${
                  voiceCompanionEnabled
                    ? "bg-blue-500/80 text-white"
                    : "bg-white/20 text-gray-300"
                }`}
                aria-label="Toggle voice companion"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-4 pb-4">
              <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 transition-all duration-300 ease-out shadow-lg"
                  style={{ width: `${simulationProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-300 mt-2">
                <span>{Math.round(simulationProgress)}% Complete</span>
                <span>
                  {selectedRoute
                    ? `${(
                        (selectedRoute.estimatedTime *
                          (100 - simulationProgress)) /
                        100
                      ).toFixed(0)} min left`
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message - floating with better positioning and auto-dismiss */}
      {error && (
        <div className="absolute top-20 left-6 right-6 z-60">
          <div className="bg-red-50 border border-midnight-coral rounded-xl p-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-top-2 fade-in-0 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1">
                <div className="w-4 h-4 rounded-full bg-midnight-coral/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-midnight-coral"></div>
                </div>
                <p className="text-sm text-midnight-coral font-medium">
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-2 p-1 hover:bg-midnight-coral/10 rounded-full transition-colors flex-shrink-0"
                aria-label="Dismiss error"
              >
                <X className="h-3 w-3 text-midnight-coral" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route Selection Drawer - Show when routes are available and not navigating */}
      {routes && routes.length > 0 && !walkSession && (
        <RouteBottomDrawer
          routes={routes}
          isOpen={isRouteDrawerOpen}
          onClose={handleRouteDrawerClose}
          onRouteSelect={handleRouteSelect}
          onRoutePreview={handleRoutePreview}
        />
      )}

      {/* Active walk session - Google Maps navigation style */}
      {/* Navigation Interface - Active Walking Session */}
      {walkSession && (
        <div
          className={`absolute z-30 ${
            isImmersiveMode
              ? "bottom-6 left-6 right-6" // Centered in immersive mode
              : "bottom-4 left-4 right-4" // Normal position
          }`}
        >
          <div
            className={`rounded-2xl shadow-2xl border overflow-hidden transition-all duration-300 ${
              isImmersiveMode
                ? "bg-gray-800/95 border-gray-600 backdrop-blur-lg" // Dark theme for immersive
                : "bg-white border-gray-200" // Light theme for normal
            }`}
          >
            {/* Navigation Header */}
            <div
              className={`px-4 py-3 ${
                isImmersiveMode ? "bg-gray-700/50" : "bg-midnight-navy"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-midnight-teal rounded-full animate-pulse"></div>
                  <div>
                    <p
                      className={`font-semibold text-sm ${
                        isImmersiveMode ? "text-gray-100" : "text-white"
                      }`}
                    >
                      Navigation Active
                    </p>
                    <p
                      className={`text-xs ${
                        isImmersiveMode
                          ? "text-gray-300"
                          : "text-midnight-beige"
                      }`}
                    >
                      {walkSession.route.id.includes("safest")
                        ? "Safest Route"
                        : "Fastest Route"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-medium ${
                      isImmersiveMode ? "text-gray-100" : "text-white"
                    }`}
                  >
                    {formatDuration(walkSession.route.estimatedTime)}
                  </p>
                  <p
                    className={`text-xs ${
                      isImmersiveMode ? "text-gray-300" : "text-midnight-beige"
                    }`}
                  >
                    {formatDistance(walkSession.route.distance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Instructions */}

            {/* Quick Stats Footer */}
            <div className="bg-white px-4 py-2 border-t border-midnight-beige">
              <div className="flex justify-between text-xs text-midnight-slate">
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
        <div className="absolute inset-0 bg-midnight-navy/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 mx-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-midnight-teal border-t-transparent"></div>
              <p className="text-midnight-navy font-medium">
                Finding safe route...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
