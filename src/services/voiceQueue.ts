// Voice Queue Service for Midnight Mile
// Manages all voice operations to prevent conflicts

interface VoiceJob {
  id: string;
  text: string;
  type: "conversation" | "navigation" | "safety-check";
  priority: number; // Lower number = higher priority
  timestamp: number;
  resolve: () => void;
  reject: (error: Error) => void;
}

interface VoiceQueueConfig {
  elevenLabsApiKey: string;
  voiceId?: string;
}

class VoiceQueueService {
  private queue: VoiceJob[] = [];
  private isProcessing = false;
  private currentAudio: HTMLAudioElement | null = null;
  private config: VoiceQueueConfig;

  // ElevenLabs configuration
  private elevenLabsBaseUrl = "https://api.elevenlabs.io/v1";
  private readonly VOICE_COMPANION_DEFAULT_ID = "x3gYeuNB0kLLYxOZsaSh";

  constructor(config: VoiceQueueConfig) {
    this.config = config;
  }

  /**
   * Add a voice job to the queue
   */
  async queueVoice(
    text: string,
    type: "conversation" | "navigation" | "safety-check" = "conversation"
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const job: VoiceJob = {
        id: this.generateJobId(),
        text,
        type,
        priority: this.getPriority(type),
        timestamp: Date.now(),
        resolve,
        reject,
      };

      // Add job to queue and sort by priority
      this.queue.push(job);
      this.queue.sort((a, b) => a.priority - b.priority);

      console.log(`Voice job queued: ${type} - "${text.substring(0, 50)}..."`);
      console.log(`Queue size: ${this.queue.length}`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the voice queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const job = this.queue.shift()!;
        console.log(
          `Processing voice job: ${job.type} - "${job.text.substring(
            0,
            50
          )}..."`
        );

        try {
          await this.executeVoiceJob(job);
          job.resolve();
          console.log(`Voice job completed: ${job.id}`);
        } catch (error) {
          console.error(`Voice job failed: ${job.id}`, error);
          job.reject(error as Error);
        }

        // Small delay between jobs to prevent audio overlap
        await this.delay(100);
      }
    } finally {
      this.isProcessing = false;
      console.log("Voice queue processing completed");
    }
  }

  /**
   * Execute a single voice job
   */
  private async executeVoiceJob(job: VoiceJob): Promise<void> {
    try {
      // Stop any currently playing audio
      await this.stopCurrentAudio();

      // Use ElevenLabs TTS
      await this.textToSpeechElevenLabs(job.text);
    } catch (error) {
      console.error(`Error executing voice job ${job.id}:`, error);

      // Fallback to browser speech synthesis
      if (job.type === "navigation") {
        console.log(
          "ElevenLabs failed, trying browser speech synthesis as fallback"
        );
        await this.textToSpeechBrowser(job.text);
      } else {
        throw error; // Re-throw for conversation and safety checks
      }
    }
  }

  /**
   * Text-to-speech using ElevenLabs
   */
  private async textToSpeechElevenLabs(text: string): Promise<void> {
    const response = await fetch(
      `${this.elevenLabsBaseUrl}/text-to-speech/${
        this.config.voiceId || this.VOICE_COMPANION_DEFAULT_ID
      }`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": this.config.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.5,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs TTS error: ${response.status}`, errorText);
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    this.currentAudio = new Audio(audioUrl);

    return new Promise((resolve, reject) => {
      if (!this.currentAudio) {
        reject(new Error("Audio creation failed"));
        return;
      }

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        resolve();
      };

      this.currentAudio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        this.currentAudio = null;
        reject(error);
      };

      this.currentAudio.play().catch(reject);
    });
  }

  /**
   * Fallback text-to-speech using browser's speech synthesis
   */
  private async textToSpeechBrowser(text: string): Promise<void> {
    if (!("speechSynthesis" in window)) {
      throw new Error("Speech synthesis not supported");
    }

    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.volume = 0.8;
      utterance.pitch = 1.0;

      // Try to use a female voice if available
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(
        (voice) =>
          voice.name.includes("Female") ||
          voice.name.includes("Samantha") ||
          voice.name.includes("Victoria") ||
          voice.name.includes("Google UK English Female")
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Stop any currently playing audio
   */
  private async stopCurrentAudio(): Promise<void> {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // Also cancel browser speech synthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Clear the voice queue (for emergencies or interruptions)
   */
  async clearQueue(): Promise<void> {
    console.log(`Clearing voice queue with ${this.queue.length} pending jobs`);

    // Reject all pending jobs
    this.queue.forEach((job) => {
      job.reject(new Error("Voice queue cleared"));
    });

    this.queue = [];
    await this.stopCurrentAudio();
  }

  /**
   * Get priority based on voice type
   */
  private getPriority(
    type: "conversation" | "navigation" | "safety-check"
  ): number {
    switch (type) {
      case "safety-check":
        return 1; // Highest priority
      case "navigation":
        return 2; // Medium priority
      case "conversation":
        return 3; // Lowest priority
      default:
        return 3;
    }
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `voice-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    isProcessing: boolean;
    queueLength: number;
    nextJob?: Pick<VoiceJob, "type" | "text" | "priority">;
  } {
    const nextJob = this.queue[0];
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      nextJob: nextJob
        ? {
            type: nextJob.type,
            text:
              nextJob.text.substring(0, 50) +
              (nextJob.text.length > 50 ? "..." : ""),
            priority: nextJob.priority,
          }
        : undefined,
    };
  }

  /**
   * Check if queue is currently speaking
   */
  isSpeaking(): boolean {
    return (
      this.isProcessing ||
      Boolean(this.currentAudio && !this.currentAudio.paused)
    );
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearQueue();
    this.stopCurrentAudio();
    this.isProcessing = false;
  }
}

export { VoiceQueueService, type VoiceQueueConfig };
