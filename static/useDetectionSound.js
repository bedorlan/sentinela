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
