/**
 * Load Demos Hook - Fetches available demo scenarios from the server
 * 
 * This hook loads the demo configuration file containing pre-built demonstration
 * scenarios with sample videos and prompts. These demos allow users to try the
 * detection system without using their webcam, providing a safe way to explore
 * the application's capabilities.
 */

import { useEffect } from "react";
import { Events } from "./constants.js";
import { getPathPrefix } from "./utils.js";

export function useLoadDemos(state, dispatch) {
  useEffect(() => {
    const serverPathPrefix = getPathPrefix();
    fetch(`${serverPathPrefix}/static/demos/demos.json`)
      .then((response) => response.json())
      .then((data) => dispatch({ type: Events.onDemosLoad, payload: data }))
      .catch((error) => console.error("Error loading demos:", error));
  }, []);
}
