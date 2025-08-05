/**
 * Rotating Placeholder Hook - Cycles through example prompts in the input field
 * 
 * This hook rotates through different placeholder text examples every 3 seconds to give
 * users inspiration for detection prompts. It helps users understand what kind of prompts
 * they can write by showing practical examples like "tell me when a cat appears" or
 * "alert me when someone smiles".
 */

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
