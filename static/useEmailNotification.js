import { useEffect, useRef } from "react";
import { Events, WatchLogEventType } from "./constants.js";
import { getPathPrefix } from "./utils.js";

export function useEmailNotification(state, dispatch) {
  const { watchingLogs, enabledNotifications, toEmailAddress } = state;
  const processingLogIds = useRef(new Set());

  useEffect(() => {
    if (!enabledNotifications.email || !toEmailAddress) {
      return;
    }

    const logsToNotify = watchingLogs.filter(
      (log) =>
        log.type === WatchLogEventType.DETECTION &&
        log.videoUrl &&
        !log.emailNotificationSent &&
        !processingLogIds.current.has(log.id),
    );

    if (logsToNotify.length === 0) {
      return;
    }

    const sendEmailNotifications = async () => {
      for (const log of logsToNotify) {
        processingLogIds.current.add(log.id);
        const detectionTime = log.timestamp.toLocaleString();
        const emailData = {
          subject: `Sentinela Detection Alert!`,
          html_body: `
            <h2>Detection Alert</h2>
            <p><strong>Time:</strong> ${detectionTime}</p>
            <p><strong>Prompt:</strong> ${log.prompt}</p>
            <p><strong>Confidence:</strong> ${log.confidence}%</p>
            <p><strong>Reason:</strong> ${log.reason}</p>
          `,
          to_email: toEmailAddress,
          video_attachment: log.videoUrl,
        };

        try {
          const serverPathPrefix = getPathPrefix();
          const response = await fetch(`${serverPathPrefix}/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailData),
          });

          if (response.ok) {
            dispatch({
              type: Events.onEmailNotificationSent,
              payload: { logId: log.id },
            });
          } else {
            console.error(
              "Failed to send email notification:",
              response.status,
            );
          }
        } catch (error) {
          console.error("Error sending email notification:", error);
        } finally {
          processingLogIds.current.delete(log.id);
        }
      }
    };

    sendEmailNotifications();
  }, [watchingLogs, enabledNotifications.email, toEmailAddress]);
}
