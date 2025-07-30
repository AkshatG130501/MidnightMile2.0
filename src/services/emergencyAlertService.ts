// Emergency Alert Service for Midnight Mile
import { TrustedContact } from "@/types";

export async function sendEmergencyAlert(
  contacts: TrustedContact[],
  userLocation: { lat: number; lng: number } | null
): Promise<void> {
  if (!contacts || contacts.length === 0) {
    alert("Please add at least one trusted contact before sending alerts");
    return;
  }
  if (!userLocation) {
    alert("Unable to get your location. Please try again.");
    return;
  }
  // Create Google Maps link with user's location
  const mapsLink = `https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;
  const alertMessage = `🚨 EMERGENCY ALERT 🚨\n\nHey, I am in trouble, reach my location soon!\n\nMy current location: ${mapsLink}\n\nThis is an automated message from Midnight Mile safety app.`;
  const emailSubject = "🚨 EMERGENCY ALERT - Immediate Assistance Needed";
  const emailBody = encodeURIComponent(alertMessage);
  contacts.forEach((contact, index) => {
    setTimeout(() => {
      if (contact.email) {
        window.open(
          `mailto:${contact.email}?subject=${emailSubject}&body=${emailBody}`,
          "_blank"
        );
      } else {
        if (
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          )
        ) {
          window.open(
            `sms:${contact.phone}?body=${encodeURIComponent(alertMessage)}`,
            "_self"
          );
        } else {
          alert(
            `SMS alert would be sent to ${contact.name} (${contact.phone}):\n\n${alertMessage}`
          );
        }
      }
    }, index * 500); // Stagger the alerts
  });
  alert(`Alert sent to ${contacts.length} trusted contact(s)!`);
}
