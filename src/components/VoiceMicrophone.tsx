// Voice Assistant Microphone Component for Midnight Mile
"use client";

import React, { useState, useEffect, useRef, useImperativeHandle } from "react";
import { Mic } from "lucide-react";
import {
  VoiceAssistantService,
  VoiceAssistantConfig,
  ConversationContext,
} from "@/services/voiceAssistant";

interface VoiceMicrophoneProps {
  className?: string;
  onListeningStateChange?: (isListening: boolean) => void;
  context?: ConversationContext;
  ref?: React.Ref<VoiceMicrophoneHandle>;
}

// Expose methods that parent components can call
export interface VoiceMicrophoneHandle {
  announceNavigation: (message: string) => Promise<void>;
}

const VoiceMicrophone = React.forwardRef<
  VoiceMicrophoneHandle,
  VoiceMicrophoneProps
>(({ className = "", onListeningStateChange, context = {} }, ref) => {
  const [isListening, setIsListening] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voiceAssistantRef = useRef<VoiceAssistantService | null>(null);

  // Expose methods to parent components
  useImperativeHandle(
    ref,
    () => ({
      announceNavigation: async (message: string) => {
        if (voiceAssistantRef.current && isInitialized) {
          try {
            // Use the voice assistant's navigation announcement method
            await voiceAssistantRef.current.announceNavigation(message);
          } catch (error) {
            console.error("Failed to announce navigation:", error);
            // Fallback to browser speech synthesis
            if ("speechSynthesis" in window) {
              const utterance = new SpeechSynthesisUtterance(message);
              utterance.rate = 0.9;
              utterance.volume = 0.8;
              window.speechSynthesis.speak(utterance);
            }
          }
        }
      },
    }),
    [isInitialized]
  );

  // Initialize voice assistant service
  useEffect(() => {
    const initializeVoiceAssistant = async () => {
      try {
        // Get API keys from environment variables
        const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY;
        const geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        console.log("API Keys check:", {
          elevenLabs: elevenLabsApiKey ? "Set" : "Missing",
          gemini: geminiApiKey ? "Set" : "Missing",
        });

        // Check if API keys are properly configured (not placeholder values)
        const isElevenLabsValid =
          elevenLabsApiKey &&
          !elevenLabsApiKey.includes("your_") &&
          elevenLabsApiKey.length > 10;
        const isGeminiValid =
          geminiApiKey &&
          !geminiApiKey.includes("your_") &&
          geminiApiKey.length > 10;

        if (!isElevenLabsValid || !isGeminiValid) {
          console.log("API keys invalid or missing");
          setError("Voice assistant requires valid API keys");
          setIsInitialized(false);
          return;
        }

        const config: VoiceAssistantConfig = {
          elevenLabsApiKey,
          geminiApiKey,
          voiceId:
            process.env.NEXT_PUBLIC_ELEVEN_LABS_VOICE_ID ||
            "pNInz6obpgDQGcFmaJgB",
          language: "en-US",
        };

        voiceAssistantRef.current = new VoiceAssistantService(config);

        const initialized = await voiceAssistantRef.current.initialize();
        if (initialized) {
          setIsInitialized(true);
          setIsListening(true); // Voice assistant auto-starts listening
          setError(null);
          console.log("Voice assistant initialized and listening");
        } else {
          setError("Microphone access denied");
          setIsInitialized(false);
        }
      } catch (error) {
        console.error("Failed to initialize voice assistant:", error);
        setError("Failed to initialize voice assistant");
        setIsInitialized(false);
      }
    };

    initializeVoiceAssistant();

    return () => {
      if (voiceAssistantRef.current) {
        voiceAssistantRef.current.cleanup();
      }
    };
  }, []);

  // Update context when it changes
  useEffect(() => {
    if (voiceAssistantRef.current && context) {
      voiceAssistantRef.current.updateContext(context);
    }
  }, [context]);

  // Periodic health check to ensure voice assistant is still listening
  useEffect(() => {
    if (!isInitialized || !voiceAssistantRef.current) return;

    const healthCheck = setInterval(() => {
      if (voiceAssistantRef.current) {
        const isCurrentlyListening =
          voiceAssistantRef.current.getListeningState();
        if (isCurrentlyListening !== isListening) {
          console.log(
            `Voice assistant state mismatch. Expected: ${isListening}, Actual: ${isCurrentlyListening}`
          );
          setIsListening(isCurrentlyListening);
          onListeningStateChange?.(isCurrentlyListening);
        }
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(healthCheck);
  }, [isInitialized, isListening, onListeningStateChange]);

  // Handle microphone button click - now just shows status or restarts if needed
  const handleMicrophoneClick = async () => {
    if (!voiceAssistantRef.current || !isInitialized) {
      setError("Voice assistant not ready");
      return;
    }

    // Always try to restart listening when clicked
    try {
      console.log("Manual restart requested");
      await voiceAssistantRef.current.forceRestartListening();
      setIsListening(true);
      setError(null);
      onListeningStateChange?.(true);
    } catch (error) {
      console.error("Failed to restart listening:", error);
      setError("Failed to restart listening");
    }
  };

  // Clear error after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className={`flex flex-col items-center space-y-2 ${className}`}>
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      {/* Microphone Button */}
      <button
        onClick={handleMicrophoneClick}
        disabled={!isInitialized}
        className={`
          relative w-14 h-14 rounded-full shadow-lg transition-all duration-300 transform
          ${
            !isInitialized
              ? "bg-gray-400 cursor-not-allowed"
              : isListening
              ? "bg-green-500 hover:bg-green-600 scale-105"
              : "bg-orange-500 hover:bg-orange-600 hover:scale-105"
          }
        `}
        title={
          !isInitialized
            ? "Voice assistant not ready"
            : isListening
            ? "Voice assistant is listening - Click to restart if needed"
            : "Voice assistant stopped - Click to restart"
        }
        aria-label="Voice assistant status"
      >
        {/* Pulsing animation when listening */}
        {isListening && (
          <div className="absolute inset-0 rounded-full bg-green-400 animate-pulse opacity-60"></div>
        )}

        {/* Microphone Icon */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <Mic className="w-6 h-6 text-white" />
        </div>

        {/* Status indicator */}
        <div
          className={`
          absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
          ${
            isListening
              ? "bg-green-500 animate-pulse"
              : isInitialized
              ? "bg-orange-500"
              : "bg-gray-400"
          }
        `}
        ></div>
      </button>

      {/* Status text */}
      <div className="text-center">
        <p className="text-xs font-medium text-[#0C1E3C]">
          {isListening
            ? "Always Listening"
            : isInitialized
            ? "Voice Assistant"
            : error
            ? "Not Configured"
            : "Initializing..."}
        </p>
        {isListening && (
          <p className="text-xs text-gray-600 mt-1">Speak anytime</p>
        )}
        {!isInitialized && !isListening && (
          <p className="text-xs text-gray-500 mt-1">
            {error ? "Setup required" : "Loading..."}
          </p>
        )}
      </div>

      {/* Voice level indicator when listening */}
      {isListening && (
        <div className="flex space-x-1 justify-center">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`
                w-1 bg-[#3D828B] rounded-full animate-pulse
                ${
                  i === 0 || i === 4
                    ? "h-2"
                    : i === 1 || i === 3
                    ? "h-3"
                    : "h-4"
                }
              `}
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

VoiceMicrophone.displayName = "VoiceMicrophone";

export default VoiceMicrophone;
