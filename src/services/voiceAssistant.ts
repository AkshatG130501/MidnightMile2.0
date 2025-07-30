// Voice Assistant Service for Midnight Mile
// Integrates Web Speech API -> Gemini AI -> ElevenLabs TTS with Voice Queue

import { VoiceQueueService } from "./voiceQueue";

interface VoiceAssistantConfig {
  elevenLabsApiKey: string;
  geminiApiKey: string;
  voiceId?: string;
  language?: string;
}

interface ConversationContext {
  currentLocation?: string;
  destination?: string;
  routeStatus?: string;
  safetyScore?: number;
  walkingState?: "planning" | "walking" | "arrived";
  routeDetails?: {
    distance: number; // in meters
    estimatedTime: number; // in minutes
    dangerZones: number; // count
    safeSpots: number; // count
    routeType: "safest" | "fastest";
  };
  trustedContacts?: Array<{
    name: string;
    phone: string;
    email?: string;
    relationship?: string;
    isPrimary?: boolean;
  }>;
}

interface VoiceCommandCallbacks {
  onNearestSafetySpotRequest?: () => Promise<void>;
  onEmergencyAlertRequest?: () => Promise<void>;
}

// TypeScript definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

// Extend Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

class VoiceAssistantService {
  private config: VoiceAssistantConfig;
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private isProcessing = false; // Track if we're processing a response
  private isRecognitionActive = false; // Track actual recognition state
  private context: ConversationContext = {};
  private callbacks: VoiceCommandCallbacks = {};
  private restartTimeout: NodeJS.Timeout | null = null;
  private safetyCheckTimeout: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private readonly SAFETY_CHECK_INTERVAL = 10000; // 10 seconds
  private voiceQueue: VoiceQueueService;
  private isHandlingSafetySpot = false; // Prevent multiple safety spot requests

  // ElevenLabs URLs
  private elevenLabsBaseUrl = "https://api.elevenlabs.io/v1";
  private geminiBaseUrl =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  constructor(config: VoiceAssistantConfig) {
    this.config = config;
    // Initialize voice queue with same API key and voice ID
    this.voiceQueue = new VoiceQueueService({
      elevenLabsApiKey: config.elevenLabsApiKey,
      voiceId: config.voiceId,
    });
  }

