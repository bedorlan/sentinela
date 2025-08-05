/**
 * Init Loader Hook - Loads initial application configuration from the server
 *
 * This hook fetches initial configuration data when the application starts,
 * including the default email address for notifications and information about
 * the currently configured AI inference engine. It ensures the app has the
 * necessary configuration data before users begin watching sessions.
 */

import { useEffect } from "react";
import { Events } from "./constants.js";
import { getPathPrefix } from "./utils.js";

export function useInitLoader(state, dispatch) {
  useEffect(() => {
    const loadInitData = async () => {
      try {
        const serverPathPrefix = getPathPrefix();
        const response = await fetch(`${serverPathPrefix}/init`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Current inference engine:", data.engine_name);

        dispatch({
          type: Events.onInitLoad,
          payload: { toEmailAddress: data.email_address },
        });
      } catch (error) {
        console.error("Error loading init data:", error);
      }
    };

    loadInitData();
  }, []);

  return {};
}
