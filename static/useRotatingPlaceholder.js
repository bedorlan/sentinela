import React, { useEffect } from "react";
import { Events } from "./constants.js";

export function useRotatingPlaceholder(state, dispatch) {
  const { placeholderIndex, texts } = state;

  const placeholders = [
    texts.placeholder_tell_me_cat,
    texts.placeholder_alert_smile,
    texts.placeholder_notify_sunset,
    texts.placeholder_watch_pizza,
    texts.placeholder_let_know_baby,
    texts.placeholder_warn_sad,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({
        type: Events.onPlaceholderRotate,
        payload: { placeholdersLength: placeholders.length },
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  return { placeholderText: placeholders[placeholderIndex] };
}
