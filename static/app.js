import { createRoot } from "react-dom";
import { useImmerReducer } from "use-immer";
import React, { useEffect, useCallback } from "react";
import {
  appReducer,
  DetectionState,
  Events,
  initialState,
  isValidEmail,
  useAutoSummarization,
  useCloseWarning,
  useDetectionReset,
  useDetectionSound,
  useEmailNotification,
  useInitLoader,
  useLanguageLoader,
  useLoadDemos,
  usePeriodicEmailUpdates,
  useRotatingPlaceholder,
  useVideoDetection,
  useVideoStream,
  useWatchingDuration,
  WatchLogEventType,
  WatchLogSummaryLevel,
} from "./static/app-logic.js";

function App() {
  const [state, dispatch] = useImmerReducer(appReducer, initialState);
  const {
    confidence,
    currentLanguage,
    demoMode,
    demos,
    detectionState,
    emailUpdateInterval,
    enabledNotifications,
    fps,
    imageQuality,
    isLoadingTranslation,
    prompt,
    reason,
    texts,
    toEmailAddress,
    watchingLogs,
  } = state;

  const { placeholderText } = useRotatingPlaceholder(state, dispatch);
  const { videoRef, ready: isVideoStreamReady } = useVideoStream(state);
  const watchingDuration = useWatchingDuration(state);
  useAutoSummarization(state, dispatch);
  useCloseWarning(state);
  useDetectionReset(state, dispatch);
  useDetectionSound(state, dispatch);
  useEmailNotification(state, dispatch);
  useInitLoader(state, dispatch);
  useLanguageLoader(state, dispatch);
  useLoadDemos(state, dispatch);
  usePeriodicEmailUpdates(state, dispatch);
  useVideoDetection(state, dispatch);

  const isWatching =
    detectionState == DetectionState.WATCHING ||
    detectionState == DetectionState.DETECTED;

  return (
    <MainUI
      confidence={confidence}
      currentLanguage={currentLanguage}
      demoMode={demoMode}
      demos={demos}
      detectionState={detectionState}
      emailUpdateInterval={emailUpdateInterval}
      enabledNotifications={enabledNotifications}
      fps={fps}
      imageQuality={imageQuality}
      isLoadingTranslation={isLoadingTranslation}
      isRecording={isWatching}
      isVideoStreamReady={isVideoStreamReady}
      isWatching={isWatching}
      placeholderText={placeholderText}
      prompt={prompt}
      reason={reason}
      texts={texts}
      toEmailAddress={toEmailAddress}
      videoRef={videoRef}
      watchingDuration={watchingDuration}
      watchingLogs={watchingLogs}
      onDemoSelect={(demo) => {
        dispatch({ type: Events.onDemoStart, payload: { demo } });
        console.log(`Starting demo: ${demo.demo_name}`);
      }}
      onEmailUpdateIntervalChange={(level) =>
        dispatch({ type: Events.onEmailUpdateIntervalChange, payload: level })
      }
      onHandleFrame={(blob) =>
        dispatch({ type: Events.onVideoFrame, payload: blob })
      }
      onModeToggle={() => {
        dispatch({
          type: Events.onDemoModeSwitch,
          payload: { demoMode: !demoMode },
        });
      }}
      onNotificationToggle={(notificationKey) =>
        dispatch({
          type: Events.onNotificationToggle,
          payload: notificationKey,
        })
      }
      onStartWatching={() => {
        dispatch({ type: Events.onWatchingStart });
        console.log(`Starting to watch for: ${prompt}`);
      }}
      onStopWatching={() => {
        dispatch({ type: Events.onWatchingStop });
        console.log("Stopped watching");
      }}
      onPromptChange={(newPrompt) =>
        dispatch({ type: Events.onPromptChange, payload: newPrompt })
      }
      onLanguageSwitch={(languageCode) =>
        dispatch({ type: Events.onLanguageChange, payload: languageCode })
      }
      onToEmailAddressChange={(emailAddress) =>
        dispatch({ type: Events.onToEmailAddressChange, payload: emailAddress })
      }
    />
  );
}

