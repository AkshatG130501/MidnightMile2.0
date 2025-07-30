/**
 * Z-Index Constants for Midnight Mile App
 *
 * Use these constants to maintain consistent layering throughout the app.
 * Higher numbers appear above lower numbers.
 */

export const Z_INDEX = {
  // Base layers
  MAP: 0, // Google Maps component (base layer)

  // UI Elements
  SEARCH_BAR: 20, // Main search bar
  SEARCH_RESULTS: 30, // Search dropdown results
  NAVIGATION_PANEL: 30, // Bottom navigation during active walk

  // User Interface
  PROFILE_BUTTON: 40, // User profile button
  PROFILE_DROPDOWN: 50, // User profile dropdown menu

  // Overlays and Modals
  LOADING_OVERLAY: 50, // Route loading overlay
  ERROR_MESSAGES: 60, // Error notifications
  MODAL: 100, // Authentication and other modals
  TOAST: 1000, // Toast notifications (highest priority)
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;
