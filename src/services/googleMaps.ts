// Google Maps service for Midnight Mile app

import { Loader } from "@googlemaps/js-api-loader";
import { Location, SafeSpot, Route, SafetyScore } from "@/types";
import {
  MAP_CONFIG,
  GOOGLE_PLACE_TYPES,
  SUPPORTED_CITIES,
  SAFETY_THRESHOLDS,
  SAFETY_COLORS,
} from "@/constants";
import { calculateDistance, generateId } from "@/utils";

class GoogleMapsService {
  private loader: Loader;
  private map: google.maps.Map | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private autocompleteService: google.maps.places.AutocompleteService | null =
    null;
  private isInitialized = false;

  constructor() {
    this.loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
      version: "weekly",
      libraries: ["places", "geometry"],
    });
  }

  /**
   * Initialize Google Maps API
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loader.load();
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to load Google Maps API:", error);
      throw new Error("Google Maps API failed to load");
    }
  }

  /**
   * Initialize map instance
   */
  async initializeMap(
    container: HTMLElement,
    center: Location
  ): Promise<google.maps.Map> {
    await this.initialize();

    const mapOptions: google.maps.MapOptions = {
      center,
      zoom: MAP_CONFIG.DEFAULT_ZOOM,
      mapTypeId: MAP_CONFIG.DEFAULT_MAP_TYPE,
      styles: [], // Night mode styles disabled for now due to type issues
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: false,
      scaleControl: false,
      streetViewControl: false,
      rotateControl: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
      minZoom: MAP_CONFIG.MIN_ZOOM,
      maxZoom: MAP_CONFIG.MAX_ZOOM,
      // Enhanced settings for smooth camera tracking
      clickableIcons: false, // Prevent accidental clicks during animation
      restriction: {
        latLngBounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(28.4044, 77.072), // SW corner (Delhi bounds)
          new google.maps.LatLng(28.8836, 77.3462) // NE corner (Delhi bounds)
        ),
        strictBounds: false, // Allow smooth panning outside bounds temporarily
      },
    };

    this.map = new google.maps.Map(container, mapOptions);
    this.directionsService = new google.maps.DirectionsService();
    this.placesService = new google.maps.places.PlacesService(this.map);
    this.autocompleteService = new google.maps.places.AutocompleteService();

    return this.map;
  }

  /**
   * Check if the service is properly initialized
   */
  isServiceReady(): boolean {
    return this.isInitialized && this.placesService !== null;
  }

  /**
   * Get user's current location
   */
  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }

  /**
   * Search for places using Google Places API
   */
  async searchPlaces(
    query: string,
    location: Location
  ): Promise<google.maps.places.PlaceResult[]> {
    await this.initialize();

    return new Promise((resolve, reject) => {
      // Initialize places service if not available
      if (!this.placesService) {
        console.warn(
          "Places service not available, creating temporary service"
        );
        const tempDiv = document.createElement("div");
        const tempMap = new google.maps.Map(tempDiv, {
          center: location,
          zoom: 1,
        });
        this.placesService = new google.maps.places.PlacesService(tempMap);
      }

      const request: google.maps.places.TextSearchRequest = {
        query,
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 10000, // 10km radius
      };

      this.placesService.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  /**
   * Get autocomplete suggestions using Google Places AutocompleteService
   * Restricted to Delhi and San Francisco only
   */
  async getAutocompleteSuggestions(
    input: string,
    location?: Location
  ): Promise<google.maps.places.AutocompletePrediction[]> {
    await this.initialize();

    if (!this.autocompleteService) {
      // Initialize autocomplete service if not already done
      this.autocompleteService = new google.maps.places.AutocompleteService();
    }

    return new Promise((resolve) => {
      if (!input.trim()) {
        resolve([]);
        return;
      }

      // Determine which city bounds to use based on current location
      let cityBounds: google.maps.LatLngBounds;
      let componentRestrictions: google.maps.places.ComponentRestrictions;

      if (location) {
        // Check if current location is in Delhi
        const isInDelhi = this.isLocationInCity(location, "DELHI");
        const isInSF = this.isLocationInCity(location, "SAN_FRANCISCO");

        if (isInDelhi) {
          // Restrict to Delhi bounds
          const delhi = SUPPORTED_CITIES.DELHI.bounds;
          cityBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(delhi.south, delhi.west),
            new google.maps.LatLng(delhi.north, delhi.east)
          );
          componentRestrictions = { country: "in" }; // India
        } else if (isInSF) {
          // Restrict to San Francisco bounds
          const sf = SUPPORTED_CITIES.SAN_FRANCISCO.bounds;
          cityBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(sf.south, sf.west),
            new google.maps.LatLng(sf.north, sf.east)
          );
          componentRestrictions = { country: "us" }; // USA
        } else {
          // Default to Delhi if location is not in supported cities
          const delhi = SUPPORTED_CITIES.DELHI.bounds;
          cityBounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(delhi.south, delhi.west),
            new google.maps.LatLng(delhi.north, delhi.east)
          );
          componentRestrictions = { country: "in" };
        }
      } else {
        // Default to Delhi bounds if no location provided
        const delhi = SUPPORTED_CITIES.DELHI.bounds;
        cityBounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(delhi.south, delhi.west),
          new google.maps.LatLng(delhi.north, delhi.east)
        );
        componentRestrictions = { country: "in" };
      }

      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        types: ["establishment", "geocode"], // Include businesses and addresses
        componentRestrictions, // Restrict by country
        bounds: cityBounds, // Restrict to city bounds
      };

      this.autocompleteService!.getPlacePredictions(
        request,
        (predictions, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            predictions
          ) {
            // Additional filtering to ensure results are within supported cities
            const filteredPredictions = predictions.filter((prediction) => {
              const description = prediction.description.toLowerCase();

              // Check for Delhi-related terms
              const isDelhiResult =
                description.includes("delhi") ||
                description.includes("new delhi") ||
                description.includes("gurgaon") ||
                description.includes("noida") ||
                description.includes("faridabad") ||
                description.includes("ghaziabad") ||
                description.includes("india");

              // Check for San Francisco-related terms
              const isSFResult =
                description.includes("san francisco") ||
                description.includes("sf,") ||
                description.includes("california") ||
                description.includes("ca,") ||
                description.includes("united states") ||
                description.includes("usa");

              return isDelhiResult || isSFResult;
            });

            resolve(filteredPredictions);
          } else if (
            status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
          ) {
            resolve([]);
          } else {
            console.warn(`Autocomplete failed: ${status}`);
            resolve([]); // Return empty array instead of rejecting to avoid breaking the UI
          }
        }
      );
    });
  }

  /**
   * Check if a location is within a supported city bounds
   */
  private isLocationInCity(
    location: Location,
    city: "DELHI" | "SAN_FRANCISCO"
  ): boolean {
    const cityBounds = SUPPORTED_CITIES[city].bounds;
    return (
      location.lat >= cityBounds.south &&
      location.lat <= cityBounds.north &&
      location.lng >= cityBounds.west &&
      location.lng <= cityBounds.east
    );
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(
    placeId: string
  ): Promise<google.maps.places.PlaceResult | null> {
    await this.initialize();

    return new Promise((resolve) => {
      // Initialize places service if not available
      if (!this.placesService) {
        // Create a temporary div for PlacesService if map isn't initialized
        const tempDiv = document.createElement("div");
        const tempMap = new google.maps.Map(tempDiv, {
          center: { lat: 0, lng: 0 },
          zoom: 1,
        });
        this.placesService = new google.maps.places.PlacesService(tempMap);
      }

      const request: google.maps.places.PlaceDetailsRequest = {
        placeId,
        fields: [
          "place_id",
          "name",
          "formatted_address",
          "geometry",
          "types",
          "rating",
          "opening_hours",
        ],
      };

      this.placesService.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          console.warn(`Place details failed: ${status}`);
          resolve(null);
        }
      });
    });
  }

  /**
   * Find nearby safe spots (police stations, hospitals, 24/7 stores)
   */
  async findNearbySafeSpots(
    location: Location,
    radius: number = 5000
  ): Promise<SafeSpot[]> {
    await this.initialize();

    // Ensure places service is initialized
    if (!this.placesService) {
      // Create a temporary div and map for PlacesService if not available
      const tempDiv = document.createElement("div");
      const tempMap = new google.maps.Map(tempDiv, {
        center: location,
        zoom: 1,
      });
      this.placesService = new google.maps.places.PlacesService(tempMap);
    }

    const safeSpots: SafeSpot[] = [];
    const promises: Promise<SafeSpot[]>[] = [];

    // Search for each type of safe spot
    Object.entries(GOOGLE_PLACE_TYPES).forEach(([key, placeType]) => {
      const promise = this.searchNearbyPlaces(location, placeType, radius).then(
        (places) =>
          this.convertToSafeSpots(
            places,
            key.toLowerCase() as "police" | "hospital" | "store",
            location
          )
      );
      promises.push(promise);
    });

    try {
      const results = await Promise.all(promises);
      results.forEach((spots) => safeSpots.push(...spots));

      // Sort by distance and return top 20
      return safeSpots.sort((a, b) => a.distance - b.distance).slice(0, 20);
    } catch (error) {
      console.error("Error finding safe spots:", error);
      return [];
    }
  }

  /**
   * Search nearby places by type
   */
  private async searchNearbyPlaces(
    location: Location,
    type: string,
    radius: number
  ): Promise<google.maps.places.PlaceResult[]> {
    return new Promise((resolve) => {
      // Ensure places service is available
      if (!this.placesService) {
        console.warn(
          "Places service not available, creating temporary service"
        );
        const tempDiv = document.createElement("div");
        const tempMap = new google.maps.Map(tempDiv, {
          center: location,
          zoom: 1,
        });
        this.placesService = new google.maps.places.PlacesService(tempMap);
      }

      const request = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius,
        type: type,
      };

      this.placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          resolve(results);
        } else if (
          status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          resolve([]); // Return empty array for no results
        } else {
          console.warn(`Places search failed for type ${type}:`, status);
          resolve([]); // Return empty array instead of rejecting
        }
      });
    });
  }

  /**
   * Convert Google Places results to SafeSpot objects
   */
  private convertToSafeSpots(
    places: google.maps.places.PlaceResult[],
    type: "police" | "hospital" | "store",
    userLocation: Location
  ): SafeSpot[] {
    return places
      .filter((place) => place.geometry?.location && place.name)
      .map((place) => {
        const location = {
          lat: place.geometry!.location!.lat(),
          lng: place.geometry!.location!.lng(),
        };

        const distance = calculateDistance(userLocation, location);

        return {
          id: place.place_id || generateId(),
          name: place.name!,
          type,
          location,
          isOpen24Hours: this.isOpen24Hours(place),
          distance,
          contactInfo: place.formatted_phone_number,
          openHours: this.formatOpeningHours(place.opening_hours),
        };
      });
  }

  /**
   * Check if a place is open 24 hours
   */
  private isOpen24Hours(place: google.maps.places.PlaceResult): boolean {
    if (!place.opening_hours?.periods) return false;

    return place.opening_hours.periods.some(
      (period) => !period.close && period.open?.time === "0000"
    );
  }

  /**
   * Format opening hours for display
   */
  private formatOpeningHours(
    openingHours?: google.maps.places.PlaceOpeningHours
  ): string {
    if (!openingHours?.weekday_text) return "Hours unknown";

    const today = new Date().getDay();
    const todayIndex = today === 0 ? 6 : today - 1; // Convert Sunday=0 to index 6

    return openingHours.weekday_text[todayIndex] || "Hours unknown";
  }

  /**
   * Calculate multiple route alternatives using Google Directions API
   */
  async calculateRouteAlternatives(
    start: Location,
    end: Location
  ): Promise<Route[]> {
    await this.initialize();

    if (!this.directionsService) {
      throw new Error("Directions service not initialized");
    }

    // Get multiple route alternatives with different preferences
    const routePromises = [
      this.calculateRouteWithPreference(start, end, "safest"),
      this.calculateRouteWithPreference(start, end, "fastest"),
    ];

    try {
      const routes = await Promise.all(routePromises);
      return routes.filter((route): route is Route => route !== null);
    } catch (error) {
      console.error("Error calculating route alternatives:", error);
      // Fallback to basic route calculation
      const basicRoute = await this.calculateSafeRoute(start, end);
      return basicRoute ? [basicRoute] : [];
    }
  }

  /**
   * Calculate route with specific preference
   */
  private async calculateRouteWithPreference(
    start: Location,
    end: Location,
    preference: "safest" | "balanced" | "fastest"
  ): Promise<Route | null> {
    return new Promise((resolve) => {
      let request: google.maps.DirectionsRequest;

      switch (preference) {
        case "safest":
          // Safest route: avoid highways, prefer main roads
          request = {
            origin: new google.maps.LatLng(start.lat, start.lng),
            destination: new google.maps.LatLng(end.lat, end.lng),
            travelMode: google.maps.TravelMode.WALKING,
            provideRouteAlternatives: true,
            avoidHighways: true,
            avoidTolls: true,
            optimizeWaypoints: false,
            unitSystem: google.maps.UnitSystem.METRIC, // Use metric system
            region: "in", // Specify region for better local routing
          };
          break;

        case "fastest":
          // Fastest route: allow all road types, optimize for speed
          request = {
            origin: new google.maps.LatLng(start.lat, start.lng),
            destination: new google.maps.LatLng(end.lat, end.lng),
            travelMode: google.maps.TravelMode.WALKING,
            provideRouteAlternatives: true,
            avoidHighways: false,
            avoidTolls: false,
            optimizeWaypoints: true,
            unitSystem: google.maps.UnitSystem.METRIC, // Use metric system
            region: "in", // Specify region for better local routing
          };
          break;

        case "balanced":
        default:
          // Balanced route: standard settings
          request = {
            origin: new google.maps.LatLng(start.lat, start.lng),
            destination: new google.maps.LatLng(end.lat, end.lng),
            travelMode: google.maps.TravelMode.WALKING,
            provideRouteAlternatives: true,
            avoidHighways: false,
            avoidTolls: true,
            optimizeWaypoints: true,
            region: "in", // Specify region for better local routing
          };
          break;
      }

      this.directionsService!.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          // For multiple alternatives, try to use different routes from the response
          let routeIndex = 0;
          if (result.routes.length > 1) {
            switch (preference) {
              case "safest":
                // Use the longest route (often safer)
                routeIndex = result.routes.reduce(
                  (longestIndex, route, index) => {
                    const currentDistance = route.legs[0]?.distance?.value || 0;
                    const longestDistance =
                      result.routes[longestIndex]?.legs[0]?.distance?.value ||
                      0;
                    return currentDistance > longestDistance
                      ? index
                      : longestIndex;
                  },
                  0
                );
                break;
              case "fastest":
                // Use the shortest route
                routeIndex = result.routes.reduce(
                  (shortestIndex, route, index) => {
                    const currentTime =
                      route.legs[0]?.duration?.value || Infinity;
                    const shortestTime =
                      result.routes[shortestIndex]?.legs[0]?.duration?.value ||
                      Infinity;
                    return currentTime < shortestTime ? index : shortestIndex;
                  },
                  0
                );
                break;
            }
          }

          const route = this.convertDirectionsToRoute(
            result,
            start,
            end,
            routeIndex,
            preference
          );
          resolve(route);
        } else {
          console.warn(
            `Directions request failed for ${preference}: ${status}`
          );
          resolve(null);
        }
      });
    });
  }

  /**
   * Calculate safe route using Google Directions API (legacy method)
   */
  async calculateSafeRoute(
    start: Location,
    end: Location
  ): Promise<Route | null> {
    await this.initialize();

    if (!this.directionsService) {
      throw new Error("Directions service not initialized");
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(start.lat, start.lng),
        destination: new google.maps.LatLng(end.lat, end.lng),
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: true,
        avoidHighways: false,
        avoidTolls: false,
        optimizeWaypoints: true,
      };

      this.directionsService!.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = this.convertDirectionsToRoute(
            result,
            start,
            end,
            0,
            "balanced"
          );
          resolve(route);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  /**
   * Convert Google Directions result to Route object
   */
  private convertDirectionsToRoute(
    directionsResult: google.maps.DirectionsResult,
    start: Location,
    end: Location,
    routeIndex: number = 0,
    routeType: "safest" | "balanced" | "fastest" = "balanced"
  ): Route {
    const primaryRoute =
      directionsResult.routes[routeIndex] || directionsResult.routes[0];
    const leg = primaryRoute.legs[0];

    // Extract ALL waypoints from the route for proper road following
    const waypoints: Location[] = [];

    // Use the detailed path from overview_path for accurate road following
    primaryRoute.overview_path.forEach((point) => {
      waypoints.push({
        lat: point.lat(),
        lng: point.lng(),
      });
    });

    // If overview_path is not detailed enough, extract from steps
    if (waypoints.length < 10 && leg.steps) {
      const detailedWaypoints: Location[] = [];
      leg.steps.forEach((step) => {
        if (step.path) {
          step.path.forEach((point) => {
            detailedWaypoints.push({
              lat: point.lat(),
              lng: point.lng(),
            });
          });
        }
      });

      // Use detailed waypoints if we got more points
      if (detailedWaypoints.length > waypoints.length) {
        waypoints.length = 0; // Clear the array
        waypoints.push(...detailedWaypoints);
      }
    }

    // Calculate safety score based on route type and characteristics
    const safetyScore = this.calculateSafetyScore(primaryRoute, routeType);

    // Generate unique ID based on route characteristics
    const routeId = `${routeType}_${start.lat.toFixed(4)}_${start.lng.toFixed(
      4
    )}_${end.lat.toFixed(4)}_${end.lng.toFixed(4)}_${routeIndex}`;

    return {
      id: routeId,
      start,
      end,
      waypoints,
      safetyScore,
      estimatedTime: leg.duration?.value ? leg.duration.value / 60 : 0, // Convert to minutes
      distance: leg.distance?.value || 0,
      dangerZones: [], // Would be populated with real crime data
      safeSpots: [], // Would be populated with nearby safe spots
    };
  }

  /**
   * Calculate safety score based on route characteristics and type
   */
  private calculateSafetyScore(
    route: google.maps.DirectionsRoute,
    routeType: "safest" | "balanced" | "fastest"
  ) {
    // Base score calculation using mock data with route-specific adjustments
    const hour = new Date().getHours();
    const baseScore = hour >= 6 && hour <= 22 ? 75 : 60; // Higher score during day

    // Analyze route characteristics
    const leg = route.legs[0];
    const distance = leg.distance?.value || 0;
    const duration = leg.duration?.value || 0;

    // Calculate route complexity (more turns = potentially less safe)
    const stepCount = leg.steps?.length || 0;
    const complexityFactor = Math.max(0, 1 - stepCount / 20); // Normalize step count

    // Calculate speed factor (very fast routes might use less safe paths)
    const avgSpeed = distance > 0 ? distance / (duration / 3600) : 0; // m/s to km/h conversion
    const speedFactor = avgSpeed > 5 ? 0.9 : 1.0; // Walking speeds > 5 km/h might indicate shortcuts

    let safetyMultiplier = 1.0;
    let lightingMultiplier = 1.0;
    let trafficMultiplier = 1.0;
    let policeMultiplier = 1.0;
    let crimeMultiplier = 1.0;

    switch (routeType) {
      case "safest":
        // Safest routes: higher safety scores, avoid shortcuts
        safetyMultiplier = 1.2;
        lightingMultiplier = 1.3;
        trafficMultiplier = 1.15;
        policeMultiplier = 1.4;
        crimeMultiplier = 1.25;
        break;

      case "fastest":
        // Fastest routes: potentially less safe, might use shortcuts
        safetyMultiplier = 0.85;
        lightingMultiplier = 0.8;
        trafficMultiplier = 0.9;
        policeMultiplier = 0.7;
        crimeMultiplier = 0.8;
        break;

      case "balanced":
      default:
        // Balanced routes: moderate adjustments
        safetyMultiplier = 1.0;
        lightingMultiplier = 1.0;
        trafficMultiplier = 1.0;
        policeMultiplier = 1.0;
        crimeMultiplier = 1.0;
        break;
    }

    // Apply route characteristics and type multipliers
    const lighting = Math.min(
      95,
      Math.max(
        25,
        (baseScore + Math.random() * 15) *
          lightingMultiplier *
          complexityFactor *
          speedFactor
      )
    );

    const footTraffic = Math.min(
      95,
      Math.max(
        20,
        (baseScore + Math.random() * 25) * trafficMultiplier * complexityFactor
      )
    );

    const policePresence = Math.min(
      95,
      Math.max(
        15,
        (baseScore + Math.random() * 10) * policeMultiplier * complexityFactor
      )
    );

    const crimeData = Math.min(
      95,
      Math.max(
        20,
        (baseScore + Math.random() * 20) * crimeMultiplier * speedFactor
      )
    );

    const overall = Math.min(
      95,
      Math.max(
        25,
        (baseScore + Math.random() * 20) *
          safetyMultiplier *
          complexityFactor *
          speedFactor
      )
    );

    return {
      overall: Math.round(overall * 100) / 100,
      lighting: Math.round(lighting * 100) / 100,
      footTraffic: Math.round(footTraffic * 100) / 100,
      policePresence: Math.round(policePresence * 100) / 100,
      crimeData: Math.round(crimeData * 100) / 100,
    };
  }

  /**
   * Calculate mock safety score for demo purposes
   * In production, this would integrate with real crime data APIs
   */
  private calculateMockSafetyScore() {
    // Mock calculation based on time of day and location density
    const hour = new Date().getHours();
    const baseScore = hour >= 6 && hour <= 22 ? 75 : 60; // Higher score during day

    return {
      overall: baseScore + Math.random() * 20,
      lighting: baseScore + Math.random() * 15,
      footTraffic: baseScore + Math.random() * 25,
      policePresence: baseScore + Math.random() * 10,
      crimeData: baseScore + Math.random() * 20,
    };
  }

  /**
   * Add marker to map
   */
  addMarker(
    location: Location,
    title: string,
    icon?: string | google.maps.Icon
  ): google.maps.Marker | null {
    if (!this.map) return null;

    return new google.maps.Marker({
      position: location,
      map: this.map,
      title,
      icon,
    });
  }

  /**
   * Add route polyline to map
   */
  addRouteToMap(
    route: Route,
    color: string = "#3D828B"
  ): google.maps.Polyline | null {
    if (!this.map) return null;

    return new google.maps.Polyline({
      path: route.waypoints,
      geodesic: true,
      strokeColor: color,
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map: this.map,
    });
  }

  /**
   * Add safety-colored route segments to map
   * Colors different parts of the route based on safety levels
   */
  addSafetyColoredRoute(route: Route): google.maps.Polyline[] {
    if (!this.map || route.waypoints.length < 2) return [];

    const polylines: google.maps.Polyline[] = [];

    // For precise road following, create more segments but with better distribution
    const totalWaypoints = route.waypoints.length;
    const segmentCount = Math.min(
      Math.max(10, Math.floor(totalWaypoints / 50)),
      30
    ); // 10-30 segments based on route length
    const segmentSize = Math.floor(totalWaypoints / segmentCount);

    for (let i = 0; i < segmentCount; i++) {
      const startIndex = i * segmentSize;
      const endIndex =
        i === segmentCount - 1
          ? totalWaypoints - 1
          : Math.min((i + 1) * segmentSize, totalWaypoints - 1);

      // Extract segment waypoints
      const segmentWaypoints = route.waypoints.slice(startIndex, endIndex + 1);

      if (segmentWaypoints.length < 2) continue;

      // Calculate safety score for this segment
      const segmentSafetyScore = this.calculateSegmentSafetyScore(
        segmentWaypoints,
        route.safetyScore,
        i,
        segmentCount
      );

      // Determine color based on safety score
      const color = this.getSafetyColor(segmentSafetyScore);

      // Create polyline for this segment with improved styling
      const polyline = new google.maps.Polyline({
        path: segmentWaypoints,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.85,
        strokeWeight: 5,
        map: this.map,
        zIndex: 1, // Ensure polylines are above base map but below markers
      });

      polylines.push(polyline);
    }

    return polylines;
  }

  /**
   * Calculate safety score for a route segment
   */
  private calculateSegmentSafetyScore(
    segmentWaypoints: Location[],
    routeSafetyScore: SafetyScore,
    segmentIndex: number,
    totalSegments: number
  ): number {
    // Base safety score from route
    const baseSafety = routeSafetyScore.overall;

    // Calculate segment length (longer segments might be on main roads = safer)
    const segmentLength = this.calculateSegmentDistance(segmentWaypoints);
    const lengthFactor = Math.min(segmentLength / 500, 1.5); // Normalize to 500m, cap at 1.5x

    // Add variation based on segment position
    // Start and end segments tend to be safer (near populated areas)
    const normalizedPosition = segmentIndex / Math.max(totalSegments - 1, 1);
    const distanceFromCenter = Math.abs(normalizedPosition - 0.5) * 2; // 0 at center, 1 at edges
    const positionBonus = (1 - distanceFromCenter) * 10; // Up to 10 points bonus for center segments

    // Add some controlled randomness for variation
    const randomVariation = (Math.random() - 0.5) * 15;

    // Combine factors
    const segmentSafety =
      baseSafety +
      lengthFactor * 5 + // Longer segments get small bonus
      positionBonus +
      randomVariation;

    // Ensure score stays within realistic bounds
    return Math.max(20, Math.min(95, segmentSafety));
  }

  /**
   * Calculate distance of a segment in meters
   */
  private calculateSegmentDistance(waypoints: Location[]): number {
    if (waypoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const distance = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(waypoints[i].lat, waypoints[i].lng),
        new google.maps.LatLng(waypoints[i + 1].lat, waypoints[i + 1].lng)
      );
      totalDistance += distance;
    }

    return totalDistance;
  }

  /**
   * Find the nearest safety spot from current location
   */
  async findNearestSafetySpot(
    currentLocation: Location,
    safeSpots: SafeSpot[]
  ): Promise<SafeSpot | null> {
    if (!safeSpots || safeSpots.length === 0) {
      console.log("No safe spots available");
      return null;
    }

    // Find the closest safe spot
    let nearestSpot: SafeSpot | null = null;
    let shortestDistance = Infinity;

    for (const spot of safeSpots) {
      const distance = calculateDistance(currentLocation, spot.location);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestSpot = spot;
      }
    }

    console.log(
      `Nearest safety spot: ${nearestSpot?.name} at ${shortestDistance.toFixed(
        0
      )}m`
    );
    return nearestSpot;
  }

  /**
   * Recalculate route with safety spot as waypoint
   */
  async recalculateRouteWithSafetySpot(
    start: Location,
    safetySpot: Location,
    destination: Location,
    preference: "fastest" | "safest" | "balanced" = "safest"
  ): Promise<Route | null> {
    await this.initialize();

    if (!this.directionsService) {
      throw new Error("Directions service not initialized");
    }

    return new Promise((resolve, reject) => {
      const request: google.maps.DirectionsRequest = {
        origin: new google.maps.LatLng(start.lat, start.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints: [
          {
            location: new google.maps.LatLng(safetySpot.lat, safetySpot.lng),
            stopover: true,
          },
        ],
        travelMode: google.maps.TravelMode.WALKING,
        provideRouteAlternatives: false,
        avoidHighways: preference === "safest",
        avoidTolls: true,
        optimizeWaypoints: false, // Keep the safety spot as the first waypoint
      };

      this.directionsService!.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0];
          const legs = route.legs;

          // Calculate total distance and time
          let totalDistance = 0;
          let totalDuration = 0;

          legs.forEach((leg) => {
            totalDistance += leg.distance?.value || 0;
            totalDuration += leg.duration?.value || 0;
          });

          // Extract waypoints from the route
          const waypoints: Location[] = [];

          // Build detailed waypoints from each step's path to ensure street-level accuracy
          legs.forEach((leg) => {
            leg.steps.forEach((step) => {
              if (step.path && step.path.length) {
                step.path.forEach((pt) => {
                  waypoints.push({
                    lat: pt.lat(),
                    lng: pt.lng(),
                  });
                });
              } else {
                // Fallback: use step end location if path is unavailable
                waypoints.push({
                  lat: step.end_location.lat(),
                  lng: step.end_location.lng(),
                });
              }
            });
          });

          // Calculate safety score for the new route
          const safetyScore = this.calculateSafetyScore(route, preference);

          const processedRoute: Route = {
            id: `${preference}-with-safety-spot-${generateId()}`,
            start,
            end: destination,
            waypoints,
            safetyScore,
            estimatedTime: Math.round(totalDuration / 60), // Convert to minutes
            distance: totalDistance,
            dangerZones: [], // Would be populated with actual danger zone data
            safeSpots: [], // Will be populated by the calling code
          };

          resolve(processedRoute);
        } else {
          reject(new Error(`Route calculation failed: ${status}`));
        }
      });
    });
  }

  /**
   * Get color based on safety score
   */
  private getSafetyColor(safetyScore: number): string {
    if (safetyScore >= SAFETY_THRESHOLDS.HIGH) {
      return SAFETY_COLORS.HIGH; // Green for high safety (80%+)
    } else if (safetyScore >= SAFETY_THRESHOLDS.MEDIUM) {
      return SAFETY_COLORS.MEDIUM; // Yellow/Amber for medium safety (40-80%)
    } else {
      return SAFETY_COLORS.LOW; // Red for low safety (<40%)
    }
  }

  /**
   * Clear all overlays from map
   */
  clearMap(): void {
    // This would clear all markers and polylines
    // Implementation depends on how overlays are tracked
  }

  /**
   * Get map instance
   */
  getMap(): google.maps.Map | null {
    return this.map;
  }
}

export const googleMapsService = new GoogleMapsService();
