"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Phone,
  AlertTriangle,
  Trash2,
  UserPlus,
  MessageSquare,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { TrustedContact } from "@/types";
import { sendEmergencyAlert } from "@/services/emergencyAlertService";

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  relationship: string;
}

export default function TrustedContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<TrustedContact[]>(() => {
    // Always load contacts from localStorage on initial mount
    if (typeof window !== "undefined") {
      const savedContacts = localStorage.getItem("trustedContacts");
      if (savedContacts) {
        return JSON.parse(savedContacts);
      }
    }
    return [];
  });
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isSendingAlert, setIsSendingAlert] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    phone: "",
    email: "",
    relationship: "",
  });
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Load contacts from localStorage and location on mount and when page becomes visible
  useEffect(() => {
    const loadContacts = () => {
      const savedContacts = localStorage.getItem("trustedContacts");
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    };
    loadContacts();

    // Listen for page visibility change to reload contacts
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadContacts();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Get user's current location for emergency alerts
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Fallback to a default location (Samvidhan Sadan)
          setUserLocation({
            lat: 28.6139,
            lng: 77.209,
          });
        }
      );
    }
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Save contacts to localStorage whenever contacts change
  useEffect(() => {
    localStorage.setItem("trustedContacts", JSON.stringify(contacts));
  }, [contacts]);

  const handleAddContact = () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      alert("Please fill in at least name and phone number");
      return;
    }

    const newContact: TrustedContact = {
      id: Date.now().toString(),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      relationship: formData.relationship.trim() || "Contact",
      isPrimary: contacts.length === 0, // First contact is primary
    };

    setContacts([...contacts, newContact]);
    setFormData({ name: "", phone: "", email: "", relationship: "" });
    setIsAddingContact(false);
  };

  const handleDeleteContact = (contactId: string) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      setContacts(contacts.filter((contact) => contact.id !== contactId));
    }
  };

  const handleCallContact = (phone: string) => {
    window.open(`tel:${phone}`, "_self");
  };

  const handleSendAlert = async () => {
    setIsSendingAlert(true);
    try {
      await sendEmergencyAlert(contacts, userLocation);
    } catch (error) {
      console.error("Error sending alert:", error);
      alert("Failed to send alert. Please try again.");
    } finally {
      setIsSendingAlert(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-midnight-navy">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-midnight-navy hover:text-midnight-teal transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-xl font-bold text-midnight-navy">
            Trusted Contacts
          </h1>
          <button
            onClick={() => setIsAddingContact(true)}
            className="flex items-center gap-1 bg-midnight-teal text-white px-3 py-2 rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-32">
        {/* Info Banner */}
        <div className="bg-midnight-beige border border-midnight-amber/20 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-midnight-amber mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-midnight-navy mb-1">
                Emergency Contacts
              </h3>
              <p className="text-sm text-midnight-slate">
                Add trusted contacts who will be notified in case of emergency.
                They will receive your location and an alert message.
              </p>
            </div>
          </div>
        </div>

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus
              className="mx-auto text-midnight-slate/40 mb-4"
              size={48}
            />
            <h3 className="text-lg font-semibold text-midnight-slate mb-2">
              No Trusted Contacts
            </h3>
            <p className="text-midnight-slate/80 mb-6">
              Add trusted contacts who can help you in emergencies
            </p>
            <button
              onClick={() => setIsAddingContact(true)}
              className="bg-midnight-navy text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Add Your First Contact
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-midnight-navy">
                        {contact.name}
                      </h3>
                      {contact.isPrimary && (
                        <span className="bg-midnight-amber/20 text-midnight-amber text-xs px-2 py-0.5 rounded-full font-medium">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-midnight-slate mb-1">
                      {contact.phone}
                    </p>
                    {contact.email && (
                      <p className="text-sm text-midnight-slate/80 mb-1">
                        {contact.email}
                      </p>
                    )}
                    <p className="text-xs text-midnight-slate/60">
                      {contact.relationship}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCallContact(contact.phone)}
                      className="bg-midnight-teal text-white p-2 rounded-lg hover:bg-opacity-90 transition-colors"
                      title="Call contact"
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="bg-midnight-coral/10 text-midnight-coral p-2 rounded-lg hover:bg-midnight-coral/20 transition-colors"
                      title="Delete contact"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Alert Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <button
          onClick={handleSendAlert}
          disabled={isSendingAlert || contacts.length === 0}
          className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-200 ${
            contacts.length === 0
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : isSendingAlert
              ? "bg-midnight-coral/80 text-white cursor-wait"
              : "bg-midnight-coral text-white hover:bg-midnight-coral/90 active:scale-95"
          }`}
        >
          {isSendingAlert ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Sending Alert...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <MessageSquare size={20} />
              Send Emergency Alert
            </div>
          )}
        </button>
        {contacts.length === 0 && (
          <p className="text-center text-sm text-midnight-slate/60 mt-2">
            Add contacts to enable emergency alerts
          </p>
        )}
      </div>

      {/* Add Contact Modal */}
      {isAddingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-midnight-navy">
                  Add Trusted Contact
                </h2>
                <button
                  onClick={() => setIsAddingContact(false)}
                  className="text-midnight-slate hover:text-midnight-navy"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-midnight-navy mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-midnight-teal focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-midnight-navy mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-midnight-teal focus:border-transparent"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-midnight-navy mb-2">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-midnight-teal focus:border-transparent"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-midnight-navy mb-2">
                    Relationship
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) =>
                      setFormData({ ...formData, relationship: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-midnight-teal focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    <option value="Family">Family</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Partner">Partner</option>
                    <option value="Friend">Friend</option>
                    <option value="Roommate">Roommate</option>
                    <option value="Colleague">Colleague</option>
                    <option value="Emergency Contact">Emergency Contact</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsAddingContact(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-midnight-slate rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddContact}
                  className="flex-1 px-4 py-2 bg-midnight-navy text-white rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
