"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Route } from "@/types";
import { COLORS } from "@/constants";
import {
  Clock,
  Shield,
  Users,
  Eye,
  Zap,
  ChevronLeft,
  ChevronRight,
  Navigation,
} from "lucide-react";

interface RouteBottomDrawerProps {
  routes: Route[] | null; // Changed from single route to multiple routes
  isOpen: boolean;
  onClose: () => void;
  onRouteSelect?: (route: Route) => void; // Callback when user selects a route
}

export default function RouteBottomDrawer({
  routes,
  isOpen,
  onClose,
  onRouteSelect,
}: RouteBottomDrawerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [drawerHeight, setDrawerHeight] = useState<"compact" | "expanded">(
    "compact"
  );
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isCarouselDragging, setIsCarouselDragging] = useState(false);
  const [carouselStartX, setCarouselStartX] = useState(0);
  const [carouselTranslateX, setCarouselTranslateX] = useState(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Sort routes by safety score (safest first)
  const sortedRoutes = routes
    ? [...routes].sort((a, b) => b.safetyScore.overall - a.safetyScore.overall)
    : [];

  // Handle vertical drawer swiping
  const handleStart = useCallback((clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
    setCurrentY(clientY);
  }, []);

  const handleMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;

      const deltaY = clientY - startY;
      setCurrentY(clientY);
      setTranslateY(deltaY);
    },
    [isDragging, startY]
  );

  const handleEnd = useCallback(() => {
    if (!isDragging) return;

    const deltaY = currentY - startY;

    if (deltaY > 100) {
      if (drawerHeight === "expanded") {
        setDrawerHeight("compact");
      } else {
        onClose();
      }
    } else if (deltaY < -100) {
      setDrawerHeight("expanded");
    } else if (Math.abs(deltaY) > 150) {
      onClose();
    }

    setIsDragging(false);
    setTranslateY(0);
    setStartY(0);
    setCurrentY(0);
  }, [isDragging, currentY, startY, drawerHeight, onClose]);

  // Handle horizontal carousel swiping
  const handleCarouselStart = useCallback((clientX: number) => {
    setIsCarouselDragging(true);
    setCarouselStartX(clientX);
  }, []);

  const handleCarouselMove = useCallback(
    (clientX: number) => {
      if (!isCarouselDragging) return;
      const deltaX = clientX - carouselStartX;
      setCarouselTranslateX(deltaX);
    },
    [isCarouselDragging, carouselStartX]
  );

  const handleCarouselEnd = useCallback(() => {
    if (!isCarouselDragging) return;

    const deltaX = carouselTranslateX;
    const threshold = 100;

    if (deltaX > threshold && currentRouteIndex > 0) {
      setCurrentRouteIndex((prev) => prev - 1);
    } else if (
      deltaX < -threshold &&
      currentRouteIndex < sortedRoutes.length - 1
    ) {
      setCurrentRouteIndex((prev) => prev + 1);
    }

    setIsCarouselDragging(false);
    setCarouselTranslateX(0);
    setCarouselStartX(0);
  }, [
    isCarouselDragging,
    carouselTranslateX,
    currentRouteIndex,
    sortedRoutes.length,
  ]);

  // Touch events for drawer
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMove(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Touch events for carousel
  const handleCarouselTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    handleCarouselStart(e.touches[0].clientX);
  };

  const handleCarouselTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    handleCarouselMove(e.touches[0].clientX);
  };

  const handleCarouselTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    handleCarouselEnd();
  };

  // Mouse events for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientY);
  };

  useEffect(() => {
    const handleMouseMoveEvent = (e: MouseEvent) => {
      handleMove(e.clientY);
    };

    const handleMouseUpEvent = () => {
      handleEnd();
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMoveEvent);
      document.addEventListener("mouseup", handleMouseUpEvent);
      return () => {
        document.removeEventListener("mousemove", handleMouseMoveEvent);
        document.removeEventListener("mouseup", handleMouseUpEvent);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  // Reset to compact mode and first route when drawer opens
  useEffect(() => {
    if (isOpen) {
      setDrawerHeight("compact");
      setCurrentRouteIndex(0);
    }
  }, [isOpen]);

  // Navigation functions
  const goToPreviousRoute = () => {
    if (currentRouteIndex > 0) {
      setCurrentRouteIndex((prev) => prev - 1);
    }
  };

  const goToNextRoute = () => {
    if (currentRouteIndex < sortedRoutes.length - 1) {
      setCurrentRouteIndex((prev) => prev + 1);
    }
  };

  // Helper functions
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const getSafetyColor = (score: number) => {
    if (score >= 70) return COLORS.SUCCESS;
    if (score >= 50) return COLORS.AMBER;
    return COLORS.DANGER;
  };

  const getSafetyLevel = (score: number) => {
    if (score >= 70) return "Safe";
    if (score >= 50) return "Moderate";
    return "Caution";
  };

  const getRouteLabel = (route: Route, index: number) => {
    // Extract route type from the route ID if available
    if (route.id.includes("safest")) return "Safest Route";
    if (route.id.includes("fastest")) return "Fastest Route";

    // Fallback to index-based labeling for backward compatibility
    if (index === 0) return "Recommended Route";
    return "Alternative Route";
  };
  if (!routes || routes.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 transform transition-all duration-300 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          transform: `translateY(${isOpen ? translateY : "100%"}px)`,
          maxHeight: drawerHeight === "expanded" ? "80vh" : "40vh",
        }}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div
            className={`w-12 h-1.5 rounded-full transition-colors duration-200 ${
              drawerHeight === "expanded" ? "bg-blue-400" : "bg-gray-300"
            }`}
          />
        </div>

        {/* Content */}
        <div
          className={`px-6 pb-8 overflow-y-auto transition-all duration-300 ${
            drawerHeight === "expanded"
              ? "max-h-[calc(80vh-80px)]"
              : "max-h-[calc(40vh-80px)]"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">Route Options</h2>
              <p className="text-sm text-gray-500 mt-1">
                {sortedRoutes.length} route{sortedRoutes.length > 1 ? "s" : ""}{" "}
                found • Swipe to explore
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors ml-4"
              aria-label="Close drawer"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* Route Carousel */}
          <div className="relative mb-6">
            {/* Carousel Container */}
            <div
              ref={carouselRef}
              className="overflow-hidden"
              onTouchStart={handleCarouselTouchStart}
              onTouchMove={handleCarouselTouchMove}
              onTouchEnd={handleCarouselTouchEnd}
            >
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(calc(-${
                    currentRouteIndex * 100
                  }% + ${carouselTranslateX}px))`,
                }}
              >
                {sortedRoutes.map((route, index) => (
                  <div key={route.id} className="w-full flex-shrink-0 px-2">
                    {/* Route Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                      {/* Route Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-3"
                            style={{
                              backgroundColor: getSafetyColor(
                                route.safetyScore.overall
                              ),
                            }}
                          />
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">
                              {getRouteLabel(route, index)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {getSafetyLevel(route.safetyScore.overall)} •{" "}
                              {route.safetyScore.overall.toFixed(2)}% safety
                            </p>
                          </div>
                        </div>
                        {index === 0 && (
                          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                            Recommended
                          </div>
                        )}
                      </div>

                      {/* Route Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-white rounded-xl p-3 shadow-sm">
                          <div className="flex items-center mb-1">
                            <Clock className="w-4 h-4 text-gray-600 mr-2" />
                            <span className="text-xs font-medium text-gray-600">
                              Duration
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            {formatTime(route.estimatedTime)}
                          </p>
                        </div>

                        <div className="bg-white rounded-xl p-3 shadow-sm">
                          <div className="flex items-center mb-1">
                            <Navigation className="w-4 h-4 text-gray-600 mr-2" />
                            <span className="text-xs font-medium text-gray-600">
                              Distance
                            </span>
                          </div>
                          <p className="text-lg font-bold text-gray-900">
                            {formatDistance(route.distance)}
                          </p>
                        </div>
                      </div>

                      {/* Safety Breakdown - Only in expanded mode */}
                      {drawerHeight === "expanded" && (
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Safety Breakdown
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <div className="flex items-center">
                                <Eye className="w-3 h-3 text-gray-600 mr-1" />
                                <span className="text-xs text-gray-700">
                                  Lighting
                                </span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">
                                {route.safetyScore.lighting.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <div className="flex items-center">
                                <Users className="w-3 h-3 text-gray-600 mr-1" />
                                <span className="text-xs text-gray-700">
                                  Traffic
                                </span>
                              </div>
                              <span className="text-xs font-bold text-gray-900">
                                {route.safetyScore.footTraffic.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Safe Spots Count */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Shield className="w-4 h-4 mr-1" />
                          <span>
                            {route.safeSpots.length} safe spots along route
                          </span>
                        </div>
                      </div>

                      {/* Select Route Button */}
                      <button
                        onClick={() => {
                          onRouteSelect?.(route);
                          onClose();
                        }}
                        className="w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          background:
                            index === 0
                              ? `linear-gradient(135deg, ${COLORS.SUCCESS} 0%, ${COLORS.TEAL} 100%)`
                              : `linear-gradient(135deg, ${COLORS.NAVY} 0%, ${COLORS.SLATE} 100%)`,
                          color: "white",
                        }}
                      >
                        <div className="flex items-center justify-center">
                          <Zap className="w-4 h-4 mr-2" />
                          {route.id.includes("safest")
                            ? "Start Safest Route"
                            : route.id.includes("fastest")
                            ? "Start Fastest Route"
                            : index === 0
                            ? "Start Recommended Route"
                            : "Start This Route"}
                        </div>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Arrows */}
            {sortedRoutes.length > 1 && (
              <>
                <button
                  onClick={goToPreviousRoute}
                  disabled={currentRouteIndex === 0}
                  className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
                    currentRouteIndex === 0
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-xl"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={goToNextRoute}
                  disabled={currentRouteIndex === sortedRoutes.length - 1}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-8 h-8 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
                    currentRouteIndex === sortedRoutes.length - 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50 hover:shadow-xl"
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Route Indicators */}
          {sortedRoutes.length > 1 && (
            <div className="flex justify-center space-x-2 mb-4">
              {sortedRoutes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentRouteIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentRouteIndex
                      ? "bg-blue-500 w-6"
                      : "bg-gray-300 hover:bg-gray-400"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Expand Hint */}
          {drawerHeight === "compact" && (
            <div className="text-center">
              <p className="text-xs text-gray-400">
                Swipe up for detailed safety breakdown
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
