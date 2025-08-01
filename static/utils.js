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

export function exportLogAsCSV(logs) {
  const csvData = logs.map((log) => ({
    timestamp: new Date(log.timestamp).toISOString(),
    type: log.type,
    reason: log.reason || "",
    confidence: log.confidence || "",
    prompt: log.prompt || "",
    summaryLevel: log.summaryLevel || "",
  }));

  const headers = [
    "timestamp",
    "type",
    "reason",
    "confidence",
    "prompt",
    "summaryLevel",
  ];
  const csvContent = [
    headers.join(","),
    ...csvData.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        })
        .join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `sentinela-log-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
      <br><br><i>Sentinela is watching</i>
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
