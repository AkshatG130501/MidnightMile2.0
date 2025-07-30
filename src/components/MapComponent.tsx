"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { googleMapsService } from "@/services/googleMaps";
import { Location, SafeSpot, Route, WalkSession } from "@/types";
import { COLORS, SAFETY_COLORS } from "@/constants";
import RouteBottomDrawer from "./RouteBottomDrawer";

interface MapComponentProps {
  center: Location;
  onLocationSelect?: (location: Location) => void;
  routes?: Route[] | null; // Changed from single route to multiple routes
  selectedRoute?: Route | null; // Currently selected/displayed route
  safeSpots?: SafeSpot[];
  currentLocation?: Location;
  className?: string;
  onRouteSelect?: (route: Route) => void; // Callback when user selects a route
  walkSession?: WalkSession | null; // Add walkSession prop to hide drawer during navigation
  onSimulationProgress?: (progress: number) => void; // Callback for simulation progress (0-100)
}

export default function MapComponent({
  center,
  onLocationSelect,
  routes,
  selectedRoute,
  safeSpots = [],
  currentLocation,
  className = "w-full h-screen",
  onRouteSelect,
  walkSession,
  onSimulationProgress,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userClosedDrawer, setUserClosedDrawer] = useState(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]); // Changed to array for multiple segments
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);
  const walkerMarkerRef = useRef<google.maps.Marker | null>(null);
  const walkingAnimationRef = useRef<number | null>(null);

  // Helper function to create custom icons for start and destination points
  const createLocationIcon = (type: "start" | "destination") => {
    const isStart = type === "start";
    const color = isStart ? "#10B981" : "#EF4444"; // Green for start, Red for destination
    const icon = isStart
      ? // Home/Start icon
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="white" stroke-width="2" fill="${color}"/>
         <path d="M9 22V12H15V22" stroke="white" stroke-width="2"/>
       </svg>`
      : // Flag/Destination icon
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <path d="M4 15S4 11 8 11S14 15 18 11S22 15 22 15" stroke="${color}" stroke-width="2" fill="none"/>
         <path d="M4 22V2" stroke="${color}" stroke-width="2"/>
         <path d="M4 15C4 11 8 11 12 11S20 15 20 11V4C20 8 16 8 12 8S4 4 4 8V15Z" fill="${color}"/>
       </svg>`;

    return {
      url:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
        <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Drop shadow -->
          <ellipse cx="20" cy="46" rx="10" ry="4" fill="rgba(0,0,0,0.15)"/>
          
          <!-- Main pin shape -->
          <path d="M20 0C11.1634 0 4 7.1634 4 16C4 25.5 20 48 20 48C20 48 36 25.5 36 16C36 7.1634 28.8366 0 20 0Z" fill="${color}"/>
          
          <!-- White circle background for icon -->
          <circle cx="20" cy="16" r="10" fill="white"/>
          
          <!-- Icon content -->
          <g transform="translate(12, 8)">
            ${icon}
          </g>
          
          <!-- Subtle border -->
          <path d="M20 2C12.268 2 6 8.268 6 16C6 24 20 46 20 46C20 46 34 24 34 16C34 8.268 27.732 2 20 2Z" stroke="rgba(255,255,255,0.3)" stroke-width="1" fill="none"/>
        </svg>
      `),
      scaledSize: new google.maps.Size(40, 50),
      anchor: new google.maps.Point(20, 50),
    };
  };

  // Helper function to create walking person icon
  const createWalkerIcon = () => {
    const walkerSvg = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Person walking icon -->
        <circle cx="9" cy="4" r="2" fill="#FFFFFF"/>
        <path d="M10.5 7H7.5C6.67 7 6 7.67 6 8.5V11L8 12V20H10V13L12 11.5V20H14V10.5L10.5 7Z" fill="#FFFFFF"/>
        <path d="M16 20L18 18L16 16L14 18L16 20Z" fill="#FFFFFF"/>
      </svg>
    `;

    return {
      url:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`
        <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="18" r="16" fill="#2563EB" stroke="white" stroke-width="2"/>
          <g transform="translate(8, 8)">
            ${walkerSvg}
          </g>
        </svg>
      `),
      scaledSize: new google.maps.Size(36, 36),
      anchor: new google.maps.Point(18, 18),
    };
  };

  // Function to interpolate between two points
  const interpolatePosition = (
    start: Location,
    end: Location,
    progress: number
  ): Location => {
    return {
      lat: start.lat + (end.lat - start.lat) * progress,
      lng: start.lng + (end.lng - start.lng) * progress,
    };
  };

  // Function to extract path points from route
  const getRoutePathPoints = (route: Route): Location[] => {
    const points: Location[] = [];

    // Start with the starting location
    points.push(route.start);

    // Add all waypoints
    if (route.waypoints && route.waypoints.length > 0) {
      points.push(...route.waypoints);
    }

    // End with the destination
    points.push(route.end);

    return points;
  };

  // Function to start walking simulation
  const startWalkingSimulation = useCallback(
    (route: Route) => {
      if (!map) return;

      // Stop any existing animation
      if (walkingAnimationRef.current) {
        cancelAnimationFrame(walkingAnimationRef.current);
      }

      // Clear existing walker marker
      if (walkerMarkerRef.current) {
        walkerMarkerRef.current.setMap(null);
      }

      const pathPoints = getRoutePathPoints(route);
      if (pathPoints.length < 2) return;

      // Create walker marker
      walkerMarkerRef.current = new google.maps.Marker({
        position: pathPoints[0],
        map: map,
        icon: createWalkerIcon(),
        title: "Walking...",
        zIndex: 1000,
      });

      const animationDuration = 60000; // 1 minute in milliseconds
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);

        // Update progress callback
        if (onSimulationProgress) {
          onSimulationProgress(Math.round(progress * 100));
        }

        if (progress >= 1) {
          // Animation complete
          if (walkerMarkerRef.current) {
            walkerMarkerRef.current.setPosition(
              pathPoints[pathPoints.length - 1]
            );
          }
          return;
        }

        // Calculate current position along the path
        const totalSegments = pathPoints.length - 1;
        const currentSegmentFloat = progress * totalSegments;
        const currentSegmentIndex = Math.floor(currentSegmentFloat);
        const segmentProgress = currentSegmentFloat - currentSegmentIndex;

        if (currentSegmentIndex < totalSegments) {
          const start = pathPoints[currentSegmentIndex];
          const end = pathPoints[currentSegmentIndex + 1];
          const currentPosition = interpolatePosition(
            start,
            end,
            segmentProgress
          );

          if (walkerMarkerRef.current) {
            walkerMarkerRef.current.setPosition(currentPosition);
          }
        }

        walkingAnimationRef.current = requestAnimationFrame(animate);
      };

      animate();
    },
    [map, onSimulationProgress]
  );

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        setIsLoading(true);
        const mapInstance = await googleMapsService.initializeMap(
          mapRef.current,
          center
        );
        setMap(mapInstance);

        // Add click listener for location selection
        if (onLocationSelect) {
          mapInstance.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              onLocationSelect({
                lat: e.latLng.lat(),
                lng: e.latLng.lng(),
              });
            }
          });
        }

        setError(null);
      } catch (err) {
        setError("Failed to load map. Please check your internet connection.");
        console.error("Map initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initMap();
  }, [center, onLocationSelect]);

  // Update current location marker (fixed starting location)
  useEffect(() => {
    if (!map || !currentLocation) return;

    const marker = googleMapsService.addMarker(
      currentLocation,
      "Starting Point - Samvidhan Sadan",
      {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Drop shadow -->
            <ellipse cx="16" cy="36" rx="6" ry="2" fill="rgba(0,0,0,0.3)"/>
            
            <!-- Main pin shape -->
            <path d="M16 0C7.16 0 0 7.16 0 16C0 24 16 40 16 40C16 40 32 24 32 16C32 7.16 24.84 0 16 0Z" fill="${COLORS.TEAL}"/>
            
            <!-- Inner circle background -->
            <circle cx="16" cy="16" r="10" fill="${COLORS.WHITE}"/>
            
            <!-- Icon -->
            <circle cx="16" cy="16" r="6" fill="${COLORS.TEAL}"/>
            <circle cx="16" cy="16" r="3" fill="${COLORS.WHITE}"/>
            
            <!-- Highlight ring -->
            <circle cx="16" cy="16" r="11" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          </svg>
        `),
        scaledSize: new google.maps.Size(32, 40),
        anchor: new google.maps.Point(16, 40),
      }
    );

    if (marker) {
      // Add info window for starting location
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 250px; padding: 12px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <div style="width: 20px; height: 20px; background: ${COLORS.TEAL}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
              </div>
              <div>
                <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">Starting Point</h3>
                <p style="margin: 0; font-size: 11px; color: ${COLORS.TEAL}; font-weight: 500;">YOUR LOCATION</p>
              </div>
            </div>
            <p style="margin: 0; font-size: 12px; color: #6B7280; line-height: 1.4;">
              Samvidhan Sadan, Sansad Marg, Connaught Place, New Delhi
            </p>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -10),
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });

      markersRef.current.push(marker);
    }

    return () => {
      if (marker) {
        marker.setMap(null);
      }
    };
  }, [map, currentLocation]);

  // Update safe spots markers
  useEffect(() => {
    if (!map || !safeSpots.length) return;

    // Clear existing safe spot markers
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    safeSpots.forEach((spot) => {
      // Enhanced icon design based on spot type
      const getSpotIcon = (type: string) => {
        switch (type) {
          case "police":
            return {
              color: "#1E40AF", // Blue
              bgColor: "#EFF6FF", // Light blue background
              icon: `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.5 8.5H20L15 12.5L16.5 19L12 15L7.5 19L9 12.5L4 8.5H10.5L12 2Z" fill="#1E40AF"/>
                </svg>
              `,
              label: "Police",
            };
          case "hospital":
            return {
              color: "#DC2626", // Red
              bgColor: "#FEF2F2", // Light red background
              icon: `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2V6H8V18H16V6H12V2Z" fill="#DC2626"/>
                  <path d="M10 8H14V10H12V14H10V10H8V8H10Z" fill="white"/>
                </svg>
              `,
              label: "Hospital",
            };
          default: // store
            return {
              color: "#059669", // Green
              bgColor: "#F0FDF4", // Light green background
              icon: `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" fill="#059669"/>
                </svg>
              `,
              label: "Store",
            };
        }
      };

      const spotIcon = getSpotIcon(spot.type);

      const marker = googleMapsService.addMarker(spot.location, spot.name, {
        url:
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(`
            <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Drop shadow -->
              <ellipse cx="18" cy="42" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
              
              <!-- Main pin shape -->
              <path d="M18 0C8.059 0 0 8.059 0 18C0 28.5 18 45 18 45C18 45 36 28.5 36 18C36 8.059 27.941 0 18 0Z" fill="${spotIcon.color}"/>
              
              <!-- Inner circle background -->
              <circle cx="18" cy="18" r="12" fill="${spotIcon.bgColor}"/>
              
              <!-- Icon container -->
              <g transform="translate(11, 11)">
                ${spotIcon.icon}
              </g>
              
              <!-- Highlight ring -->
              <circle cx="18" cy="18" r="13" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
            </svg>
          `),
        scaledSize: new google.maps.Size(36, 46),
        anchor: new google.maps.Point(18, 46),
        labelOrigin: new google.maps.Point(18, 50),
      });

      if (marker) {
        markersRef.current.push(marker);

        // Enhanced info window with better styling
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 280px; padding: 0;">
              <div style="background: linear-gradient(135deg, ${
                spotIcon.color
              }15, ${spotIcon.color}05); padding: 16px; border-radius: 8px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <div style="width: 24px; height: 24px; background: ${
                    spotIcon.color
                  }; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
                    <div style="transform: scale(0.7);">
                      ${spotIcon.icon}
                    </div>
                  </div>
                  <div>
                    <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: #111827;">${
                      spot.name
                    }</h3>
                    <p style="margin: 0; font-size: 11px; color: ${
                      spotIcon.color
                    }; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${
            spotIcon.label
          }</p>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 6px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2Z" fill="#6B7280"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                  <span style="font-size: 12px; color: #6B7280;">
                    ${
                      spot.distance < 1000
                        ? `${Math.round(spot.distance)}m away`
                        : `${(spot.distance / 1000).toFixed(1)}km away`
                    }
                  </span>
                </div>
                
                ${
                  spot.isOpen24Hours
                    ? `<div style="display: flex; align-items: center; margin-bottom: 6px;">
                       <div style="width: 6px; height: 6px; background: #10B981; border-radius: 50%; margin-right: 6px;"></div>
                       <span style="font-size: 11px; color: #10B981; font-weight: 500;">Open 24 hours</span>
                     </div>`
                    : `<div style="display: flex; align-items: center; margin-bottom: 6px;">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                         <circle cx="12" cy="12" r="10" stroke="#6B7280" stroke-width="2"/>
                         <polyline points="12,6 12,12 16,14" stroke="#6B7280" stroke-width="2"/>
                       </svg>
                       <span style="font-size: 11px; color: #6B7280;">${spot.openHours}</span>
                     </div>`
                }
                
                ${
                  spot.contactInfo
                    ? `<div style="display: flex; align-items: center;">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="margin-right: 6px;">
                         <path d="M22 16.92V19.92C22 20.92 21.11 21.81 20.11 21.81C9.44 21.81 1 13.37 1 2.69C1 1.69 1.89 0.8 2.89 0.8H5.89C6.89 0.8 7.78 1.69 7.78 2.69V5.69C7.78 6.69 6.89 7.58 5.89 7.58H4.89L4.22 8.25C5.28 10.84 7.17 12.73 9.76 13.79L10.43 13.12H11.43C12.43 13.12 13.32 14.01 13.32 15.01V18.01C13.32 19.01 12.43 19.9 11.43 19.9H8.43" stroke="#3B82F6" stroke-width="1.5"/>
                       </svg>
                       <a href="tel:${spot.contactInfo}" style="font-size: 11px; color: #3B82F6; text-decoration: none;">${spot.contactInfo}</a>
                     </div>`
                    : ""
                }
              </div>
            </div>
          `,
          pixelOffset: new google.maps.Size(0, -10),
        });

        marker.addListener("click", () => {
          // Close any open info windows
          markersRef.current.forEach((m) => {
            const markerWithInfo = m as google.maps.Marker & {
              infoWindow?: google.maps.InfoWindow;
            };
            if (markerWithInfo.infoWindow) {
              markerWithInfo.infoWindow.close();
            }
          });

          // Store reference and open new one
          const markerWithInfo = marker as google.maps.Marker & {
            infoWindow?: google.maps.InfoWindow;
          };
          markerWithInfo.infoWindow = infoWindow;
          infoWindow.open(map, marker);
        });
      }
    });
  }, [map, safeSpots]);

  // Update route polyline
  useEffect(() => {
    if (!map || !selectedRoute) {
      // Clear markers when no route
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
        startMarkerRef.current = null;
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
        destinationMarkerRef.current = null;
      }
      // Close drawer when no route
      setIsDrawerOpen(false);
      setUserClosedDrawer(false); // Reset when no routes
      return;
    }

    // Clear existing route polylines
    polylinesRef.current.forEach((polyline) => {
      if (polyline) {
        polyline.setMap(null);
      }
    });
    polylinesRef.current = [];

    // Clear existing start/destination markers
    if (startMarkerRef.current) {
      startMarkerRef.current.setMap(null);
    }
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setMap(null);
    }

    // Add new safety-colored route segments
    const polylines = googleMapsService.addSafetyColoredRoute(selectedRoute);
    polylinesRef.current = polylines;

    // Add start marker (first waypoint)
    if (selectedRoute.waypoints.length > 0) {
      const startPoint = selectedRoute.waypoints[0];
      startMarkerRef.current = new google.maps.Marker({
        position: { lat: startPoint.lat, lng: startPoint.lng },
        map: map,
        icon: createLocationIcon("start"),
        title: "Starting Point - Samvidhan Sadan",
        zIndex: 1000, // High z-index to appear above other markers
      });

      // Add info window for start marker
      const startInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 8px; height: 8px; background: #10B981; border-radius: 50%; margin-right: 8px;"></div>
              <strong style="color: #1F2937; font-size: 14px;">Starting Point</strong>
            </div>
            <p style="margin: 0; color: #6B7280; font-size: 12px; line-height: 1.4;">
              Samvidhan Sadan<br>
              <span style="color: #9CA3AF;">Sansad Marg, New Delhi</span>
            </p>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -10),
      });

      startMarkerRef.current.addListener("click", () => {
        startInfoWindow.open(map, startMarkerRef.current);
      });
    }

    // Add destination marker (last waypoint)
    if (selectedRoute.waypoints.length > 1) {
      const endPoint =
        selectedRoute.waypoints[selectedRoute.waypoints.length - 1];
      destinationMarkerRef.current = new google.maps.Marker({
        position: { lat: endPoint.lat, lng: endPoint.lng },
        map: map,
        icon: createLocationIcon("destination"),
        title: "Destination",
        zIndex: 1000, // High z-index to appear above other markers
      });

      // Add info window for destination marker
      const destInfoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 8px; height: 8px; background: #EF4444; border-radius: 50%; margin-right: 8px;"></div>
              <strong style="color: #1F2937; font-size: 14px;">Destination</strong>
            </div>
            <p style="margin: 0; color: #6B7280; font-size: 12px; line-height: 1.4;">
              Your selected destination
            </p>
          </div>
        `,
        pixelOffset: new google.maps.Size(0, -10),
      });

      destinationMarkerRef.current.addListener("click", () => {
        destInfoWindow.open(map, destinationMarkerRef.current);
      });
    }

    // Fit map to show entire route
    if (selectedRoute.waypoints.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      selectedRoute.waypoints.forEach((point: Location) => {
        bounds.extend(new google.maps.LatLng(point.lat, point.lng));
      });
      map.fitBounds(bounds, 50);
    }

    return () => {
      polylinesRef.current.forEach((polyline) => {
        if (polyline) {
          polyline.setMap(null);
        }
      });
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
      }
    };
  }, [map, selectedRoute]);

  // Reset drawer state when navigation ends
  useEffect(() => {
    if (!walkSession) {
      setUserClosedDrawer(false);
      // Clear walking animation and marker when navigation ends
      if (walkingAnimationRef.current) {
        cancelAnimationFrame(walkingAnimationRef.current);
      }
      if (walkerMarkerRef.current) {
        walkerMarkerRef.current.setMap(null);
      }
    }
  }, [walkSession]);

  // Start walking simulation when navigation begins
  useEffect(() => {
    if (walkSession && walkSession.route && map) {
      startWalkingSimulation(walkSession.route);
    }
  }, [walkSession, map, startWalkingSimulation]);

  // Open drawer when routes are available (only if not already closed by user and not in navigation)
  useEffect(() => {
    if (routes && routes.length > 0 && !userClosedDrawer && !walkSession) {
      setIsDrawerOpen(true);
    }
  }, [routes, userClosedDrawer, walkSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup animation
      if (walkingAnimationRef.current) {
        cancelAnimationFrame(walkingAnimationRef.current);
      }
      // Cleanup markers
      if (walkerMarkerRef.current) {
        walkerMarkerRef.current.setMap(null);
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.setMap(null);
      }
      if (destinationMarkerRef.current) {
        destinationMarkerRef.current.setMap(null);
      }
      // Cleanup polylines
      polylinesRef.current.forEach((polyline) => {
        if (polyline) {
          polyline.setMap(null);
        }
      });
    };
  }, []);

  if (error) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100`}
      >
        <div className="text-center p-6">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-gray-800 font-medium">Map Error</p>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />

      {/* Safety Legend - shows when route is displayed */}
      {selectedRoute && (
        <div className="absolute top-24 right-4 bg-white rounded-lg shadow-lg p-3 z-10 border border-gray-200">
          <h4 className="text-xs font-semibold text-gray-900 mb-2">
            Safety Levels
          </h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SAFETY_COLORS.HIGH }}
              ></div>
              <span className="text-xs text-gray-700">High (80%+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SAFETY_COLORS.MEDIUM }}
              ></div>
              <span className="text-xs text-gray-700">Medium (40-80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SAFETY_COLORS.LOW }}
              ></div>
              <span className="text-xs text-gray-700">Low (&lt;40%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Route Bottom Drawer - Hide when navigation is active */}
      {!walkSession && (
        <RouteBottomDrawer
          routes={routes || null}
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setUserClosedDrawer(true);
          }}
          onRouteSelect={onRouteSelect}
        />
      )}
    </div>
  );
}
