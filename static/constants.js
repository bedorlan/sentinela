// Minimum confidence level required for a detection to be valid
export const CONFIDENCE_THRESHOLD = 90;

// Number of consecutive detections needed before triggering an alert
export const CONSECUTIVE_DETECTIONS_REQUIRED = 2;

// Interval in milliseconds for rotating video recordings
export const RECORDING_ROTATION_INTERVAL = 5000;

// Duration in milliseconds to continue recording after detection
export const POST_DETECTION_RECORDING_DURATION = 4000;

// Delay in milliseconds before sending email notification without video attachment
export const EMAIL_WITHOUT_VIDEO_DELAY = 5000;

// Event constants for the application's event system.
// for more details on the events: check the app-logic reducer
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

// Possible states for the detection system
export const DetectionState = {
  IDLE: "idle",
  WATCHING: "watching",
  DETECTED: "detected",
};

// Types of events that can be logged during watching sessions
export const WatchLogEventType = {
  START: "start",
  STOP: "stop",
  UPDATE: "update",
  DETECTION: "detection",
  SUMMARY: "summary",
};

// Summary aggregation levels for watch logs
export const WatchLogSummaryLevel = {
  SECOND: 0,
  ONE_MINUTE: 1,
  TEN_MINUTES: 2,
  THIRTY_MINUTES: 3,
  ONE_HOUR: 4,
  TWO_HOURS: 5,
};

// Time windows in milliseconds for each summary level
export const SUMMARY_TIME_WINDOWS = {
  [WatchLogSummaryLevel.ONE_MINUTE]: { timeWindow: 60 * 1000 },
  [WatchLogSummaryLevel.TEN_MINUTES]: { timeWindow: 10 * 60 * 1000 },
  [WatchLogSummaryLevel.THIRTY_MINUTES]: { timeWindow: 30 * 60 * 1000 },
  [WatchLogSummaryLevel.ONE_HOUR]: { timeWindow: 60 * 60 * 1000 },
  [WatchLogSummaryLevel.TWO_HOURS]: { timeWindow: 2 * 60 * 60 * 1000 },
};

// Initial state object for the application's global state management
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
