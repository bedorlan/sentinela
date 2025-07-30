import { WatchLogEventType } from "./constants.js";

export function getPathPrefix() {
  const path = window.location.pathname;
  const segments = path.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) return "";
  return `/${segments[0]}`;
}

export function formatWatchingDuration(startTime, currentTime = Date.now()) {
  const durationSeconds = Math.floor((currentTime - startTime) / 1000);
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function countDetections(watchingLogs) {
  return watchingLogs.filter((log) => log.type === WatchLogEventType.DETECTION)
    .length;
}

export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function generateLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export async function sendPeriodicUpdateEmail({
  toEmailAddress,
  prompt,
  durationText,
  detectionCount,
  summaryText,
}) {
  const emailData = {
    subject: `Sentinela Update - Still Watching (${durationText})`,
    html_body: `
      <h2>👁️ Watching Session Update</h2>
      <p><strong>Watching:</strong> ${prompt}</p>
      <p><strong>Duration:</strong> ${durationText}</p>
      <p><strong>Detections:</strong> ${detectionCount}</p>
      <hr>
      <h3>Recent Activity Summary:</h3>
      <p>${summaryText}</p>
    `,
    to_email: toEmailAddress,
  };

  const response = await fetch("/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return response;
}
