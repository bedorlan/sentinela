/**
 * Watching Duration Hook - Tracks and formats elapsed time during detection sessions
 * 
 * This hook calculates and formats the duration since detection started, updating every
 * second while in WATCHING or DETECTED states. It provides human-readable time formatting
 * (seconds, minutes, hours, days) to show users how long their detection session has been running.
 */

import React, { useEffect } from "react";
import { DetectionState } from "./constants.js";

export function useWatchingDuration(state) {
  const [watchingDuration, setWatchingDuration] = React.useState("");
  const { watchingStartTime, detectionState, texts } = state;

  useEffect(() => {
    if (!watchingStartTime) {
      setWatchingDuration("");
      return;
    }

    const formatDuration = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        const remainingHours = hours % 24;
        return `${days} ${texts.days}, ${remainingHours} ${texts.hours}`;
      } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours} ${texts.hours}, ${remainingMinutes} ${texts.minutes}`;
      } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return `${minutes} ${texts.minutes}, ${remainingSeconds} ${texts.seconds}`;
      } else {
        return `${seconds} ${texts.seconds}`;
      }
    };

    const updateDuration = () => {
      const duration = Date.now() - watchingStartTime;
      setWatchingDuration(formatDuration(duration));
    };

    updateDuration();

    if (
      detectionState !== DetectionState.WATCHING &&
      detectionState !== DetectionState.DETECTED
    ) {
      return;
    }

    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [watchingStartTime, detectionState, texts]);

  return watchingDuration;
}