function MainUI({
  confidence,
  currentLanguage,
  demoMode,
  demos,
  detectionState,
  emailUpdateInterval,
  enabledNotifications,
  fps,
  imageQuality,
  isLoadingTranslation,
  isRecording,
  isVideoStreamReady,
  isWatching,
  placeholderText,
  prompt,
  reason,
  texts,
  toEmailAddress,
  videoRef,
  watchingDuration,
  watchingLogs,
  // events
  onDemoSelect,
  onEmailUpdateIntervalChange,
  onHandleFrame,
  onLanguageSwitch,
  onModeToggle,
  onNotificationToggle,
  onPromptChange,
  onStartWatching,
  onStopWatching,
  onToEmailAddressChange,
}) {
  const [isLogCollapsed, setIsLogCollapsed] = React.useState(true);

  const hasValidEmail = isValidEmail(toEmailAddress);
  const needsEmail = enabledNotifications.email && !hasValidEmail;
  const isWatchingButtonDisabled = !isWatching && (!prompt || needsEmail);

  const filteredLogs = watchingLogs.filter(
    (log) =>
      log.type === WatchLogEventType.SUMMARY ||
      log.type === WatchLogEventType.DETECTION ||
      log.type === WatchLogEventType.START ||
      log.type === WatchLogEventType.STOP,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white overflow-hidden relative">
      {/* Animated background stars */}
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mb-2">
            <h1 className="text-4xl font-bold animate-bounce">
              <span className="inline-block">👁️</span> Sentinela
            </h1>
          </div>

          <div className="max-w-4xl mx-auto relative">
            <p className="text-2xl text-blue-200 text-center">
              {texts.tagline}
            </p>

            {/* Large screens: Language switcher positioned absolutely on the right */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 lg:block hidden">
              <LanguageSwitcher
                currentLanguage={currentLanguage}
                onLanguageSwitch={onLanguageSwitch}
              />
            </div>
          </div>

          {/* Small screens: Language switcher centered below the text */}
          <div className="lg:hidden flex justify-center mt-4">
            <LanguageSwitcher
              currentLanguage={currentLanguage}
              onLanguageSwitch={onLanguageSwitch}
            />
          </div>
        </div>

        <TranslationLoadingModal
          isLoading={isLoadingTranslation}
          texts={texts}
        />

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Video Feed */}
          <div className="bg-black/30 backdrop-blur rounded-3xl p-4 mb-3 border border-white/20">
            {demoMode && (
              <div className="mb-4 flex justify-center">
                <button
                  onClick={onModeToggle}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all border border-white/30"
                >
                  📹 Switch to Webcam
                </button>
              </div>
            )}
            <div className="aspect-[16/9] sm:aspect-[16/8] md:aspect-[16/7] bg-black/50 rounded-2xl flex items-center justify-center relative overflow-hidden">
              <VideoCamera
                className="w-full h-full object-cover"
                fps={fps}
                imageQuality={imageQuality}
                isRecording={isRecording}
                isVideoStreamReady={isVideoStreamReady}
                videoRef={videoRef}
                onFrame={onHandleFrame}
              />

              {/* Watching duration display */}
              {watchingDuration && (
                <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1 pointer-events-none">
                  <p className="text-xs font-mono text-white/70">
                    {texts.watching_for} {watchingDuration}
                  </p>
                </div>
              )}

              {isWatching && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Scanning effect */}
                  {detectionState === DetectionState.WATCHING && (
                    <div className="absolute inset-0">
                      <div className="h-1 bg-yellow-400 animate-scan" />
                    </div>
                  )}

                  {/* Detection celebration */}
                  {detectionState === DetectionState.DETECTED && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-6 py-3">
                      <div className="flex items-center space-x-3 animate-zoomIn">
                        <span className="text-xl">🎉</span>
                        <span className="text-base font-bold text-yellow-400">
                          {texts.detected}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Confidence meter */}
                  {detectionState === DetectionState.WATCHING && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/60 rounded-full p-2">
                        <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-400 to-green-400 transition-all duration-300"
                            style={{ width: `${confidence}%` }}
                          />
                        </div>
                        <p className="text-center mt-1 text-sm">
                          {texts.confidence} {Math.round(confidence)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Confidence Reason Alert - Píldora Style */}
          {reason && (
            <div className="flex justify-center mb-2 animate-fadeIn">
              <div
                className={`backdrop-blur-lg rounded-full px-6 py-3 flex items-center space-x-3 max-w-2xl shadow-lg ${
                  detectionState === DetectionState.DETECTED
                    ? "bg-gradient-to-r from-yellow-400/20 to-green-400/20 border border-yellow-400/30"
                    : "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-blue-400/30"
                }`}
              >
                <span className="text-lg">
                  {detectionState === DetectionState.DETECTED ? "⭐" : "🔍"}
                </span>
                <p
                  className={`text-sm italic font-light ${
                    detectionState === DetectionState.DETECTED
                      ? "text-yellow-200"
                      : "text-blue-200"
                  }`}
                >
                  {reason}
                </p>
              </div>
            </div>
          )}

          {/* Magic Input */}
          <div className="bg-white/10 backdrop-blur rounded-3xl p-8 border border-white/20">
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                {texts.what_to_watch}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder={placeholderText}
                className="w-full px-6 py-4 rounded-2xl bg-white/10 border border-white/30 text-xl placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:bg-white/20 transition-all resize-y min-h-[120px]"
                disabled={isWatching}
              />
            </div>

            {/* Notification Type */}
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                {texts.notifications_label}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🔊", label: texts.notification_sound, key: "sound" },
                  { icon: "📧", label: texts.notification_email, key: "email" },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => onNotificationToggle(option.key)}
                    className={`p-3 rounded-xl border transition-all hover:scale-105 ${
                      enabledNotifications[option.key]
                        ? "bg-yellow-400/30 border-yellow-400 hover:bg-yellow-400/40"
                        : "bg-white/10 hover:bg-white/20 border-white/30"
                    }`}
                    disabled={isWatching}
                  >
                    <p className="text-xl mb-1">{option.icon}</p>
                    <p className="text-xs">{option.label}</p>
                  </button>
                ))}
              </div>
              {enabledNotifications.email && (
                <div className="mt-3">
                  <p className="text-sm text-white mb-2">
                    ✅ I'll send you detection emails to:
                  </p>
                  <input
                    type="email"
                    value={toEmailAddress || ""}
                    onChange={(e) => onToEmailAddressChange(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/30 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:bg-white/20 transition-all"
                    disabled={isWatching}
                  />
                </div>
              )}
            </div>

            {/* Regular Email Updates - Only show when email is enabled */}
            {enabledNotifications.email && (
              <div className="mb-6">
                <label className="block text-xl mb-3 font-semibold">
                  🕐 Should I also send you regular updates?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: "Every 30 mins",
                      level: WatchLogSummaryLevel.THIRTY_MINUTES,
                    },
                    {
                      label: "Every hour",
                      level: WatchLogSummaryLevel.ONE_HOUR,
                    },
                    {
                      label: "Every 2 hours",
                      level: WatchLogSummaryLevel.TWO_HOURS,
                    },
                  ].map((option) => (
                    <button
                      key={option.level}
                      onClick={() =>
                        onEmailUpdateIntervalChange(
                          emailUpdateInterval === option.level
                            ? null
                            : option.level,
                        )
                      }
                      className={`p-3 rounded-xl border transition-all hover:scale-105 ${
                        emailUpdateInterval === option.level
                          ? "bg-yellow-400/30 border-yellow-400 hover:bg-yellow-400/40"
                          : "bg-white/10 hover:bg-white/20 border-white/30"
                      }`}
                      disabled={isWatching}
                    >
                      <p className="text-sm">{option.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={isWatching ? onStopWatching : onStartWatching}
              disabled={isWatchingButtonDisabled}
              className={`w-full py-5 rounded-2xl text-2xl font-bold transition-all transform hover:scale-105 ${
                isWatching
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 animate-pulse"
              }`}
            >
              {isWatching ? texts.stop_watching : texts.start_watching}
            </button>
          </div>

          {/* Watching Session Log */}
          <div className="mt-12 bg-white/10 backdrop-blur rounded-3xl p-6 border border-white/20">
            <button
              onClick={() => setIsLogCollapsed(!isLogCollapsed)}
              className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
            >
              <h2 className="text-xl font-bold flex items-center">
                📋 Watching Log
              </h2>
              <span
                className={`text-xl transition-transform duration-200 ${
                  isLogCollapsed ? "-rotate-90" : "rotate-180"
                }`}
              >
                ⌃
              </span>
            </button>

            {/* Real log entries from state */}
            {!isLogCollapsed && (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mt-4">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p className="text-sm">
                        No logs yet. Start watching to see activity here.
                      </p>
                    </div>
                  ) : (
                    filteredLogs.map((entry) => {
                      const formattedTime = new Date(
                        entry.timestamp,
                      ).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      });

                      const getSummaryLevelStyling = (level) => {
                        switch (level) {
                          case WatchLogSummaryLevel.ONE_MINUTE:
                            return "bg-blue-400/10 border-blue-400/30";
                          case WatchLogSummaryLevel.TEN_MINUTES:
                            return "bg-purple-400/20 border-purple-400/40";
                          case WatchLogSummaryLevel.THIRTY_MINUTES:
                            return "bg-yellow-400/30 border-yellow-400/50 shadow-yellow-400/20 shadow-lg";
                          case WatchLogSummaryLevel.ONE_HOUR:
                            return "bg-orange-400/40 border-orange-400/60 shadow-orange-400/30 shadow-xl";
                          case WatchLogSummaryLevel.TWO_HOURS:
                            return "bg-red-400/50 border-red-400/70 shadow-red-400/40 shadow-2xl";
                          default:
                            return "bg-white/5 border-white/20";
                        }
                      };

                      return (
                        <div
                          key={entry.id}
                          className={`p-2 rounded-lg border flex items-center justify-between ${
                            entry.type === WatchLogEventType.DETECTION
                              ? "bg-yellow-400/20 border-yellow-400/40"
                              : entry.type === WatchLogEventType.START
                              ? "bg-green-400/20 border-green-400/40"
                              : entry.type === WatchLogEventType.STOP
                              ? "bg-red-400/20 border-red-400/40"
                              : entry.type === WatchLogEventType.SUMMARY
                              ? getSummaryLevelStyling(entry.summaryLevel)
                              : "bg-white/5 border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-sm">
                              {entry.type === WatchLogEventType.DETECTION &&
                                "🚨"}
                              {entry.type === WatchLogEventType.START && "▶️"}
                              {entry.type === WatchLogEventType.STOP && "⏹️"}
                              {entry.type === WatchLogEventType.UPDATE && "✅"}
                              {entry.type === WatchLogEventType.SUMMARY && "✅"}
                            </span>
                            <p className="text-xs text-gray-400">
                              {formattedTime}
                            </p>
                            <p className="text-sm">
                              {entry.reason ? (
                                <span className="italic">{entry.reason}</span>
                              ) : entry.type === WatchLogEventType.START ? (
                                <>
                                  Started watching:{" "}
                                  <span className="italic">{entry.prompt}</span>
                                </>
                              ) : entry.type === WatchLogEventType.STOP ? (
                                "Stopped watching"
                              ) : (
                                ""
                              )}
                            </p>
                            {entry.type === WatchLogEventType.DETECTION &&
                              entry.confidence && (
                                <span className="text-xs text-yellow-300 ml-2">
                                  ({Math.round(entry.confidence)}%)
                                </span>
                              )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 text-center">
                  <button className="px-4 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all">
                    📥 Export Log
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Fun Examples */}
          <div className="mt-8 text-center">
            <p className="text-lg mb-4 text-blue-200">{texts.try_examples}</p>
            <div className="flex flex-wrap justify-center gap-3">
              {demos.map((demo) => (
                <button
                  key={demo.demo_name}
                  onClick={() => onDemoSelect(demo)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all hover:scale-105"
                  disabled={isWatching}
                >
                  {texts[demo.translation_key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          100% { transform: translateY(400px); }
        }
        
        @keyframes zoomIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .animate-scan {
          animation: scan 2s linear infinite;
        }
        
        .animate-zoomIn {
          animation: zoomIn 0.5s ease-out;
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function LanguageSwitcher({ currentLanguage, onLanguageSwitch }) {
  const browserLanguage = navigator.language;
  const languageCode = browserLanguage.split("-")[0];

  if (languageCode === "en" && currentLanguage === "en") {
    return null;
  }

  const isEnglishActive = currentLanguage === "en";
  const targetLanguage = isEnglishActive ? languageCode : "en";
  const languageName = isEnglishActive
    ? new Intl.DisplayNames(["en"], { type: "language" }).of(languageCode)
    : "English";

  const buttonConfig = isEnglishActive
    ? {
        gradient: "from-blue-500/20 to-purple-500/20",
        hoverGradient: "from-blue-500/40 to-purple-500/40",
        borderColor: "border-blue-400/30",
        shadowColor: "shadow-blue-400/30",
        icon: "💬",
        iconPing: "✨",
        textColor: "text-blue-200",
        iconColor: "text-blue-300",
        shortLabel: languageCode.toUpperCase(),
      }
    : {
        gradient: "from-green-500/20 to-emerald-500/20",
        hoverGradient: "from-green-500/40 to-emerald-500/40",
        borderColor: "border-green-400/30",
        shadowColor: "shadow-green-400/30",
        icon: "✨",
        iconPing: "🔄",
        textColor: "text-green-200",
        iconColor: "text-green-300",
        shortLabel: "EN",
      };

  return (
    <button
      onClick={() => onLanguageSwitch(targetLanguage)}
      className={`group relative bg-gradient-to-r ${buttonConfig.gradient} hover:${buttonConfig.hoverGradient} backdrop-blur-sm rounded-2xl px-5 py-3 border ${buttonConfig.borderColor} hover:border-yellow-400/60 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:${buttonConfig.shadowColor} animate-pulse hover:animate-none`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <span className="text-xl group-hover:animate-bounce transition-all duration-300">
            {buttonConfig.icon}
          </span>
          <span className="absolute -top-1 -right-1 text-xs animate-ping">
            {buttonConfig.iconPing}
          </span>
        </div>

        <div className="text-left hidden sm:block">
          <div
            className={`text-xs ${buttonConfig.textColor} group-hover:text-yellow-200 transition-colors`}
          >
            Switch to
          </div>
          <div className="text-sm font-semibold text-white group-hover:text-yellow-300 transition-colors">
            {languageName}
          </div>
        </div>

        <span className="text-sm font-medium text-white group-hover:text-yellow-200 transition-colors sm:hidden">
          {buttonConfig.shortLabel}
        </span>

        <span
          className={`text-xs ${buttonConfig.iconColor} group-hover:text-yellow-400 transition-colors group-hover:animate-bounce`}
        >
          →
        </span>
      </div>

      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/0 to-orange-400/0 group-hover:from-yellow-400/20 group-hover:to-orange-400/20 transition-all duration-300 blur-sm"></div>
    </button>
  );
}

function TranslationLoadingModal({ isLoading, texts }) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-gradient-to-br from-purple-800/95 to-blue-800/95 backdrop-blur-lg rounded-3xl p-12 max-w-lg mx-4 border border-white/20 shadow-2xl animate-zoomIn text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 mx-auto relative">
            <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-yellow-400/40 to-orange-500/40 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">
              🌟
            </div>
          </div>

          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-400 animate-ping"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              ✨
            </div>
          ))}
        </div>

        <h3 className="text-3xl font-bold mb-4 text-yellow-400 animate-pulse">
          {texts.loading_translation}
        </h3>

        <p className="text-lg text-blue-200 mb-6">
          {texts.loading_please_wait}
        </p>

        <div className="flex justify-center space-x-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoCamera({
  className,
  fps,
  imageQuality,
  isRecording,
  isVideoStreamReady,
  videoRef,
  onFrame,
}) {
  const canvasRef = React.useRef(null);
  const captureIntervalRef = React.useRef(null);
  const imageCaptureRef = React.useRef(null);

  useEffect(() => {
    if (!isVideoStreamReady || !videoRef.current) return;

    const stream =
      videoRef.current.srcObject || videoRef.current.captureStream();
    if (!stream) return;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    imageCaptureRef.current = new ImageCapture(videoTrack);
  }, [isVideoStreamReady]);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !imageCaptureRef.current)
      return;

    try {
      const imageBitmap = await imageCaptureRef.current.grabFrame();

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      context.drawImage(imageBitmap, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (blob && onFrame) {
            onFrame(blob);
          }
        },
        "image/jpeg",
        imageQuality,
      );

      imageBitmap.close();
    } catch (err) {
      console.error("Error capturing frame:", err);
    }
  }, [imageQuality, onFrame]);

  useEffect(() => {
    if (isRecording) {
      captureIntervalRef.current = setInterval(captureFrame, 1000 / fps);
    } else if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }

    return () => {
      if (captureIntervalRef.current) {
        clearInterval(captureIntervalRef.current);
      }
    };
  }, [isRecording, fps, captureFrame]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={className}
        style={{ objectFit: "contain" }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
