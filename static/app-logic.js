import * as MessagePack from "@msgpack/msgpack";
import React, { useEffect } from "react";
import ruw from "react-use-websocket";

const { default: useWebSocket } = ruw;

const CONFIDENCE_THRESHOLD = 90;
const CONSECUTIVE_DETECTIONS_REQUIRED = 2;

export const DetectionState = {
  IDLE: "idle",
  WATCHING: "watching",
  DETECTED: "detected",
};

export const WatchLogEventType = {
  START: "start",
  STOP: "stop",
  UPDATE: "update",
  DETECTION: "detection",
  SUMMARY: "summary",
};

const WatchLogSummaryLevel = {
  SECOND: 0,
  ONE_MINUTE: 1,
  TEN_MINUTES: 2,
  THIRTY_MINUTES: 3,
  ONE_HOUR: 4,
  TWO_HOURS: 5,
};

export const Events = Object.fromEntries(
  [
    "onDemoModeSwitch",
    "onDemosLoad",
    "onDemoStart",
    "onDetectionReset",
    "onDetectionUpdate",
    "onFpsChange",
    "onImageQualityChange",
    "onInitLoad",
    "onLanguageChange",
    "onLanguageLoadError",
    "onLanguageLoadStart",
    "onLanguageLoadSuccess",
    "onLogAdd",
    "onLogClear",
    "onLogSummarize",
    "onNotificationToggle",
    "onPlaceholderRotate",
    "onPromptChange",
    "onToEmailAddressChange",
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
  toEmailAddress: null,
  watchingLogs: [],
  watchingStartTime: null,
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
      draft.watchingStartTime = Date.now();
      draft.watchingLogs.unshift({
        id: generateLogId(),
        timestamp: new Date(),
        type: WatchLogEventType.START,
        prompt: action.payload.demo.prompt,
      });
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
      } else {
        draft.consecutiveDetections++;
      }

      if (draft.consecutiveDetections < CONSECUTIVE_DETECTIONS_REQUIRED) {
        draft.watchingLogs.unshift({
          id: generateLogId(),
          timestamp: new Date(),
          type: WatchLogEventType.UPDATE,
          confidence: action.payload.confidence,
          reason: action.payload.reason,
          prompt: draft.prompt,
        });
        break;
      }

      draft.detectionState = DetectionState.DETECTED;
      draft.reason = action.payload.reason;
      draft.lastReasonUpdateTime = currentTime;
      draft.watchingLogs.unshift({
        id: generateLogId(),
        timestamp: new Date(),
        type: WatchLogEventType.DETECTION,
        confidence: action.payload.confidence,
        reason: action.payload.reason,
        prompt: draft.prompt,
      });
      break;

    case Events.onFpsChange:
      draft.fps = action.payload;
      break;

    case Events.onImageQualityChange:
      draft.imageQuality = action.payload;
      break;

    case Events.onInitLoad:
      draft.toEmailAddress = action.payload.toEmailAddress;
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

    case Events.onLogAdd:
      draft.watchingLogs.unshift({
        id: generateLogId(),
        timestamp: new Date(),
        type: action.payload.type,
        confidence: action.payload.confidence,
        reason: action.payload.reason,
        prompt: action.payload.prompt,
      });
      break;

    case Events.onLogClear:
      draft.watchingLogs = [];
      break;

    case Events.onLogSummarize:
      const idsToRemove = new Set(action.payload.logIds);
      draft.watchingLogs = [
        {
          id: generateLogId(),
          timestamp: new Date(),
          type: WatchLogEventType.SUMMARY,
          reason: action.payload.summary,
          summaryLevel: action.payload.summaryLevel,
        },
        ...draft.watchingLogs.filter((log) => !idsToRemove.has(log.id)),
      ];
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

    case Events.onToEmailAddressChange:
      draft.toEmailAddress = action.payload;
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
      draft.watchingStartTime = Date.now();
      draft.watchingLogs.unshift({
        id: generateLogId(),
        timestamp: new Date(),
        type: WatchLogEventType.START,
        prompt: draft.prompt,
      });
      break;

    case Events.onWatchingStop:
      draft.detectionState = DetectionState.IDLE;
      draft.confidence = 0;
      draft.watchingLogs.unshift({
        id: generateLogId(),
        timestamp: new Date(),
        type: WatchLogEventType.STOP,
        prompt: draft.prompt,
      });
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
          const response = await fetch(`/translations/${languageCode}`);
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

      prefetchPromisesRef.current[languageCode] = prefetchTranslation();
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

        const response = await fetch(`/translations/${currentLanguage}`);
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

export function useVideoDetection(state, dispatch) {
  const { detectionState, lastVideoFrame, prompt, currentLanguage } = state;

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
            language: currentLanguage,
          });
          sendMessage(packed);
        }
      };

      processFrame();
    },
    [isReadyWatching, lastVideoFrame, prompt, currentLanguage, sendMessage],
  );

  return {};
}

