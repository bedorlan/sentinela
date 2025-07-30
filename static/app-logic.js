import {
  CONFIDENCE_THRESHOLD,
  CONSECUTIVE_DETECTIONS_REQUIRED,
  DetectionState,
  Events,
  WatchLogEventType,
} from "./constants.js";
import { generateLogId } from "./utils.js";

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
      draft.watchingLogs = [
        {
          id: generateLogId(),
          timestamp: new Date(),
          type: WatchLogEventType.START,
          prompt: action.payload.demo.prompt,
        },
      ];
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

    case Events.onDetectionVideoClip:
      const detectionLog = draft.watchingLogs.find(
        (log) => log.type === WatchLogEventType.DETECTION && !log.videoUrl,
      );
      if (detectionLog) {
        detectionLog.videoUrl = action.payload.videoUrl;
      }
      break;

    case Events.onEmailUpdateIntervalChange:
      draft.emailUpdateInterval = action.payload;
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
      draft.watchingLogs = [
        {
          id: generateLogId(),
          timestamp: new Date(),
          type: WatchLogEventType.START,
          prompt: draft.prompt,
        },
      ];
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
