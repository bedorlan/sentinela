/**
 * Detection Sound Hook - Plays audio notifications when detections occur
 * 
 * This hook manages the audio notification system, preloading a detection sound file
 * and playing it whenever the detection state changes to DETECTED (if sound notifications
 * are enabled). Provides immediate audio feedback to alert users of successful detections.
 */

import React, { useEffect } from "react";
import { DetectionState } from "./constants.js";
import { getPathPrefix } from "./utils.js";

export function useDetectionSound(state, dispatch) {
  const detectionSoundRef = React.useRef(null);
  const { detectionState, enabledNotifications } = state;

  useEffect(() => {
    const serverPathPrefix = getPathPrefix();
    detectionSoundRef.current = new Audio(
      `${serverPathPrefix}/static/sound/detected.mp3`,
    );
    detectionSoundRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    if (
      detectionState === DetectionState.DETECTED &&
      enabledNotifications.sound &&
      detectionSoundRef.current
    ) {
      detectionSoundRef.current
        .play()
        .catch((e) => console.error("Failed to play sound:", e));
    }
  }, [detectionState, enabledNotifications.sound]);

  return { detectionSoundRef };
}
