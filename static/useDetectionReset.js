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
