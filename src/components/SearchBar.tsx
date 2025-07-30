"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Clock, X } from "lucide-react";
import UserProfileDropdown from "./UserProfileDropdown";
import { Location } from "@/types";
import { googleMapsService } from "@/services/googleMaps";

interface SearchBarProps {
  onDestinationSelect: (location: Location & { address: string }) => void;
  onClear?: () => void; // Optional callback when search is cleared
  placeholder?: string;
  currentLocation?: Location;
  disabled?: boolean;
}

interface SearchResult {
  place_id: string;
  description: string;
  location?: Location;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

export default function SearchBar({
  onDestinationSelect,
  onClear,
  placeholder = "Search for a place",
  currentLocation,
  disabled = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("midnight-mile-recent-searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // Ignore invalid JSON
      }
    }
  }, []);

  // Autocomplete function using Google Places API
  const getAutocompleteSuggestions = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const predictions = await googleMapsService.getAutocompleteSuggestions(
          searchQuery,
          currentLocation
        );

        const searchResults: SearchResult[] = predictions.map((prediction) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: prediction.structured_formatting,
          location: undefined, // Will be fetched when selected
        }));

        setResults(searchResults);
      } catch (error) {
        console.error("Autocomplete error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentLocation]
  );

  // Debounced autocomplete search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        getAutocompleteSuggestions(query);
      } else {
        setResults([]);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, getAutocompleteSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);

    if (!value.trim()) {
      setResults([]);
    }
  };

  // Handle result selection
  const handleResultSelect = async (result: SearchResult) => {
    setQuery(result.description);
    setShowResults(false);
    setIsLoading(true);

    try {
      let location = result.location;

      // If no location (autocomplete prediction), get place details
      if (!location && result.place_id) {
        const placeDetails = await googleMapsService.getPlaceDetails(
          result.place_id
        );
        if (placeDetails?.geometry?.location) {
          location = {
            lat: placeDetails.geometry.location.lat(),
            lng: placeDetails.geometry.location.lng(),
          };
        }
      }

      if (location) {
        // Save to recent searches
        const newRecent = [
          result.description,
          ...recentSearches.filter((s) => s !== result.description),
        ].slice(0, 2);
        setRecentSearches(newRecent);
        localStorage.setItem(
          "midnight-mile-recent-searches",
          JSON.stringify(newRecent)
        );

        onDestinationSelect({
          ...location,
          address: result.description,
        });
      } else {
        console.error("No location found for selected place");
      }
    } catch (error) {
      console.error("Error getting place details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle recent search selection
  const handleRecentSelect = async (address: string) => {
    setQuery(address);
    setShowResults(false);
    setIsLoading(true);

    try {
      // Search for the address using Google Places API
      if (currentLocation) {
        const places = await googleMapsService.searchPlaces(
          address,
          currentLocation
        );

        if (places && places.length > 0) {
          const place = places[0]; // Use the first/best match
          if (place.geometry?.location) {
            const location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            // Call the destination select handler
            onDestinationSelect({
              ...location,
              address: place.formatted_address || address,
            });
          } else {
            console.error("No location found for place:", address);
          }
        } else {
          console.error("No places found for address:", address);
        }
      } else {
        console.error("Current location not available for search");
      }
    } catch (error) {
      console.error("Error searching for recent location:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
    // Call onClear callback if provided
    onClear?.();
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        target &&
        !containerRef.current.contains(target) &&
        showResults
      ) {
        setShowResults(false);
      }
    };

    // Listen for both mouse and touch events for better mobile support
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showResults]);

  return (
    <div ref={containerRef} className="relative w-full py-2">
      {/* Enhanced Google Maps style search bar */}
      <div
        className="flex items-center bg-white rounded-xl shadow-lg border border-midnight-beige overflow-hidden hover:shadow-xl transition-all duration-300 mx-auto"
        style={{ width: "420px", maxWidth: "90vw" }}
      >
        {/* Search input section */}
        <div className="flex-1 flex items-center py-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setShowResults(true)}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 px-8 py-3 text-base text-midnight-navy placeholder-midnight-slate bg-transparent border-none outline-none focus:ring-0 disabled:opacity-50"
          />
        </div>

        {/* Action buttons section */}
        <div className="flex items-center">
          {/* Clear button */}
          {query && (
            <button
              onClick={handleClear}
              className="p-2 hover:bg-midnight-beige/50 rounded-full transition-colors mx-1"
            >
              <X className="h-4 w-4 text-midnight-slate" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced loading indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-midnight-beige rounded-xl shadow-xl p-3 z-30 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-midnight-beige border-t-midnight-teal"></div>
            </div>
            <span className="text-sm text-midnight-slate font-medium">
              Searching for places...
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Search Results */}
      {showResults && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-midnight-beige rounded-xl shadow-2xl max-h-80 overflow-hidden z-30 backdrop-blur-sm animate-slide-in">
          <div className="overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-midnight-slate/30 scrollbar-track-midnight-beige/30">
            {/* Current search results */}
            {results.length > 0 && (
              <div>
                {results.map((result, index) => (
                  <button
                    key={`${result.place_id}-${index}`}
                    onClick={() => handleResultSelect(result)}
                    className="w-full text-left px-6 py-4 hover:bg-gradient-to-r hover:from-midnight-teal/10 hover:to-midnight-beige/30 flex items-center space-x-4 border-b border-midnight-beige/50 last:border-b-0 transition-all duration-200 group"
                  >
                    <div className="p-2 rounded-full bg-midnight-beige/50 group-hover:bg-midnight-teal/20 transition-colors">
                      <MapPin className="h-4 w-4 text-midnight-slate group-hover:text-midnight-teal transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-midnight-navy truncate group-hover:text-midnight-teal transition-colors">
                        {result.structured_formatting?.main_text ||
                          result.description.split(",")[0] ||
                          result.description}
                      </p>
                      <p className="text-xs text-midnight-slate mt-0.5 truncate">
                        {result.structured_formatting?.secondary_text ||
                          result.description
                            .split(",")
                            .slice(1)
                            .join(",")
                            .trim() ||
                          "Tap to get directions"}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-2 h-2 rounded-full bg-midnight-teal"></div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent searches */}
            {query.length === 0 && recentSearches.length > 0 && (
              <div>
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Recent
                    </span>
                  </div>
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSelect(search)}
                    className="w-full text-left px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-midnight-beige/20 flex items-center space-x-4 border-b border-gray-50 last:border-b-0 transition-all duration-200 group"
                  >
                    <div className="p-2 rounded-full bg-gray-100 group-hover:bg-midnight-teal/10 transition-colors">
                      <Clock className="h-4 w-4 text-gray-400 group-hover:text-midnight-teal transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate group-hover:text-midnight-teal transition-colors">
                        {search}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Recent search
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {query.length > 0 && results.length === 0 && !isLoading && (
              <div className="px-6 py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  No places found
                </p>
                <p className="text-xs text-gray-500">
                  Try a different search term
                </p>
              </div>
            )}

            {/* Empty state with suggestions */}
            {query.length === 0 && recentSearches.length === 0 && (
              <div className="px-6 py-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-midnight-teal/10 to-midnight-beige/30 flex items-center justify-center">
                  <Search className="h-8 w-8 text-midnight-teal" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Where would you like to go?
                </h3>
                <p className="text-xs text-gray-500 mb-4 max-w-xs mx-auto">
                  Search for addresses, businesses, or landmarks to get safe
                  directions
                </p>
                <div className="flex justify-center space-x-6 text-xs">
                  <div className="flex items-center space-x-1 text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                    <span>Safe routes</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-400">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    <span>Real-time guidance</span>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Notice - Always shown at bottom of dropdown */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-600 text-center">
                🌍 Midnight Mile is currently only available in Delhi
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