  /**
   * Initialize the voice assistant and check for speech recognition support
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if speech recognition is supported
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        console.error("Speech recognition not supported in this browser");
        return false;
      }

      console.log("Voice assistant initialized successfully");

      // Auto-start listening after initialization
      await this.startListening();

      return true;
    } catch (error) {
      console.error("Failed to initialize voice assistant:", error);
      return false;
    }
  }

  /**
   * Start the speech recognition
   */
  async startListening(): Promise<void> {
    try {
      if (this.isListening) {
        console.log("Already listening, skipping start");
        return; // Already listening
      }

      console.log("Starting voice assistant...");

      this.isListening = true;
      this.lastActivityTime = Date.now(); // Initialize activity time

      if (
        "webkitSpeechRecognition" in window ||
        "SpeechRecognition" in window
      ) {
        const SpeechRecognition =
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => SpeechRecognition;
              SpeechRecognition?: new () => SpeechRecognition;
            }
          ).webkitSpeechRecognition ||
          (
            window as unknown as {
              webkitSpeechRecognition?: new () => SpeechRecognition;
              SpeechRecognition?: new () => SpeechRecognition;
            }
          ).SpeechRecognition;

        if (SpeechRecognition) {
          this.recognition = new SpeechRecognition();
        } else {
          throw new Error("Speech recognition constructor not available");
        }

        if (this.recognition) {
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          this.recognition.lang = "en-US";

          this.recognition.onstart = () => {
            console.log("✅ Speech recognition started successfully");
            this.isRecognitionActive = true;
            // Only start safety check if there isn't one already running
            if (!this.safetyCheckTimeout) {
              this.startSafetyCheck();
            }
          };

          this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            // Only process final results to avoid duplicate processing
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript.trim();
                if (transcript.length > 2 && !this.isProcessing) {
                  console.log("🎤 Final transcript:", transcript);
                  this.processTranscript(transcript);
                }
              }
            }
          };

          this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("❌ Speech recognition error:", event.error);

            // Mark recognition as inactive on certain errors
            if (
              event.error === "not-allowed" ||
              event.error === "audio-capture" ||
              event.error === "service-not-allowed"
            ) {
              this.isRecognitionActive = false;
            }

            if (event.error === "not-allowed") {
              console.log("🚫 Microphone permission denied");
              this.isListening = false;
              this.isRecognitionActive = false;
            } else if (event.error === "network") {
              console.log("🌐 Network error - will restart in 2 seconds");
              this.isRecognitionActive = false;
              // Restart on network errors with longer delay
              setTimeout(() => {
                if (this.isListening && !this.isProcessing) {
                  this.restartListening();
                }
              }, 2000);
            } else if (event.error === "no-speech") {
              // No-speech is normal - don't restart immediately, let onend handle it
              console.log(
                "🔇 No speech detected - this is normal, onend will handle restart"
              );
            } else if (
              event.error === "audio-capture" ||
              event.error === "service-not-allowed"
            ) {
              // Handle microphone issues
              console.error("🎤 Microphone access issue:", event.error);
              this.isListening = false;
              this.isRecognitionActive = false;
            } else if (event.error === "aborted") {
              // Speech recognition was aborted - this can happen during restart
              console.log(
                "⏹️ Speech recognition aborted - likely during restart"
              );
              this.isRecognitionActive = false;
            } else {
              // For other errors, try to restart
              console.log(
                "⚠️ Other speech recognition error, will attempt restart"
              );
              this.isRecognitionActive = false;
              if (this.isListening && !this.isProcessing) {
                setTimeout(() => this.restartListening(), 1000);
              }
            }
          };

          this.recognition.onend = () => {
            console.log(
              "🔚 Speech recognition ended, isListening:",
              this.isListening,
              "isProcessing:",
              this.isProcessing,
              "isRecognitionActive:",
              this.isRecognitionActive,
              "isSpeaking:",
              this.voiceQueue.isSpeaking()
            );
            this.isRecognitionActive = false;

            // Only restart if we're supposed to be listening and not processing
            if (this.isListening && !this.isProcessing) {
              // Use smart restart that waits for speech to complete
              this.smartRestart();
            }
          };

          this.recognition.start();
        }
      } else {
        throw new Error("Speech recognition not supported");
      }
    } catch (error) {
      console.error("Error starting voice assistant:", error);
      this.isListening = false;
    }
  }

  /**
   * Restart listening after a brief delay
   */
  private restartListening(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    this.restartTimeout = setTimeout(() => {
      console.log("🔄 Restart timeout triggered");
      console.log("Current status:", {
        isListening: this.isListening,
        hasRecognition: !!this.recognition,
        isProcessing: this.isProcessing,
        isRecognitionActive: this.isRecognitionActive,
        isSpeaking: this.voiceQueue.isSpeaking(),
      });

      if (
        this.isListening &&
        this.recognition &&
        !this.isProcessing &&
        !this.isRecognitionActive &&
        !this.voiceQueue.isSpeaking() // Don't restart while speaking
      ) {
        try {
          console.log("🔄 Attempting to restart speech recognition...");
          this.recognition.start();
          console.log("✅ Speech recognition restarted successfully");
        } catch (error) {
          const errorMessage = (error as Error).message;
          console.log("❌ Recognition restart error:", errorMessage);

          // If recognition is already running, mark it as active
          if (errorMessage.includes("already started")) {
            console.log("✅ Recognition already running - marking as active");
            this.isRecognitionActive = true;
            return;
          }

          // For other errors, try again after a longer delay
          console.log("🔄 Will retry restart in 2 seconds...");
          setTimeout(() => {
            if (
              this.isListening &&
              !this.isProcessing &&
              !this.isRecognitionActive
            ) {
              this.restartListening();
            }
          }, 2000);
        }
      } else {
        console.log("⏸️ Skipping restart:", {
          isListening: this.isListening,
          hasRecognition: !!this.recognition,
          isProcessing: this.isProcessing,
          isRecognitionActive: this.isRecognitionActive,
          isSpeaking: this.voiceQueue.isSpeaking(),
        });
      }
    }, 500); // Small delay to avoid rapid restarts
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    this.isListening = false;
    this.isRecognitionActive = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.safetyCheckTimeout) {
      clearTimeout(this.safetyCheckTimeout);
      this.safetyCheckTimeout = null;
    }
    if (this.recognition) {
      this.recognition.stop();
    }
    console.log("Stopped listening...");
  }

  /**
   * Start or reset the safety check timer
   */
  private startSafetyCheck(): void {
    // Clear existing timeout first
    if (this.safetyCheckTimeout) {
      clearTimeout(this.safetyCheckTimeout);
      this.safetyCheckTimeout = null;
    }

    // Start safety check if we're listening (regardless of processing status)
    // The safety check will queue itself and let the voice queue handle prioritization
    if (!this.isListening) {
      console.log("Safety check not started - not listening");
      return;
    }

    // Start safety check for any active listening session
    this.safetyCheckTimeout = setTimeout(() => {
      this.performSafetyCheck();
    }, this.SAFETY_CHECK_INTERVAL);

    console.log(
      "🔒 Safety check timer started - will trigger in",
      this.SAFETY_CHECK_INTERVAL / 1000,
      "seconds"
    );
  }

  /**
   * Perform automatic safety check
   */
  private async performSafetyCheck(): Promise<void> {
    // Clear the timeout reference since this execution is happening
    this.safetyCheckTimeout = null;

    console.log("🔍 Safety check triggered after 10 seconds of inactivity");

    // Queue safety check regardless of current speaking status
    // The voice queue will handle prioritization

    // Don't trigger if we're not listening anymore
    if (!this.isListening) {
      console.log("Safety check cancelled - not listening anymore");
      return;
    }

    try {
      console.log("Performing automatic safety check...");

      // Check if enough time has passed since last activity
      const timeSinceLastActivity = Date.now() - this.lastActivityTime;
      console.log(
        `Time since last activity: ${timeSinceLastActivity / 1000} seconds`
      );

      if (timeSinceLastActivity >= this.SAFETY_CHECK_INTERVAL) {
        // Set processing flag to prevent overlapping safety checks
        this.isProcessing = true;

        // Generate a safety check message
        const safetyMessage = this.generateSafetyCheckMessage();

        console.log("Triggering safety check:", safetyMessage);

        // Queue the safety check with high priority
        await this.voiceQueue.queueVoice(safetyMessage, "safety-check");

        // Update last activity time to prevent immediate re-triggering
        this.lastActivityTime = Date.now();

        // Wait for the safety check speech to complete before clearing processing flag
        this.waitForSpeechToComplete().then(() => {
          // Clear processing flag
          this.isProcessing = false;
          console.log(
            "Safety check speech completed, resuming normal operation"
          );

          // Schedule the next safety check
          this.startSafetyCheck();
        });
      } else {
        console.log("Not enough time passed for safety check, rescheduling...");
        // Schedule the next safety check
        this.startSafetyCheck();
      }
    } catch (error) {
      console.error("Error during safety check:", error);
      // Clear processing flag on error
      this.isProcessing = false;
      // Schedule the next safety check even if there was an error
      this.startSafetyCheck();
    }
  }

  /**
   * Generate contextual safety check message
   */
  private generateSafetyCheckMessage(): string {
    const messages = [
      "Hey, are you safe?",
      "Just checking in - how are you doing?",
      "Everything okay? I haven't heard from you in a while.",
      "Quick safety check - are you alright?",
      "Hey there, just making sure you're doing well.",
    ];

    // Add context-specific messages
    if (this.context.safetyScore && this.context.safetyScore < 60) {
      return "Hey, are you safe? You're in an area with lower safety scores.";
    }

    if (
      this.context.routeDetails &&
      this.context.routeDetails.dangerZones > 0
    ) {
      return "Hey, are you safe? I noticed there are some areas requiring extra attention on your route.";
    }

    // Return a random general message
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Handle special voice commands
   */
  private handleSpecialCommands(transcript: string): boolean {
    const lowerTranscript = transcript.toLowerCase().trim();

    // Emergency alert patterns
    const emergencyPatterns = [
      /save me/i,
      /help me/i,
      /send alert/i,
      /emergency/i,
      /sos/i,
    ];
    const isEmergencyRequest = emergencyPatterns.some((pattern) =>
      pattern.test(lowerTranscript)
    );
    if (isEmergencyRequest) {
      console.log("🚨 Emergency alert request detected:", transcript);
      if (this.callbacks.onEmergencyAlertRequest) {
        this.voiceQueue
          .queueVoice(
            "Sending emergency alert to your trusted contacts now.",
            "conversation"
          )
          .catch(console.error);
        this.callbacks.onEmergencyAlertRequest();
      } else {
        this.voiceQueue
          .queueVoice(
            "I want to send an alert, but no contacts are set up.",
            "conversation"
          )
          .catch(console.error);
      }
      return true;
    }

    // Check for safety spot requests - expanded patterns
    const safetySpotPatterns = [
      /take me to.*nearest.*safety.*spot/i,
      /go to.*nearest.*safe.*place/i,
      /find.*nearest.*safety.*spot/i,
      /nearest.*safe.*spot/i,
      /take me to.*safe.*place/i,
      /go to.*safety.*spot/i,
      /find.*safe.*place/i,
      /i need.*safe.*place/i,
      /take me.*safe/i,
      /nearest.*safe.*place/i,
      /find.*safe.*spot/i,
      /add.*safe.*stop/i,
      /add.*safety.*stop/i,
      /stop.*safe.*place/i,
      /safe.*spot/i,
      /safety.*spot/i,
      /safe.*place/i,
    ];
    const isSafetySpotRequest = safetySpotPatterns.some((pattern) =>
      pattern.test(lowerTranscript)
    );
    if (isSafetySpotRequest) {
      console.log("🚨 Safety spot request detected:", transcript);
      // Check if we're already handling a safety spot request
      if (this.isHandlingSafetySpot) {
        console.log(
          "⚠️ Safety spot request already in progress, ignoring duplicate"
        );
        this.voiceQueue
          .queueVoice(
            "I'm already looking for a safety spot. Please wait.",
            "navigation"
          )
          .catch(console.error);
        return true;
      }
      // Set flag to prevent concurrent requests
      this.isHandlingSafetySpot = true;
      console.log("🔍 Matched pattern, triggering callback...");
      // Provide immediate feedback
      this.voiceQueue
        .queueVoice(
          "Looking for the nearest safety spot and updating your route.",
          "navigation"
        )
        .catch(console.error);
      // Call the callback if available
      if (this.callbacks.onNearestSafetySpotRequest) {
        console.log("🎯 Calling safety spot callback...");
        this.callbacks
          .onNearestSafetySpotRequest()
          .then(() => {
            console.log("✅ Safety spot request completed successfully");
            this.voiceQueue
              .queueVoice(
                "Route updated! I've added the nearest safety spot to your route.",
                "navigation"
              )
              .catch(console.error);
          })
          .catch((error) => {
            console.error("❌ Error handling safety spot request:", error);
            this.voiceQueue
              .queueVoice(
                "Sorry, I couldn't find a nearby safety spot right now. Please try again.",
                "navigation"
              )
              .catch(console.error);
          })
          .finally(() => {
            // Always reset the flag when done
            this.isHandlingSafetySpot = false;
            console.log("🔄 Safety spot handling flag reset");
          });
      } else {
        console.log("⚠️ No callback available for safety spot request");
        this.voiceQueue
          .queueVoice(
            "I understand you want to go to a safety spot, but I can't update your route right now.",
            "conversation"
          )
          .catch(console.error);
        // Reset flag even if no callback
        this.isHandlingSafetySpot = false;
      }
      return true; // Command was handled
    }
    return false; // No special command detected
  }

  /**
   * Process transcript: Send to Gemini -> TTS
   */
  private async processTranscript(transcript: string): Promise<void> {
    if (this.isProcessing) {
      console.log("Already processing, ignoring new transcript");
      return; // Prevent multiple concurrent processes
    }

    try {
      this.isProcessing = true;
      console.log("Setting isProcessing = true");

      // Update activity time - user just spoke
      this.lastActivityTime = Date.now();
      console.log("User activity detected - clearing safety timer");

      // Clear any existing safety check since user is active
      if (this.safetyCheckTimeout) {
        clearTimeout(this.safetyCheckTimeout);
        this.safetyCheckTimeout = null;
      }

      console.log("Processing transcript:", transcript);

      // Check for special voice commands before processing with AI
      if (this.handleSpecialCommands(transcript)) {
        // Command was handled, reset processing flag and restart listening
        this.isProcessing = false;
        console.log("Setting isProcessing = false (special command handled)");
        if (this.isListening) {
          this.restartListening();
          this.startSafetyCheck();
        }
        return;
      }

      // Temporarily pause speech recognition while processing
      if (this.recognition && this.isRecognitionActive) {
        console.log("⏸️ Temporarily stopping recognition while processing");
        this.recognition.stop();
      }

      // Step 1: Send to Gemini AI for response
      const aiResponse = await this.getGeminiResponse(transcript);

      if (!aiResponse) {
        console.log("No AI response received");
        this.isProcessing = false;
        console.log("Setting isProcessing = false (no response)");
        // Start fresh safety check even if no response
        this.startSafetyCheck();
        return;
      }

      console.log("AI Response:", aiResponse);

      // Step 2: Queue the AI response for speech using voice queue
      await this.voiceQueue.queueVoice(aiResponse, "conversation");
      console.log("AI response voice queued successfully");

      // Step 3: Wait for the voice queue to finish speaking before restarting
      this.waitForSpeechToComplete().then(() => {
        // Reset processing flag and resume listening
        this.isProcessing = false;
        console.log("Setting isProcessing = false (after speech complete)");

        if (this.isListening) {
          console.log("Restarting listening after AI speech completed");
          this.restartListening();
          // Start fresh safety check timer after AI response completes
          console.log("AI speech complete - starting fresh safety check");
          this.startSafetyCheck();
        }
      });
    } catch (error) {
      console.error("Error processing transcript:", error);
      this.isProcessing = false;
      console.log("Setting isProcessing = false (error)");
      // Resume listening even if there was an error
      if (this.isListening) {
        console.log("Restarting listening after error");
        // Small delay before restarting on error
        setTimeout(() => {
          this.restartListening();
          // Start safety check even after error
          this.startSafetyCheck();
        }, 1000);
      }
    }
  }

  /**
   * Get response from Gemini AI
   */
  private async getGeminiResponse(userMessage: string): Promise<string | null> {
    try {
      const systemPrompt = this.buildSystemPrompt();

      const response = await fetch(
        `${this.geminiBaseUrl}?key=${this.config.geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${systemPrompt}\n\nUser: ${userMessage}`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status}`, errorText);
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
      console.error("Gemini AI error:", error);
      return null;
    }
  }

  /**
   * Build system prompt for Gemini based on current context
   */
  private buildSystemPrompt(): string {
    const routeInfo = this.context.routeDetails;
    const contacts = this.context.trustedContacts || [];

    let contactsSection = "";
    if (contacts.length > 0) {
      contactsSection = `\nTrusted Contacts:\n${contacts
        .map(
          (c, i) =>
            `  ${i + 1}. ${c.name} (${c.relationship || "Contact"})${
              c.isPrimary ? " [Primary]" : ""
            }${c.phone ? ", Phone: " + c.phone : ""}${
              c.email ? ", Email: " + c.email : ""
            }`
        )
        .join("\n")}`;
    }

    const basePrompt = `You are a helpful AI companion for the Midnight Mile personal safety app. You help users navigate safely at night and provide reassurance during their walks.

Current Context:
- App: Personal safety navigation app
- User State: ${this.context.walkingState || "planning"}
- Current Location: ${this.context.currentLocation || "Unknown"}
- Destination: ${this.context.destination || "Not set"}
- Route Status: ${this.context.routeStatus || "No route"}
- Safety Score: ${
      this.context.safetyScore ? `${this.context.safetyScore}%` : "Unknown"
    }
${
  routeInfo
    ? `
Route Details:
- Distance: ${(routeInfo.distance / 1000).toFixed(1)} km
- Estimated Time: ${routeInfo.estimatedTime} minutes
- Route Type: ${routeInfo.routeType} route
- Safety Spots: ${routeInfo.safeSpots} nearby safe locations
- Caution Areas: ${routeInfo.dangerZones} areas requiring extra attention`
    : ""
}
${contactsSection}

Guidelines:
1. Keep responses short and conversational (1-2 sentences max)
2. Be supportive and reassuring for safety concerns
3. Focus on navigation, safety, and encouragement
4. Provide specific information when asked about the route
5. If the user seems to be in distress, suggest they contact emergency services or a trusted contact
6. For casual conversation, keep it brief and redirect to safety/navigation topics
7. Use the current context to provide relevant, helpful responses

Examples of helpful responses:
- "You're on the ${routeInfo?.routeType || "selected"} route to ${
      this.context.destination
    }. It should take about ${routeInfo?.estimatedTime || "unknown"} minutes."
- "Your route has a ${this.context.safetyScore}% safety score, which is ${
      (this.context.safetyScore || 0) >= 80
        ? "excellent"
        : (this.context.safetyScore || 0) >= 60
        ? "good"
        : "moderate"
    }."
- "There are ${
      routeInfo?.safeSpots || 0
    } safe spots along your route if you need them."
