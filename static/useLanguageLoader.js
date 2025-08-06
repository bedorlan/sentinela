/**
 * Language Loader Hook - Manages internationalization and translation loading
 *
 * This hook handles loading and prefetching of translation files for different languages.
 * It automatically detects the user's browser language and prefetches those translations
 * for faster switching. When the user changes languages, it fetches the appropriate
 * translation file and updates the application's text content.
 */

import React, { useEffect } from "react";
import { Events } from "./constants.js";
import { getPathPrefix } from "./utils.js";

export function useLanguageLoader(state, dispatch) {
  const { currentLanguage } = state;
  const prefetchPromisesRef = React.useRef({});

  useEffect(() => {
    const browserLanguage = navigator.language;
    const languageCode = browserLanguage.split("-")[0];

    if (
      languageCode !== "en" &&
      currentLanguage === "en" &&
      !prefetchPromisesRef.current[languageCode]
    ) {
      const prefetchTranslation = async () => {
        try {
          const serverPathPrefix = getPathPrefix();
          const response = await fetch(
            `${serverPathPrefix}/translations/${languageCode}`,
          );
          if (!response.ok) {
            throw new Error(`Prefetch failed: ${response.status}`);
          }
          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Translation prefetch error:", error);
          return null;
        }
      };

      // TODO: disable prefetch translations for now
      // prefetchPromisesRef.current[languageCode] = prefetchTranslation();
    }
  }, []);

  useEffect(() => {
    const loadTexts = async () => {
      if (prefetchPromisesRef.current[currentLanguage]) {
        try {
          dispatch({ type: Events.onLanguageLoadStart });
          const prefetchedData = await prefetchPromisesRef.current[
            currentLanguage
          ];
          if (prefetchedData) {
            dispatch({
              type: Events.onLanguageLoadSuccess,
              payload: { texts: prefetchedData.translations },
            });
            return;
          }
        } catch (error) {
          console.error("Error using prefetched translation:", error);
        }
      }

      try {
        dispatch({ type: Events.onLanguageLoadStart });

        const serverPathPrefix = getPathPrefix();
        const response = await fetch(
          `${serverPathPrefix}/translations/${currentLanguage}`,
        );
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.detail || `HTTP error! status: ${response.status}`;
          throw new Error(errorMessage);
        }
        const data = await response.json();

        dispatch({
          type: Events.onLanguageLoadSuccess,
          payload: { texts: data.translations },
        });
      } catch (error) {
        console.error("Error loading translations:", error);
        dispatch({
          type: Events.onLanguageLoadError,
          payload: { error: error.message },
        });
      }
    };

    loadTexts();
  }, [currentLanguage]);

  return {};
}