export function useEmailNotification(state, dispatch) {
  const [emailSentForDetection, setEmailSentForDetection] =
    React.useState(false);
  const {
    detectionState,
    enabledNotifications,
    prompt,
    reason,
    confidence,
    toEmailAddress,
  } = state;

  useEffect(() => {
    const sendEmailNotification = async () => {
      if (detectionState === DetectionState.IDLE && emailSentForDetection) {
        setEmailSentForDetection(false);
        return;
      }

      if (
        detectionState !== DetectionState.DETECTED ||
        !enabledNotifications.email ||
        emailSentForDetection
      ) {
        return;
      }

      const detectionTime = new Date().toLocaleString();
      const emailData = {
        subject: `Sentinela Detection Alert!`,
        html_body: `
          <h2>Detection Alert</h2>
          <p><strong>Time:</strong> ${detectionTime}</p>
          <p><strong>Prompt:</strong> ${prompt}</p>
          <p><strong>Confidence:</strong> ${confidence}%</p>
          <p><strong>Reason:</strong> ${reason}</p>
        `,
        to_email: toEmailAddress,
      };

      try {
        const response = await fetch("/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(emailData),
        });

        if (response.ok) {
          setEmailSentForDetection(true);
        } else {
          console.error("Failed to send email notification:", response.status);
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
    };

    sendEmailNotification();
  }, [
    confidence,
    detectionState,
    emailSentForDetection,
    enabledNotifications.email,
    prompt,
    reason,
  ]);
}

export function useInitLoader(state, dispatch) {
  useEffect(() => {
    const loadInitData = async () => {
      try {
        const response = await fetch("/init");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

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

export function useWatchingDuration(state) {
  const [watchingDuration, setWatchingDuration] = React.useState("");
  const { watchingStartTime, detectionState, texts } = state;

  useEffect(() => {
    if (!watchingStartTime) {
      setWatchingDuration("");
      return;
    }

    const formatDuration = (milliseconds) => {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        const remainingHours = hours % 24;
        return `${days} ${texts.days}, ${remainingHours} ${texts.hours}`;
      } else if (hours > 0) {
        const remainingMinutes = minutes % 60;
        return `${hours} ${texts.hours}, ${remainingMinutes} ${texts.minutes}`;
      } else if (minutes > 0) {
        const remainingSeconds = seconds % 60;
        return `${minutes} ${texts.minutes}, ${remainingSeconds} ${texts.seconds}`;
      } else {
        return `${seconds} ${texts.seconds}`;
      }
    };

    const updateDuration = () => {
      const duration = Date.now() - watchingStartTime;
      setWatchingDuration(formatDuration(duration));
    };

    updateDuration();

    if (
      detectionState !== DetectionState.WATCHING &&
      detectionState !== DetectionState.DETECTED
    ) {
      return;
    }

    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [watchingStartTime, detectionState, texts]);

  return watchingDuration;
}

const SUMMARY_CONFIG = {
  [WatchLogSummaryLevel.ONE_MINUTE]: {
    threshold: 60,
    sourceLevel: null,
  },
  [WatchLogSummaryLevel.TEN_MINUTES]: {
    threshold: 10,
    sourceLevel: WatchLogSummaryLevel.ONE_MINUTE,
  },
};

export function useAutoSummarization(state, dispatch) {
  const { watchingLogs } = state;
  const [summarizationStates, setSummarizationStates] = React.useState({
    [WatchLogSummaryLevel.ONE_MINUTE]: { isSummarizing: false },
    [WatchLogSummaryLevel.TEN_MINUTES]: { isSummarizing: false },
  });

  useEffect(() => {
    const checkAndSummarizeLevel = async (level, config) => {
      if (summarizationStates[level].isSummarizing) return;

      let eligibleLogs;
      if (config.sourceLevel === null) {
        eligibleLogs = watchingLogs.filter(
          (log) => log.type === WatchLogEventType.UPDATE,
        );
      } else {
        eligibleLogs = watchingLogs.filter(
          (log) =>
            log.type === WatchLogEventType.SUMMARY &&
            log.summaryLevel === config.sourceLevel,
        );
      }

      if (eligibleLogs.length < config.threshold) return;

      const logsToSummarize = eligibleLogs.slice(-config.threshold);
      const logIds = logsToSummarize.map((log) => log.id);

      setSummarizationStates((prev) => ({
        ...prev,
        [level]: { isSummarizing: true },
      }));

      try {
        const response = await fetch("/summarize-watch-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: logsToSummarize.map((log) => log.reason),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        dispatch({
          type: Events.onLogSummarize,
          payload: {
            summary: data.summary,
            logIds: logIds,
            summaryLevel: parseInt(level),
          },
        });
      } catch (error) {
        console.error(`Error summarizing logs for level ${level}:`, error);
      } finally {
        setSummarizationStates((prev) => ({
          ...prev,
          [level]: { isSummarizing: false },
        }));
      }
    };

    Object.entries(SUMMARY_CONFIG).forEach(([level, config]) => {
      checkAndSummarizeLevel(level, config);
    });
  }, [watchingLogs.length, summarizationStates]);

  return { summarizationStates };
}

export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function generateLogId() {
  return `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
