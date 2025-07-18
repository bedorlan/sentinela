import * as MessagePack from "@msgpack/msgpack";
import React, { useEffect } from "react";
import ruw from "react-use-websocket";

const { default: useWebSocket } = ruw;

export const DetectionState = {
  IDLE: "idle",
  WATCHING: "watching",
  DETECTED: "detected",
};

const CONFIDENCE_THRESHOLD = 90;
const CONSECUTIVE_DETECTIONS_REQUIRED = 2;

export const Events = Object.fromEntries(
  [
    "onDemoModeSwitch",
    "onDemosLoad",
    "onDemoStart",
    "onDetectionReset",
    "onDetectionUpdate",
    "onFpsChange",
    "onImageQualityChange",
    "onLanguageChange",
    "onLanguageLoadError",
    "onLanguageLoadStart",
    "onLanguageLoadSuccess",
    "onNotificationToggle",
    "onPlaceholderRotate",
    "onPromptChange",
    "onVideoFrame",
    "onWatchingStart",
    "onWatchingStop",
  ].map((t) => [t, t]),
);

export const initialState = {
  confidence: 0,
  consecutiveDetections: 0,
  currentDemo: null,
  currentLanguage: "en",
  previousLanguage: "en",
  demoMode: false,
  demos: [],
  detectionState: DetectionState.IDLE,
  enabledNotifications: {
    sound: true,
    email: false,
    sms: false,
    webhook: false,
  },
  fps: 3,
  imageQuality: 0.9,
  isLoadingTranslation: false,
  lastReasonUpdateTime: 0,
  lastVideoFrame: null,
  placeholderIndex: 0,
  prompt: "",
  reason: "",
  texts: {},
};

export function appReducer(draft, action) {
  switch (action.type) {
    case Events.onDemoModeSwitch:
      const wasWatching =
        draft.detectionState === DetectionState.WATCHING ||
        draft.detectionState === DetectionState.DETECTED;
      draft.demoMode = action.payload.demoMode;
      draft.currentDemo = null;
      draft.prompt = "";
      draft.reason = "";
      if (wasWatching) {
        draft.detectionState = DetectionState.IDLE;
        draft.confidence = 0;
      }
      break;

    case Events.onDemoStart:
      draft.demoMode = true;
      draft.currentDemo = action.payload.demo;
      draft.prompt = action.payload.demo.prompt;
      draft.detectionState = DetectionState.WATCHING;
      draft.confidence = 0;
      draft.consecutiveDetections = 0;
      draft.reason = "";
      break;

    case Events.onDemosLoad:
      draft.demos = action.payload;
      break;

    case Events.onDetectionReset:
      if (draft.detectionState === DetectionState.DETECTED) {
        draft.detectionState = DetectionState.WATCHING;
        draft.consecutiveDetections = 0;
      }
      break;

    case Events.onDetectionUpdate:
      if (draft.detectionState !== DetectionState.WATCHING) break;
      if (!action.payload.reason) break;

      draft.confidence = action.payload.confidence;

      const currentTime = Date.now();
      const timeSinceLastReasonUpdate =
        currentTime - draft.lastReasonUpdateTime;
      if (timeSinceLastReasonUpdate >= 2000) {
        draft.reason = action.payload.reason;
        draft.lastReasonUpdateTime = currentTime;
      }
      if (action.payload.confidence < CONFIDENCE_THRESHOLD) {
        draft.consecutiveDetections = 0;
        break;
      }

      draft.consecutiveDetections++;
      if (draft.consecutiveDetections >= CONSECUTIVE_DETECTIONS_REQUIRED) {
        draft.detectionState = DetectionState.DETECTED;
        draft.reason = action.payload.reason;
        draft.lastReasonUpdateTime = currentTime;
      }
      break;

    case Events.onFpsChange:
      draft.fps = action.payload;
      break;

    case Events.onImageQualityChange:
      draft.imageQuality = action.payload;
      break;

    case Events.onLanguageChange:
      if (draft.detectionState === DetectionState.IDLE) {
        draft.previousLanguage = draft.currentLanguage;
        draft.currentLanguage = action.payload;
      }
      break;

    case Events.onLanguageLoadError:
      draft.isLoadingTranslation = false;
      draft.currentLanguage = draft.previousLanguage;
      break;

    case Events.onLanguageLoadStart:
      draft.isLoadingTranslation = true;
      break;

    case Events.onLanguageLoadSuccess:
      draft.texts = action.payload.texts;
      draft.isLoadingTranslation = false;
      break;

    case Events.onNotificationToggle:
      draft.enabledNotifications[action.payload] =
        !draft.enabledNotifications[action.payload];
      break;

    case Events.onPlaceholderRotate:
      draft.placeholderIndex =
        (draft.placeholderIndex + 1) % action.payload.placeholdersLength;
      break;

    case Events.onPromptChange:
      draft.prompt = action.payload;
      break;

    case Events.onVideoFrame:
      draft.lastVideoFrame = action.payload;
      break;

    case Events.onWatchingStart:
      draft.detectionState = DetectionState.WATCHING;
      draft.confidence = 0;
      draft.consecutiveDetections = 0;
      draft.reason = "";
      draft.lastVideoFrame = null;
      break;

    case Events.onWatchingStop:
      draft.detectionState = DetectionState.IDLE;
      draft.confidence = 0;
      break;
  }
}

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

