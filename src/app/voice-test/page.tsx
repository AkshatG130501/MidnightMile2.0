"use client";

import { useState, useRef } from "react";
import VoiceMicrophone, {
  VoiceMicrophoneHandle,
} from "@/components/VoiceMicrophone";

export default function VoiceTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const voiceRef = useRef<VoiceMicrophoneHandle>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `${timestamp}: ${message}`]);
  };

  const handleListeningStateChange = (listening: boolean) => {
    setIsListening(listening);
    addLog(`Voice assistant ${listening ? "started" : "stopped"} listening`);
  };

  const testAnnouncement = async () => {
    if (voiceRef.current) {
      try {
        await voiceRef.current.announceNavigation(
          "This is a test announcement"
        );
        addLog("Test announcement triggered");
      } catch (error) {
        addLog(`Test announcement failed: ${error}`);
      }
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#0C1E3C] mb-6">
          Voice Assistant Test
        </h1>

        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Voice Controls</h2>
          <div className="flex items-center space-x-4">
            <VoiceMicrophone
              ref={voiceRef}
              onListeningStateChange={handleListeningStateChange}
              context={{
                currentLocation: "Test Location",
                destination: "Test Destination",
                walkingState: "planning",
              }}
            />
            <div>
              <p className="text-sm">
                Status:{" "}
                <span
                  className={isListening ? "text-green-600" : "text-red-600"}
                >
                  {isListening ? "Listening" : "Not Listening"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={testAnnouncement}
            className="bg-[#3D828B] text-white px-4 py-2 rounded-lg mr-2"
          >
            Test Announcement
          </button>
          <button
            onClick={clearLogs}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg"
          >
            Clear Logs
          </button>
        </div>

        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
          <h3 className="text-white mb-2">Debug Logs:</h3>
          {logs.length === 0 ? (
            <p className="text-gray-500">
              No logs yet. Start speaking to test the voice assistant.
            </p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">
            Testing Instructions:
          </h3>
          <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
            <li>
              Make sure you have valid API keys set in your environment
              variables
            </li>
            <li>Click allow when prompted for microphone access</li>
            <li>
              Wait for the voice assistant to show &quot;Listening&quot; status
            </li>
            <li>
              Try saying something like &quot;Hello&quot; or &quot;How are
              you?&quot;
            </li>
            <li>Watch the logs to see what happens</li>
            <li>
              If it stops listening after one interaction, click the microphone
              to restart
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
