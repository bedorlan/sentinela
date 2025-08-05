/**
 * Main logic for Sentinela web app
 *
 * This file implements the core application reducer following a Redux-like pattern
 * with Immer for immutable state updates. The architecture uses:
 * - Event-driven state management with action dispatching
 * - Immer draft pattern for safe state mutations
 * - Real-time detection pipeline with confidence thresholds
 * - Comprehensive logging system for monitoring
 */

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
    // Triggered when user toggles demo mode on/off via the demo mode switch
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

    // Triggered when user clicks on a demo card to start a demo scenario
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

    // Triggered when demo data is loaded from the server/API
    case Events.onDemosLoad:
      draft.demos = action.payload;
      break;

    // Triggered after a detection small delay, to go back to watch mode
    case Events.onDetectionReset:
      if (draft.detectionState === DetectionState.DETECTED) {
        draft.detectionState = DetectionState.WATCHING;
        draft.confidence = 0;
        draft.consecutiveDetections = 0;
      }
      break;

    // Triggered when getting AI inference results
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

    // Triggered when a video clip is generated and ready after a detection event
    case Events.onDetectionVideoClip:
      const detectionLog = draft.watchingLogs.find(
        (log) => log.type === WatchLogEventType.DETECTION && !log.videoUrl,
      );
      if (detectionLog) {
        detectionLog.videoUrl = action.payload.videoUrl;
      }
      break;

    // Triggered when an email notification has been successfully sent for a detection
    case Events.onEmailNotificationSent:
      const logToUpdate = draft.watchingLogs.find(
        (log) => log.id === action.payload.logId,
      );
      if (logToUpdate) {
        logToUpdate.emailNotificationSent = true;
      }
      break;

    // unused
    case Events.onEmailUpdateIntervalChange:
      draft.emailUpdateInterval = action.payload;
      break;

    // unused
    case Events.onFpsChange:
      draft.fps = action.payload;
      break;

    // unused
    case Events.onImageQualityChange:
      draft.imageQuality = action.payload;
      break;

    // Triggered when the application initializes and loads initial configuration
    case Events.onInitLoad:
      draft.toEmailAddress = action.payload.toEmailAddress;
      break;

    // Triggered when user selects a different language
    case Events.onLanguageChange:
      if (draft.detectionState === DetectionState.IDLE) {
        draft.previousLanguage = draft.currentLanguage;
        draft.currentLanguage = action.payload;
      }
      break;

    // Triggered when there's an error loading language translations
    case Events.onLanguageLoadError:
      draft.isLoadingTranslation = false;
      draft.currentLanguage = draft.previousLanguage;
      break;

    // Triggered when language translation loading begins
    case Events.onLanguageLoadStart:
      draft.isLoadingTranslation = true;
      break;

    // Triggered when language translation are success
    case Events.onLanguageLoadSuccess:
      draft.texts = action.payload.texts;
      draft.isLoadingTranslation = false;
      break;

    // Triggered when manually adding a log entry to the watching logs
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

    // unused
    case Events.onLogClear:
      draft.watchingLogs = [];
      break;

    // Triggered when AI summarizes watch log entries
    case Events.onLogSummarize:
      if (
        draft.detectionState !== DetectionState.WATCHING &&
        draft.detectionState !== DetectionState.DETECTED
      )
        break;

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

    // Triggered when user toggles notification settings (sound, email)
    case Events.onNotificationToggle:
      draft.enabledNotifications[action.payload] =
        !draft.enabledNotifications[action.payload];
      break;

    // Triggered periodically to rotate placeholder text in the prompt input field
    case Events.onPlaceholderRotate:
      draft.placeholderIndex =
        (draft.placeholderIndex + 1) % action.payload.placeholdersLength;
      break;

    // Triggered when user types or modifies the detection prompt
    case Events.onPromptChange:
      draft.prompt = action.payload;
      break;

    // Triggered when user changes the email address for notifications
    case Events.onToEmailAddressChange:
      draft.toEmailAddress = action.payload;
      break;

    // Triggered when a new video frame is captured from the camera/screen
    case Events.onVideoFrame:
      draft.lastVideoFrame = action.payload;
      break;

    // Triggered when user clicks the start watching button
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

    // Triggered when user clicks the stop watching button
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
