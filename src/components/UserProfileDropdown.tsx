"use client";

import { useState, useRef, useEffect } from "react";
import { User, LogOut, Settings, MapPin, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function UserProfileDropdown() {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!user) return null;

  const userInitials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
    : user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mt-4 mr-1 w-12 h-12 bg-gradient-to-r from-midnight-navy to-midnight-teal text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {userInitials}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-midnight-beige py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-midnight-beige">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-midnight-navy to-midnight-teal text-white rounded-full flex items-center justify-center font-semibold text-sm">
                {userInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-midnight-navy truncate">
                  {user.user_metadata?.full_name || "User"}
                </p>
                <p className="text-xs text-midnight-slate truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
      

            <button
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-midnight-slate hover:bg-midnight-beige/30 transition-colors"
              onClick={() => (window.location.href = "/trusted-contacts")}
            >
              <Users className="h-4 w-4 text-midnight-teal" />
              <span>Trusted Contacts</span>
            </button>

           

            
          </div>

          {/* Sign Out */}
          <div className="border-t border-midnight-beige pt-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-black hover:bg-midnight-coral/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