export function useLoadDemos(state, dispatch) {
  useEffect(() => {
    fetch("/static/demos/demos.json")
      .then((response) => response.json())
      .then((data) => dispatch({ type: Events.onDemosLoad, payload: data }))
      .catch((error) => console.error("Error loading demos:", error));
  }, []);
}

export function useDetectionSound(state, dispatch) {
  const detectionSoundRef = React.useRef(null);
  const { detectionState, enabledNotifications } = state;

  useEffect(() => {
    detectionSoundRef.current = new Audio("/static/sound/detected.mp3");
    detectionSoundRef.current.preload = "auto";
  }, []);

  useEffect(() => {
    if (
      detectionState === DetectionState.DETECTED &&
      enabledNotifications.sound &&
      detectionSoundRef.current
    ) {
      detectionSoundRef.current
        .play()
        .catch((e) => console.error("Failed to play sound:", e));
    }
  }, [detectionState, enabledNotifications.sound]);

  return { detectionSoundRef };
}

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

export function useLanguageLoader(state, dispatch) {
  const { currentLanguage } = state;

  useEffect(() => {
    const loadTexts = async () => {
      try {
        dispatch({ type: Events.onLanguageLoadStart });

        const response = await fetch(`/translations/${currentLanguage}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
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
          payload: { error: error.message }
        });
      }
    };

    loadTexts();
  }, [currentLanguage]);

  return {};
}

export function useVideoDetection(state, dispatch) {
  const { detectionState, lastVideoFrame, prompt } = state;

  const isWatching =
    detectionState === DetectionState.WATCHING ||
    detectionState === DetectionState.DETECTED;
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = isWatching
    ? `${wsProtocol}//${window.location.host}/ws/frames`
    : null;

  const { sendMessage, lastMessage, readyState } = useWebSocket(wsUrl, {
    shouldReconnect: () => isWatching,
    reconnectInterval: 3000,
    reconnectAttempts: 10,
  });

  const isReadyWatching = isWatching && readyState === WebSocket.OPEN;

  useEffect(
    function watchForWebSocketMessages() {
      const processMessage = async () => {
        if (!lastMessage) return;

        try {
          const arrayBuffer = await lastMessage.data.arrayBuffer();
          const decodedData = MessagePack.decode(new Uint8Array(arrayBuffer));
          const newConfidence = parseFloat(decodedData.confidence);
          const newReason = decodedData.reason;

          dispatch({
            type: Events.onDetectionUpdate,
            payload: {
              confidence: newConfidence,
              reason: newReason,
            },
          });
        } catch (e) {
          console.error("Error decoding MessagePack:", e);
        }
      };

      processMessage();
    },
    [lastMessage],
  );

  useEffect(
    function watchForVideoFrames() {
      const processFrame = async () => {
        if (lastVideoFrame && isReadyWatching) {
          const arrayBuffer = await lastVideoFrame.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const packed = MessagePack.encode({
            prompt: prompt,
            frame: uint8Array,
          });
          sendMessage(packed);
        }
      };

      processFrame();
    },
    [isReadyWatching, lastVideoFrame, prompt, sendMessage],
  );

  return {};
}
