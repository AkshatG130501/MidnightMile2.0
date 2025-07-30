"use client";

import { useState } from "react";
import { X, Mail, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          onSuccess();
          onClose();
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          setError("Please check your email to confirm your account.");
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google") => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;

      // The redirect should happen automatically, so we don't need to do anything else here
      console.log("OAuth initiated:", data);
    } catch (error) {
      console.error("OAuth error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred during authentication"
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-midnight-navy to-midnight-slate rounded-2xl shadow-2xl w-full max-w-md border border-midnight-slate">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-midnight-slate">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-midnight-teal to-midnight-amber bg-clip-text text-transparent">
            {isLogin ? "Welcome Back" : "Join Midnight Mile"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-midnight-slate rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-midnight-beige" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* OAuth Buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuthLogin("google")}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-white hover:bg-midnight-beige border border-gray-300 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail className="h-5 w-5 text-gray-600" />
              <span className="text-gray-700 font-medium">
                {loading ? "Redirecting to Google..." : "Continue with Google"}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-midnight-slate"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-midnight-navy text-midnight-beige">
                Or continue with email
              </span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-midnight-beige mb-1"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={!isLogin}
                  className="w-full px-4 py-3 bg-midnight-slate border border-midnight-slate rounded-xl text-white placeholder-midnight-beige/60 focus:ring-2 focus:ring-midnight-teal focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-midnight-beige mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-midnight-slate border border-midnight-slate rounded-xl text-white placeholder-midnight-beige/60 focus:ring-2 focus:ring-midnight-teal focus:border-transparent transition-all"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-midnight-beige mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-midnight-slate border border-midnight-slate rounded-xl text-white placeholder-midnight-beige/60 focus:ring-2 focus:ring-midnight-teal focus:border-transparent transition-all pr-12"
                  placeholder="Enter your password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-midnight-beige hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-midnight-coral/20 border border-midnight-coral rounded-xl">
                <p className="text-midnight-coral text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-midnight-teal to-midnight-amber text-white rounded-xl font-semibold hover:from-midnight-teal/80 hover:to-midnight-amber/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Toggle between login/signup */}
          <div className="mt-6 text-center">
            <p className="text-midnight-beige">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setEmail("");
                  setPassword("");
                  setName("");
                }}
                className="ml-1 text-midnight-teal hover:text-midnight-amber font-medium transition-colors"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
