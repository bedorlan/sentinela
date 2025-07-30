import React, { useEffect } from "react";
import { DetectionState } from "./constants.js";
import { getPathPrefix } from "./utils.js";

export function useEmailNotification(state, dispatch) {
  const [emailSentForDetection, setEmailSentForDetection] =
    React.useState(false);
  const {
    detectionState,
    enabledNotifications,
    prompt,
    reason,
    confidence,
    toEmailAddress,
  } = state;

  useEffect(() => {
    const sendEmailNotification = async () => {
      if (detectionState === DetectionState.IDLE && emailSentForDetection) {
        setEmailSentForDetection(false);
        return;
      }

      if (
        detectionState !== DetectionState.DETECTED ||
        !enabledNotifications.email ||
        emailSentForDetection
      ) {
        return;
      }

      const detectionTime = new Date().toLocaleString();
      const emailData = {
        subject: `Sentinela Detection Alert!`,
        html_body: `
          <h2>Detection Alert</h2>
          <p><strong>Time:</strong> ${detectionTime}</p>
          <p><strong>Prompt:</strong> ${prompt}</p>
          <p><strong>Confidence:</strong> ${confidence}%</p>
          <p><strong>Reason:</strong> ${reason}</p>
        `,
        to_email: toEmailAddress,
      };

      try {
        const serverPathPrefix = getPathPrefix();
        const response = await fetch(`${serverPathPrefix}/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailData),
        });

        if (response.ok) {
          setEmailSentForDetection(true);
        } else {
          console.error("Failed to send email notification:", response.status);
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
    };

    sendEmailNotification();
  }, [
    confidence,
    detectionState,
    emailSentForDetection,
    enabledNotifications.email,
    prompt,
    reason,
  ]);
}