- "If you need help, you can contact your trusted contacts such as ${contacts
        .map((c) => c.name)
        .slice(0, 2)
        .join(", ")}."

Respond naturally as a caring companion who's walking with them and knows their route details.`;

    return basePrompt;
  }

  /**
   * Wait for speech to complete before restarting listening
   */
  private waitForSpeechToComplete(): Promise<void> {
    return new Promise((resolve) => {
      const checkSpeaking = () => {
        if (!this.voiceQueue.isSpeaking()) {
          console.log("✅ Speech completed, ready to restart listening");
          resolve();
        } else {
          console.log("🗣️ Still speaking, waiting...");
          setTimeout(checkSpeaking, 100); // Check every 100ms
        }
      };
      checkSpeaking();
    });
  }

  /**
   * Smart restart that waits for speech to complete
   */
  private smartRestart(): void {
    if (this.voiceQueue.isSpeaking()) {
      console.log("🗣️ Waiting for speech to complete before restarting...");
      this.waitForSpeechToComplete().then(() => {
        if (this.isListening && !this.isProcessing) {
          this.restartListening();
        }
      });
    } else {
      this.restartListening();
    }
  }

  /**
   * Update conversation context
   */
  updateContext(newContext: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...newContext };
  }

  /**
   * Set callbacks for voice commands
   */
  setCallbacks(callbacks: VoiceCommandCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.config.elevenLabsApiKey && this.config.geminiApiKey);
  }

  /**
   * Get current listening state
   */
  getListeningState(): boolean {
    return this.isListening;
  }

  /**
   * Get detailed voice assistant status for debugging
   */
  getStatus() {
    return {
      isListening: this.isListening,
      isRecognitionActive: this.isRecognitionActive,
      isProcessing: this.isProcessing,
      isHandlingSafetySpot: this.isHandlingSafetySpot,
      hasRecognition: !!this.recognition,
      isSpeaking: this.voiceQueue.isSpeaking(),
      voiceQueueStatus: this.voiceQueue.getQueueStatus(),
    };
  }

  /**
   * Force restart listening (for external use)
   */
  async forceRestartListening(): Promise<void> {
    console.log("🔄 Force restarting voice assistant...");

    // Stop current recognition
    if (this.recognition) {
      this.recognition.stop();
    }

    this.isRecognitionActive = false;

    // Clear any pending timeouts
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    // Wait a moment then restart
    setTimeout(() => {
      if (this.isListening) {
        this.startListening();
      }
    }, 1000);
  }

  /**
   * Update callbacks without re-initializing the service
   */
  updateCallbacks(callbacks: Partial<VoiceCommandCallbacks>): void {
    if (callbacks.onNearestSafetySpotRequest) {
      this.callbacks.onNearestSafetySpotRequest =
        callbacks.onNearestSafetySpotRequest;
      console.log("🔄 Updated safety spot callback");
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopListening();
    this.isRecognitionActive = false;
    this.isHandlingSafetySpot = false; // Reset safety spot flag
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.recognition = null;
    this.isProcessing = false;
    // Cleanup voice queue
    this.voiceQueue.cleanup();
  }

  /**
   * Announce navigation message without going through conversation flow
   */
  async announceNavigation(message: string): Promise<void> {
    try {
      console.log("AI Navigation announcement queued:", message);
      await this.voiceQueue.queueVoice(message, "navigation");
    } catch (error) {
      console.error("Navigation announcement error:", error);
      throw error;
    }
  }

  /**
   * Get voice queue status for debugging
   */
  getVoiceQueueStatus() {
    return this.voiceQueue.getQueueStatus();
  }

  /**
   * Check if voice system is currently speaking
   */
  isSpeaking(): boolean {
    return this.voiceQueue.isSpeaking();
  }
}

export {
  VoiceAssistantService,
  type VoiceAssistantConfig,
  type ConversationContext,
  type VoiceCommandCallbacks,
};
