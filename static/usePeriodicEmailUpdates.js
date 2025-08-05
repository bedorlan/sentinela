/**
 * Periodic Email Updates Hook - Sends scheduled email summaries during watching sessions
 *
 * This hook automatically sends periodic email updates to users while watching is active,
 * containing summarized activity reports. It uses the auto-summarization system to create
 * meaningful updates at configurable intervals (hourly, daily, etc.) and includes detection
 * counts and session duration in the emails.
 */

import React, { useEffect } from "react";
import {
  DetectionState,
  SUMMARY_TIME_WINDOWS,
  WatchLogEventType,
} from "./constants.js";
import {
  formatWatchingDuration,
  countDetections,
  sendPeriodicUpdateEmail,
} from "./utils.js";

export function usePeriodicEmailUpdates(state, dispatch) {
  const {
    emailUpdateInterval,
    watchingLogs,
    detectionState,
    enabledNotifications,
    toEmailAddress,
    prompt,
    watchingStartTime,
  } = state;

  const [lastPeriodicEmailSent, setLastPeriodicEmailSent] =
    React.useState(watchingStartTime);

  useEffect(() => {
    if (watchingStartTime) {
      setLastPeriodicEmailSent(watchingStartTime);
    }
  }, [watchingStartTime]);

  useEffect(() => {
    if (
      !emailUpdateInterval ||
      detectionState !== DetectionState.WATCHING ||
      !enabledNotifications.email ||
      !watchingStartTime
    ) {
      return;
    }

    const now = Date.now();
    const timeWindow = SUMMARY_TIME_WINDOWS[emailUpdateInterval].timeWindow;

    if (now - lastPeriodicEmailSent < timeWindow) {
      return;
    }

    const latestSummary = watchingLogs
      .filter(
        (log) =>
          log.type === WatchLogEventType.SUMMARY &&
          log.summaryLevel === emailUpdateInterval &&
          new Date(log.timestamp).getTime() > lastPeriodicEmailSent,
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (!latestSummary) {
      return;
    }

    const sendEmail = async () => {
      try {
        await sendPeriodicUpdateEmail({
          toEmailAddress,
          prompt,
          durationText: formatWatchingDuration(watchingStartTime),
          detectionCount: countDetections(watchingLogs),
          summaryText: latestSummary.reason,
        });

        setLastPeriodicEmailSent(new Date(latestSummary.timestamp).getTime());
      } catch (error) {
        console.error("Error sending periodic email:", error);
      }
    };

    sendEmail();
  }, [
    watchingLogs,
    emailUpdateInterval,
    detectionState,
    enabledNotifications.email,
    watchingStartTime,
    toEmailAddress,
    prompt,
    lastPeriodicEmailSent,
  ]);
}
