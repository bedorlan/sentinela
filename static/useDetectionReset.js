/**
 * Detection Reset Hook - Automatically resets detection state after timeout
 *
 * This hook automatically transitions the detection state from DETECTED back to WATCHING
 * after a 5-second delay. This allows the system to continue monitoring for new detections
 */

import { useEffect } from "react";
import { DetectionState, Events } from "./constants.js";

export function useDetectionReset(state, dispatch) {
  const { detectionState } = state;

  useEffect(() => {
    if (detectionState === DetectionState.DETECTED) {
      const timer = setTimeout(() => {
        dispatch({ type: Events.onDetectionReset });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [detectionState]);
}
