"use client";

import { useState } from "react";
import { ExternalLink, Key, Copy, CheckCircle } from "lucide-react";

export default function ApiSetupGuide() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const envTemplate = `# Midnight Mile Environment Variables

# Google Maps API Key (required for maps functionality)
# Get from: https://developers.google.com/maps/documentation/javascript/get-api-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Eleven Labs API Key (required for AI companion voice)
# Get from: https://elevenlabs.io/
ELEVEN_LABS_API_KEY=your_eleven_labs_api_key_here

# Optional: Analytics and monitoring
NEXT_PUBLIC_ANALYTICS_ID=

# Development settings
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-[#0C1E3C] px-6 py-4">
            <div className="flex items-center space-x-3">
              <Key className="h-8 w-8 text-[#3D828B]" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  API Setup Guide
                </h1>
                <p className="text-gray-300">
                  Configure your API keys to enable all features
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* Google Maps API Setup */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <span>🗺️</span>
                <span>Google Maps API Key</span>
                <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                  Required
                </span>
              </h2>

              <div className="space-y-4">
                <p className="text-gray-600">
                  The Google Maps API key is required for all map functionality,
                  including location services, route calculation, and finding
                  nearby safe spots.
                </p>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    Setup Steps:
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                    <li>
                      Go to{" "}
                      <a
                        href="https://console.cloud.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Google Cloud Console
                      </a>
                    </li>
                    <li>Create a new project or select an existing one</li>
                    <li>
                      Enable the following APIs:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>Maps JavaScript API</li>
                        <li>Places API</li>
                        <li>Directions API</li>
                        <li>Geocoding API</li>
                      </ul>
                    </li>
                    <li>Create credentials (API Key)</li>
                    <li>Restrict the key to your domain for production</li>
                  </ol>
                </div>

                <a
                  href="https://developers.google.com/maps/documentation/javascript/get-api-key"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Detailed Google Maps API Setup Guide</span>
                </a>
              </div>
            </div>

            {/* Eleven Labs API Setup */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <span>🎙️</span>
                <span>Eleven Labs API Key</span>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                  Optional
                </span>
              </h2>

              <div className="space-y-4">
                <p className="text-gray-600">
                  The Eleven Labs API key enables the &ldquo;Walk With Me&rdquo;
                  AI voice companion feature. Without this key, the app will
                  still work but voice features will be disabled.
                </p>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">
                    Setup Steps:
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                    <li>
                      Sign up at{" "}
                      <a
                        href="https://elevenlabs.io/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Eleven Labs
                      </a>
                    </li>
                    <li>Navigate to your dashboard</li>
                    <li>Copy your API key from the account settings</li>
                    <li>Add it to your .env.local file</li>
                  </ol>
                </div>

                <a
                  href="https://elevenlabs.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>Get Eleven Labs API Key</span>
                </a>
              </div>
            </div>

            {/* Environment File Template */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <span>📝</span>
                <span>Environment File Setup</span>
              </h2>

              <div className="space-y-4">
                <p className="text-gray-600">
                  Copy this template to your{" "}
                  <code className="bg-gray-100 px-1 py-0.5 rounded">
                    .env.local
                  </code>{" "}
                  file and replace the placeholder values with your actual API
                  keys.
                </p>

                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{envTemplate}</code>
                  </pre>
                  <button
                    onClick={() => copyToClipboard(envTemplate, "env")}
                    className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white p-2 rounded"
                    title="Copy to clipboard"
                  >
                    {copiedField === "env" ? (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Final Steps */}
            <div className="bg-[#F5EDE0] p-6 rounded-lg">
              <h3 className="font-semibold text-[#0C1E3C] mb-2">
                After Setting Up API Keys:
              </h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Save your .env.local file</li>
                <li>
                  Restart the development server (<code>npm run dev</code>)
                </li>
                <li>Allow location access when prompted</li>
                <li>Test the app in Delhi or San Francisco areas</li>
              </ol>
            </div>

            {/* Troubleshooting */}
            <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
              <h3 className="font-medium text-yellow-800 mb-2">
                Troubleshooting
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                <li>
                  Make sure your .env.local file is in the project root
                  directory
                </li>
                <li>Restart the server after adding API keys</li>
                <li>Check browser console for any API-related errors</li>
                <li>
                  Ensure you&apos;re testing in Delhi or San Francisco
                  (supported cities)
                </li>
                <li>
                  For Google Maps errors, verify your API key has the required
                  APIs enabled
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
