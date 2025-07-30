import { TrustedContact } from "@/types";
import { sendEmergencyAlert } from "@/services/emergencyAlertService";

export function getTrustedContactsAndLocation(): {
  contacts: TrustedContact[];
  userLocation: { lat: number; lng: number } | null;
} {
  // Try to get contacts from localStorage (same as trusted-contacts page)
  let contacts: TrustedContact[] = [];
  const savedContacts = localStorage.getItem("trustedContacts");
  if (savedContacts) {
    contacts = JSON.parse(savedContacts);
  }
  // Try to get location from geolocation
  let userLocation: { lat: number; lng: number } | null = null;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      (error) => {
        userLocation = null;
      }
    );
  }
  return { contacts, userLocation };
}

export async function handleEmergencyAlertFromVoice() {
  const { contacts, userLocation } = getTrustedContactsAndLocation();
  await sendEmergencyAlert(contacts, userLocation);
}
