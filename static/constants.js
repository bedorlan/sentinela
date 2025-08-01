export const CONFIDENCE_THRESHOLD = 90;
export const CONSECUTIVE_DETECTIONS_REQUIRED = 2;
export const RECORDING_ROTATION_INTERVAL = 5000;
export const POST_DETECTION_RECORDING_DURATION = 5000;
export const EMAIL_WITHOUT_VIDEO_DELAY = 5000;

export const Events = Object.fromEntries(
  [
    "onDemoModeSwitch",
    "onDemosLoad",
    "onDemoStart",
    "onDetectionReset",
    "onDetectionUpdate",
    "onDetectionVideoClip",
    "onEmailNotificationSent",
    "onEmailUpdateIntervalChange",
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

export const WatchLogSummaryLevel = {
  SECOND: 0,
  ONE_MINUTE: 1,
  TEN_MINUTES: 2,
  THIRTY_MINUTES: 3,
  ONE_HOUR: 4,
  TWO_HOURS: 5,
};

export const SUMMARY_TIME_WINDOWS = {
  [WatchLogSummaryLevel.ONE_MINUTE]: { timeWindow: 60 * 1000 },
  [WatchLogSummaryLevel.TEN_MINUTES]: { timeWindow: 10 * 60 * 1000 },
  [WatchLogSummaryLevel.THIRTY_MINUTES]: { timeWindow: 30 * 60 * 1000 },
  [WatchLogSummaryLevel.ONE_HOUR]: { timeWindow: 60 * 60 * 1000 },
  [WatchLogSummaryLevel.TWO_HOURS]: { timeWindow: 2 * 60 * 60 * 1000 },
};

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
  emailUpdateInterval: null,
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
