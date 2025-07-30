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
