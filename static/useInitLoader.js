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
