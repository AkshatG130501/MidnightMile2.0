"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Clock, X, Navigation, TrendingUp } from "lucide-react";
import { Location } from "@/types";
import { googleMapsService } from "@/services/googleMaps";

interface SearchBarProps {
  onDestinationSelect: (location: Location & { address: string }) => void;
  placeholder?: string;
  currentLocation?: Location;
  disabled?: boolean;
}

interface SearchResult {
  place_id: string;
  description: string;
  location?: Location;
}

export default function SearchBar({
  onDestinationSelect,
  placeholder = "Where are you going?",
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

  // Search function
  const searchPlaces = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || !currentLocation) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const places = await googleMapsService.searchPlaces(
          searchQuery,
          currentLocation
        );
        const searchResults: SearchResult[] = places.map((place) => ({
          place_id: place.place_id || "",
          description: place.formatted_address || place.name || "",
          location: place.geometry?.location
            ? {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
              }
            : undefined,
        }));
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentLocation]
  );

  // Simple debounce for search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchPlaces(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchPlaces]);

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
  const handleResultSelect = (result: SearchResult) => {
    if (result.location) {
      setQuery(result.description);
      setShowResults(false);

      // Save to recent searches
      const newRecent = [
        result.description,
        ...recentSearches.filter((s) => s !== result.description),
      ].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem(
        "midnight-mile-recent-searches",
        JSON.stringify(newRecent)
      );

      onDestinationSelect({
        ...result.location,
        address: result.description,
      });
    }
  };

  // Handle recent search selection
  const handleRecentSelect = (address: string) => {
    setQuery(address);
    setShowResults(false);
    // For recent searches, we'll need to geocode the address
    searchPlaces(address);
  };

  // Clear search
  const handleClear = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-lg mx-auto">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className={`h-5 w-5 transition-colors duration-200 ${
            showResults ? 'text-[#3D828B]' : 'text-gray-400'
          }`} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            block w-full pl-12 pr-12 py-4 text-base font-medium
            bg-white border-2 border-gray-200 rounded-xl
            placeholder-gray-400 text-[#0C1E3C]
            focus:outline-none focus:ring-0 focus:border-[#3D828B]
            disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400
            shadow-sm hover:shadow-md focus:shadow-lg
            transition-all duration-200 ease-in-out
            ${showResults ? 'border-[#3D828B] shadow-lg' : ''}
          `}
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-4 flex items-center group"
          >
            <div className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </div>
          </button>
        )}
        
        {/* Search input glow effect */}
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-[#3D828B]/10 to-[#F5EDE0]/10 opacity-0 transition-opacity duration-200 pointer-events-none ${
          showResults ? 'opacity-100' : ''
        }`} />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4 z-50">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#3D828B]/30 border-t-[#3D828B]"></div>
            </div>
            <span className="text-sm font-medium text-[#0C1E3C]">Searching nearby places...</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {showResults && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
          <div className="overflow-y-auto max-h-96 custom-scrollbar">{/* Current search results */}
          {/* Current search results */}
          {results.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                Search Results
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.place_id}-${index}`}
                  onClick={() => handleResultSelect(result)}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 flex items-start space-x-3 border-b last:border-b-0"
                >
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Recent searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleRecentSelect(search)}
                  className="w-full text-left px-3 py-3 hover:bg-gray-50 flex items-start space-x-3 border-b last:border-b-0"
                >
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{search}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {query.length > 0 && results.length === 0 && !isLoading && (
            <div className="px-3 py-8 text-center">
              <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No places found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            </div>
          )}

          {/* Empty state */}
          {query.length === 0 && recentSearches.length === 0 && (
            <div className="px-3 py-8 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                Search for your destination
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Enter an address, business, or landmark
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
