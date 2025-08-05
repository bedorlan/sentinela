/**
 * Close Warning Hook - Prevents accidental page closure during active watching
 *
 * This hook displays a browser warning dialog when the user attempts to close or navigate
 * away from the page while detection is actively running (WATCHING or DETECTED states).
 * This helps prevent users from accidentally losing their active detection session.
 */

import { useEffect } from "react";
import { DetectionState } from "./constants.js";

export function useCloseWarning(state) {
  const { detectionState } = state;

  useEffect(() => {
    const isWatching =
      detectionState === DetectionState.WATCHING ||
      detectionState === DetectionState.DETECTED;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    if (isWatching) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [detectionState]);
}
