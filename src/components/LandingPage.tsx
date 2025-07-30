"use client";

import { useState } from "react";
import {
  MapPin,
  Shield,
  Users,
  Clock,
  Star,
  ArrowRight,
  Navigation,
  Phone,
  Heart,
  Zap,
} from "lucide-react";
import AuthModal from "./AuthModal";

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  const features = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "AI-Powered Safety",
      description:
        "Advanced algorithms analyze real-time data to suggest the safest walking routes.",
    },
    {
      icon: <Navigation className="h-8 w-8" />,
      title: "Smart Navigation",
      description:
        "Turn-by-turn directions with safety indicators and nearby safe spots.",
    },
    {
      icon: <Phone className="h-8 w-8" />,
      title: "Emergency SOS",
      description:
        "One-tap emergency alerts to your trusted contacts and local authorities.",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Trusted Network",
      description:
        "Connect with friends and family to share your location and walking status.",
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Auto Check-ins",
      description:
        "Automatic safety check-ins during your walk for peace of mind.",
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Voice Companion",
      description:
        "AI voice companion to keep you company during late-night walks.",
    },
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "College Student",
      content:
        "Midnight Mile has completely changed how I feel about walking alone at night. The AI companion feature is amazing!",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b1c0?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Marcus Johnson",
      role: "Night Shift Worker",
      content:
        "The safety scoring for routes is incredibly accurate. I always know which path is safest to take home.",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "Priya Patel",
      role: "Healthcare Worker",
      content:
        "As someone who works late shifts, this app gives me and my family peace of mind. The check-in feature is perfect.",
      rating: 5,
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    },
  ];

  const stats = [
    { number: "50K+", label: "Safe Walks Completed" },
    { number: "99.9%", label: "Safety Success Rate" },
    { number: "24/7", label: "Emergency Support" },
    { number: "100+", label: "Cities Covered" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight-navy via-midnight-slate to-midnight-navy">
      {/* Header */}
      <header className="relative z-50">
        <nav className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-midnight-teal to-midnight-amber rounded-xl flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-midnight-teal to-midnight-amber bg-clip-text text-transparent">
                Midnight Mile
              </span>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-2 bg-gradient-to-r from-midnight-teal to-midnight-amber text-white rounded-full font-medium hover:from-midnight-teal/80 hover:to-midnight-amber/80 transition-all duration-200 shadow-lg hover:shadow-midnight-teal/25"
            >
              Sign In
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-midnight-teal/20 to-midnight-amber/20"></div>
        <div className="container mx-auto px-6 py-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-midnight-teal via-midnight-amber to-midnight-teal bg-clip-text text-transparent">
                Walk Safe,
              </span>
              <br />
              <span className="text-white">Walk Confident</span>
            </h1>
            <p className="text-xl md:text-2xl text-midnight-beige mb-12 leading-relaxed">
              Your AI-powered personal safety companion for nighttime walks. Get
              the safest routes, real-time assistance, and peace of mind.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-4 bg-gradient-to-r from-midnight-teal to-midnight-amber text-white rounded-full font-semibold text-lg hover:from-midnight-teal/80 hover:to-midnight-amber/80 transition-all duration-200 shadow-2xl hover:shadow-midnight-teal/50 flex items-center justify-center space-x-2"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              <button className="px-8 py-4 border-2 border-midnight-teal text-midnight-teal rounded-full font-semibold text-lg hover:bg-midnight-teal hover:text-white transition-all duration-200">
                Watch Demo
              </button>
            </div>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-midnight-teal/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-midnight-amber/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-midnight-teal to-midnight-amber bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-midnight-beige font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Cutting-Edge Safety Features
            </h2>
            <p className="text-xl text-midnight-beige max-w-3xl mx-auto">
              Every feature is designed with your safety and peace of mind in
              focus, powered by advanced AI and real-time data.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 bg-gradient-to-br from-midnight-navy/50 to-midnight-slate/50 rounded-2xl border border-midnight-slate hover:border-midnight-teal/50 transition-all duration-300 hover:transform hover:scale-105 backdrop-blur-sm"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-midnight-teal to-midnight-amber rounded-2xl flex items-center justify-center mb-6 text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-midnight-beige leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-gradient-to-r from-midnight-teal/20 to-midnight-amber/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-midnight-beige max-w-3xl mx-auto">
              Join the community of people who walk with confidence every night.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-midnight-navy/50 rounded-2xl border border-midnight-slate backdrop-blur-sm"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 text-midnight-amber fill-current"
                    />
                  ))}
                </div>
                <p className="text-midnight-beige mb-6 leading-relaxed">
                  &quot;{testimonial.content}&quot;
                </p>
                <div className="flex items-center space-x-4">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-midnight-beige text-sm">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="bg-gradient-to-r from-midnight-teal to-midnight-amber rounded-3xl p-12 md:p-20 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Walk with Confidence?
            </h2>
            <p className="text-xl text-midnight-beige mb-10 max-w-2xl mx-auto">
              Join thousands of users who trust Midnight Mile for their safety.
              Start your journey to safer, more confident walks tonight.
            </p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-10 py-4 bg-white text-midnight-teal rounded-full font-bold text-lg hover:bg-midnight-beige transition-all duration-200 shadow-2xl hover:shadow-white/20 flex items-center justify-center space-x-2 mx-auto"
            >
              <span>Start Walking Safe</span>
              <Zap className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-midnight-slate">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-midnight-teal to-midnight-amber rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-midnight-teal to-midnight-amber bg-clip-text text-transparent">
                Midnight Mile
              </span>
            </div>
            <div className="text-midnight-beige text-center md:text-right">
              <p>&copy; 2025 Midnight Mile. All rights reserved.</p>
              <p className="text-sm mt-1">Walking safe, one step at a time.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={onGetStarted}
        />
      )}
    </div>
  );
}
