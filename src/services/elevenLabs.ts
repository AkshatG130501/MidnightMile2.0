// Eleven Labs AI Voice Service for Midnight Mile

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
}

class ElevenLabsService {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";
  private defaultVoiceId = "pNInz6obpgDQGcFmaJgB"; // Adam voice - friendly male

  constructor() {
    this.apiKey = process.env.ELEVEN_LABS_API_KEY || "";
  }

  /**
   * Convert text to speech using Eleven Labs API
   */
  async textToSpeech(
    text: string,
    voiceId?: string,
    voiceSettings?: VoiceSettings
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("Eleven Labs API key not configured");
    }

    const url = `${this.baseUrl}/text-to-speech/${
      voiceId || this.defaultVoiceId
    }`;

    const defaultSettings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.5,
      use_speaker_boost: true,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: { ...defaultSettings, ...voiceSettings },
        }),
      });

      if (!response.ok) {
        throw new Error(`Eleven Labs API error: ${response.status}`);
      }

      // Convert response to blob and then to base64
      const audioBlob = await response.blob();
      return await this.blobToBase64(audioBlob);
    } catch (error) {
      console.error("Text-to-speech error:", error);
      throw error;
    }
  }

  /**
   * Generate AI companion messages based on context
   */
  generateCompanionMessage(
    context: "greeting" | "checkin" | "warning" | "encouragement" | "arrival",
    data?: {
      userName?: string;
      location?: string;
      timeLeft?: number;
      safetyScore?: number;
    }
  ): string {
    const messages = {
      greeting: [
        `Hey ${
          data?.userName || "there"
        }! I'm here to walk with you. Ready to get going?`,
        `Alright, I've got your back on this walk. Let's do this together.`,
        `Hey! I'm your walking buddy for tonight. Feeling good about the route?`,
      ],
      checkin: [
        "Still with me? Everything looking good?",
        "Hey, just checking in. How are you feeling?",
        "All good on your end? I'm still here.",
        "Quick check - everything okay over there?",
      ],
      warning: [
        "Heads up - you're approaching an area with lower lighting. Stay alert.",
        "Just so you know, this next stretch has had some safety concerns. Keep your eyes open.",
        "Coming up on a quieter area. Nothing to worry about, just stay aware.",
      ],
      encouragement: [
        "You're doing great! Almost there.",
        "Nice and steady. You've got this.",
        "Looking good - you're making excellent time.",
        "Perfect pace. You're handling this like a pro.",
      ],
      arrival: [
        `Made it! Hope that wasn't too stressful. Don't forget to mark yourself as safe.`,
        "Boom! You're there. That was smooth. Remember to check in.",
        "Perfect! You made it safe and sound. Quick reminder to update your status.",
      ],
    };

    const contextMessages = messages[context];
    const randomMessage =
      contextMessages[Math.floor(Math.random() * contextMessages.length)];

    // Add dynamic data to messages when relevant
    if (context === "warning" && data?.safetyScore && data.safetyScore < 60) {
      return `${randomMessage} Safety score here is ${data.safetyScore}%. Just stay focused.`;
    }

    if (context === "arrival" && data?.timeLeft) {
      return `${randomMessage} You made it ${data.timeLeft} minutes ahead of schedule!`;
    }

    return randomMessage;
  }

  /**
   * Create an audio element and play the voice message
   */
  async playVoiceMessage(text: string): Promise<void> {
    try {
      const audioBase64 = await this.textToSpeech(text);
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);

      return new Promise((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Audio playback failed"));
        audio.play().catch(reject);
      });
    } catch (error) {
      console.error("Voice message playback failed:", error);
      throw error;
    }
  }

  /**
   * Get available voices from Eleven Labs
   */
  async getAvailableVoices(): Promise<Voice[]> {
    if (!this.apiKey) {
      throw new Error("Eleven Labs API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          "xi-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch voices: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      console.error("Error fetching voices:", error);
      return [];
    }
  }

  /**
   * Convert blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Set custom voice settings
   */
  setVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
    return {
      stability: settings.stability ?? 0.5,
      similarity_boost: settings.similarity_boost ?? 0.75,
      style: settings.style ?? 0.5,
      use_speaker_boost: settings.use_speaker_boost ?? true,
    };
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }
}

export const elevenLabsService = new ElevenLabsService();
