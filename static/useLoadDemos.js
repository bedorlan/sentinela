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
