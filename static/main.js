import { createRoot } from "react-dom";
import * as MessagePack from "@msgpack/msgpack";
import React, { useState, useEffect, useCallback } from "react";
import ruw from "react-use-websocket";

const { default: useWebSocket } = ruw;

// Detection state enum
const DetectionState = {
  IDLE: "idle",
  WATCHING: "watching",
  DETECTED: "detected",
};

const DETECTION_THRESHOLD = 90;

function MainPage() {
  const [texts, setTexts] = useState({});
  const [prompt, setPrompt] = useState("");
  const [detectionState, setDetectionState] = useState(DetectionState.IDLE);
  const [confidence, setConfidence] = useState(0);
  const [reason, setReason] = useState("");
  const [fps, setFps] = useState(1);
  const [imageQuality, setImageQuality] = useState(0.9);
  const [enabledNotifications, setEnabledNotifications] = useState({
    sound: true,
    email: false,
    sms: false,
    webhook: false,
  });
  const [showLanguagePrompt, setShowLanguagePrompt] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  useEffect(() => {
    console.log('🔄 Texts State Updated:', texts);
  }, [texts]);

  const loadTexts = async (languageCode = 'en', showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoadingTranslation(true);
      }
      
      const response = await fetch(`/translations/${languageCode}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`${languageCode} translations loaded from backend`);
        setTexts(data.translations);
        setCurrentLanguage(languageCode);
      } else {
        console.error(`Failed to load ${languageCode} translations`);
      }
    } catch (error) {
      console.error('Error loading translations:', error);
    } finally {
      if (showLoading) {
        setIsLoadingTranslation(false);
      }
    }
  };

  useEffect(() => {
    const initializeLanguage = async () => {
      await loadTexts('en');
      
      const browserLanguage = navigator.language;
      const languageCode = browserLanguage.split('-')[0];
      
      if (languageCode !== 'en') {
        setDetectedLanguage({
          code: languageCode,
          name: new Intl.DisplayNames(['en'], {type: 'language'}).of(languageCode)
        });
      }
    };

    initializeLanguage();
  }, []);

  const placeholders = [
    texts.placeholder_tell_me_cat,
    texts.placeholder_alert_smile,
    texts.placeholder_notify_sunset,
    texts.placeholder_watch_pizza,
    texts.placeholder_let_know_baby,
    texts.placeholder_warn_sad
  ];

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  useEffect(function rotatingPlaceholder() {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const detectionSoundRef = React.useRef(null);
  useEffect(() => {
    detectionSoundRef.current = new Audio("/static/sound/detected.mp3");
    detectionSoundRef.current.preload = "auto";
  }, []);

  const isWatching =
    detectionState == DetectionState.WATCHING ||
    detectionState == DetectionState.DETECTED;
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
  const handleFrame = useCallback(
    async (blob) => {
      if (blob && isReadyWatching) {
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        const packed = MessagePack.encode({
          prompt: prompt,
          frame: uint8Array,
        });

        sendMessage(packed);
      }
    },
    [isReadyWatching, prompt, sendMessage]
  );

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const handleLanguageSwitch = async (switchToDetected) => {
    if (switchToDetected && detectedLanguage) {
      setShowLanguagePrompt(false);
      await loadTexts(detectedLanguage.code, true);
    } else {
      setShowLanguagePrompt(false);
    }
  };

  const handleLanguageDismiss = () => {
    localStorage.setItem('language_prompt_dismissed', 'true');
    setShowLanguagePrompt(false);
  };

  const handleOpenLanguageSelector = () => {
    const browserLanguage = navigator.language;
    const languageCode = browserLanguage.split('-')[0];
    
    if (languageCode !== 'en') {
      setDetectedLanguage({
        code: languageCode,
        name: new Intl.DisplayNames(['en'], {type: 'language'}).of(languageCode)
      });
    }
    setShowLanguageSelector(true);
  };

  const handleLanguageSelectorSwitch = async (languageCode) => {
    setShowLanguageSelector(false);
    if (languageCode !== currentLanguage) {
      await loadTexts(languageCode, true);
    }
  };

  const handleWebSocketMessage = async (message) => {
    if (detectionState != DetectionState.WATCHING) return;

    let newConfidence = 0;
    let newReason = "";
    try {
      const arrayBuffer = await message.data.arrayBuffer();
      const data = MessagePack.decode(new Uint8Array(arrayBuffer));
      newConfidence = parseFloat(data.confidence);
      newReason = data.reason;
    } catch (e) {
      console.error("Error decoding MessagePack:", e);
      return;
    }

    setConfidence(newConfidence);
    setReason(newReason);

    if (newConfidence < DETECTION_THRESHOLD) return;

    setDetectionState(DetectionState.DETECTED);
    if (enabledNotifications.sound && detectionSoundRef.current) {
      detectionSoundRef.current
        .play()
        .catch((e) => console.error("Failed to play sound:", e));
    }

    setTimeout(() => {
      setDetectionState((detectionState) => {
        return detectionState == DetectionState.DETECTED
          ? DetectionState.WATCHING
          : detectionState;
      });
    }, 5000);
  };

  return (
    <MainUI
      confidence={confidence}
      detectionState={detectionState}
      enabledNotifications={enabledNotifications}
      fps={fps}
      imageQuality={imageQuality}
      isRecording={isReadyWatching}
      isWatching={isWatching}
      placeholderText={placeholders[placeholderIndex]}
      prompt={prompt}
      reason={reason}
      texts={texts}
      showLanguagePrompt={showLanguagePrompt}
      detectedLanguage={detectedLanguage}
      isLoadingTranslation={isLoadingTranslation}
      showLanguageSelector={showLanguageSelector}
      currentLanguage={currentLanguage}
      //
      onFpsChange={(newFps) => setFps(newFps)}
      onHandleFrame={handleFrame}
      onImageQualityChange={(newQuality) => setImageQuality(newQuality)}
      onNotificationToggle={(notificationKey) =>
        setEnabledNotifications((prev) => ({
          ...prev,
          [notificationKey]: !prev[notificationKey],
        }))
      }
      onStartWatching={() => {
        setDetectionState(DetectionState.WATCHING);
        setReason("");
        console.log(`Starting to watch for: ${prompt}`);
        console.log(`FPS: ${fps}`);
        console.log(`Image Quality: ${imageQuality}`);
      }}
      onStopWatching={() => {
        setDetectionState(DetectionState.IDLE);
        setConfidence(0);
        console.log("Stopped watching");
      }}
      onPromptChange={(newPrompt) => setPrompt(newPrompt)}
      onLanguageSwitch={handleLanguageSwitch}
      onLanguageDismiss={handleLanguageDismiss}
      onOpenLanguageSelector={handleOpenLanguageSelector}
      onLanguageSelectorSwitch={handleLanguageSelectorSwitch}
      onCloseLanguageSelector={() => setShowLanguageSelector(false)}
    />
  );
}

function MainUI({
  confidence,
  detectionState,
  enabledNotifications,
  fps,
  imageQuality,
  isRecording,
  isWatching,
  placeholderText,
  prompt,
  reason,
  texts,
  showLanguagePrompt,
  detectedLanguage,
  isLoadingTranslation,
  showLanguageSelector,
  currentLanguage,
  onFpsChange,
  onHandleFrame,
  onImageQualityChange,
  onNotificationToggle,
  onPromptChange,
  onStartWatching,
  onStopWatching,
  onLanguageSwitch,
  onLanguageDismiss,
  onOpenLanguageSelector,
  onLanguageSelectorSwitch,
  onCloseLanguageSelector,
}) {
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

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-6 mb-4">
            <h1 className="text-6xl font-bold animate-bounce">
              <span className="inline-block">👁️</span> Sentinela
            </h1>
            
            {/* Language Selector Button - Only show when non-English detected */}
            {detectedLanguage && (
              <button
                onClick={onOpenLanguageSelector}
                className="group relative bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/40 hover:to-purple-500/40 backdrop-blur-sm rounded-2xl px-5 py-3 border border-blue-400/30 hover:border-yellow-400/60 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-400/30 animate-pulse hover:animate-none"
              >
                <div className="flex items-center space-x-3">
                  {/* Globe icon with sparkle */}
                  <div className="relative">
                    <span className="text-xl group-hover:animate-bounce transition-all duration-300">🌍</span>
                    <span className="absolute -top-1 -right-1 text-xs animate-ping">✨</span>
                  </div>
                  
                  {/* Language suggestion text */}
                  <div className="text-left hidden sm:block">
                    <div className="text-xs text-blue-200 group-hover:text-yellow-200 transition-colors">
                      Switch to
                    </div>
                    <div className="text-sm font-semibold text-white group-hover:text-yellow-300 transition-colors">
                      {detectedLanguage.name}
                    </div>
                  </div>
                  
                  {/* Mobile text */}
                  <span className="text-sm font-medium text-white group-hover:text-yellow-200 transition-colors sm:hidden">
                    {detectedLanguage.code.toUpperCase()}
                  </span>
                  
                  {/* Arrow indicator */}
                  <span className="text-xs text-blue-300 group-hover:text-yellow-400 transition-colors group-hover:animate-bounce">
                    →
                  </span>
                </div>
                
                {/* Magic glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-400/0 to-orange-400/0 group-hover:from-yellow-400/20 group-hover:to-orange-400/20 transition-all duration-300 blur-sm"></div>
              </button>
            )}
          </div>
          
          <p className="text-2xl text-blue-200">
            {texts.tagline}
          </p>
        </div>

        {/* Language Selection Prompt */}
        {showLanguagePrompt && detectedLanguage && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-gradient-to-br from-purple-800/90 to-blue-800/90 backdrop-blur-lg rounded-3xl p-8 max-w-md mx-4 border border-white/20 shadow-2xl animate-zoomIn">
              <div className="text-center">
                <div className="text-4xl mb-4">🌍</div>
                <h3 className="text-2xl font-bold mb-4 text-yellow-400">
                  {texts.language_detected}
                </h3>
                <p className="text-lg mb-2 text-blue-200">
                  <strong>{detectedLanguage.name}</strong>
                </p>
                <p className="text-md mb-6 text-gray-300">
                  {texts.language_switch_question} {detectedLanguage.name}?
                </p>
                
                <div className="flex flex-col space-y-3">
                  <button
                    onClick={() => onLanguageSwitch(true)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-2xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <span>✅</span>
                    <span>{texts.language_switch_yes}</span>
                  </button>
                  
                  <button
                    onClick={() => onLanguageSwitch(false)}
                    className="w-full py-3 px-6 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 rounded-2xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <span>🇺🇸</span>
                    <span>{texts.language_switch_no}</span>
                  </button>
                  
                  <button
                    onClick={onLanguageDismiss}
                    className="w-full py-2 px-4 text-sm text-gray-400 hover:text-white transition-colors underline"
                  >
                    {texts.language_switch_dismiss}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Translation Loading Overlay */}
        {isLoadingTranslation && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-gradient-to-br from-purple-800/95 to-blue-800/95 backdrop-blur-lg rounded-3xl p-12 max-w-lg mx-4 border border-white/20 shadow-2xl animate-zoomIn text-center">
              
              {/* Magical Loading Animation */}
              <div className="relative mb-8">
                <div className="w-20 h-20 mx-auto relative">
                  {/* Spinning outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-yellow-400/30"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin"></div>
                  
                  {/* Pulsing inner circle */}
                  <div className="absolute inset-2 bg-gradient-to-br from-yellow-400/40 to-orange-500/40 rounded-full animate-pulse"></div>
                  
                  {/* Central icon */}
                  <div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">
                    🌟
                  </div>
                </div>
                
                {/* Floating sparkles */}
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
              
              {/* Animated progress dots */}
              <div className="flex justify-center space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
                    style={{
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '1s'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Manual Language Selector */}
        {showLanguageSelector && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-gradient-to-br from-purple-800/95 to-blue-800/95 backdrop-blur-lg rounded-3xl p-8 max-w-md mx-4 border border-white/20 shadow-2xl animate-zoomIn">
              <div className="text-center">
                
                {/* Header */}
                <div className="relative mb-6">
                  <div className="text-4xl mb-2 animate-bounce">🌍</div>
                  <h3 className="text-2xl font-bold text-yellow-400">
                    {texts.choose_language}
                  </h3>
                  
                  {/* Close button */}
                  <button
                    onClick={onCloseLanguageSelector}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition-all duration-200"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Current Language Display */}
                <div className="bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-2xl p-4 mb-6 border border-yellow-400/30">
                  <p className="text-sm text-gray-300 mb-1">{texts.current_language}</p>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-2xl">
                      {currentLanguage === 'en' ? '🔤' : '🌍'}
                    </span>
                    <span className="text-lg font-semibold text-yellow-400">
                      {currentLanguage === 'en' 
                        ? 'English' 
                        : new Intl.DisplayNames(['en'], {type: 'language'}).of(currentLanguage)
                      }
                    </span>
                  </div>
                </div>

                {/* Language Options */}
                <div className="space-y-3 mb-6">
                  
                  {/* English Option */}
                  <button
                    onClick={() => onLanguageSelectorSwitch('en')}
                    disabled={currentLanguage === 'en'}
                    className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center space-x-3 ${
                      currentLanguage === 'en' 
                        ? 'bg-gray-600/50 border border-gray-500/50 cursor-not-allowed opacity-60' 
                        : 'bg-gradient-to-r from-blue-600/80 to-purple-600/80 hover:from-blue-500/90 hover:to-purple-500/90 border border-white/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-blue-500/20'
                    }`}
                  >
                    <span className="text-2xl">🔤</span>
                    <span>English</span>
                    {currentLanguage === 'en' && <span className="text-yellow-400">✓</span>}
                  </button>

                  {/* Browser Language Option (if different from English) */}
                  {(() => {
                    const browserLanguage = navigator.language;
                    const languageCode = browserLanguage.split('-')[0];
                    const languageName = new Intl.DisplayNames(['en'], {type: 'language'}).of(languageCode);
                    
                    if (languageCode !== 'en') {
                      return (
                        <button
                          onClick={() => onLanguageSelectorSwitch(languageCode)}
                          disabled={currentLanguage === languageCode}
                          className={`w-full py-4 px-6 rounded-2xl font-semibold transition-all transform hover:scale-105 flex items-center justify-center space-x-3 ${
                            currentLanguage === languageCode 
                              ? 'bg-gray-600/50 border border-gray-500/50 cursor-not-allowed opacity-60' 
                              : 'bg-gradient-to-r from-green-600/80 to-emerald-600/80 hover:from-green-500/90 hover:to-emerald-500/90 border border-white/30 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-green-500/20'
                          }`}
                        >
                          <span className="text-2xl">🌍</span>
                          <span>{languageName}</span>
                          {currentLanguage === languageCode && <span className="text-yellow-400">✓</span>}
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
                
                {/* Info text */}
                <p className="text-sm text-gray-400">
                  Select your preferred language for the interface
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Video Feed */}
          <div className="bg-black/30 backdrop-blur rounded-3xl p-8 mb-3 border border-white/20">
            <div className="aspect-video bg-black/50 rounded-2xl flex items-center justify-center relative overflow-hidden">
              <VideoCamera
                className="w-full h-full object-cover"
                fps={fps}
                imageQuality={imageQuality}
                isRecording={isRecording}
                onFrame={onHandleFrame}
              />

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
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center animate-zoomIn">
                        <p className="text-8xl mb-4">🎉</p>
                        <p className="text-3xl font-bold text-yellow-400">
                          {texts.detected}
                        </p>
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
                  confidence >= DETECTION_THRESHOLD
                    ? "bg-gradient-to-r from-yellow-400/20 to-green-400/20 border border-yellow-400/30"
                    : "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-blue-400/30"
                }`}
              >
                <span className="text-lg">
                  {confidence >= DETECTION_THRESHOLD ? "⭐" : "🔍"}
                </span>
                <p
                  className={`text-sm italic font-light ${
                    confidence >= DETECTION_THRESHOLD
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
              <input
                type="text"
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && prompt && !isWatching) {
                    onStartWatching();
                  }
                }}
                placeholder={placeholderText}
                className="w-full px-6 py-4 rounded-2xl bg-white/10 border border-white/30 text-xl placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:bg-white/20 transition-all"
                disabled={isWatching}
              />
            </div>

            {/* FPS Control */}
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                {texts.fps_label}
              </label>
              <input
                type="number"
                min="0.1"
                max="30"
                step="0.1"
                value={fps}
                onChange={(e) => onFpsChange(parseFloat(e.target.value) || 1)}
                className="w-full px-6 py-4 rounded-2xl bg-white/10 border border-white/30 text-xl placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:bg-white/20 transition-all"
                disabled={isWatching}
              />
            </div>

            {/* Image Quality Control */}
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                {texts.image_quality_label} {Math.round(imageQuality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={imageQuality}
                onChange={(e) =>
                  onImageQualityChange(parseFloat(e.target.value))
                }
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isWatching}
              />
              <div className="flex justify-between text-sm mt-2 text-gray-300">
                <span>{texts.low_quality}</span>
                <span>{texts.medium_quality}</span>
                <span>{texts.high_quality}</span>
              </div>
            </div>

            {/* Notification Type */}
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                {texts.notifications_label}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: "🔊", label: texts.notification_sound, key: "sound" },
                  { icon: "📧", label: texts.notification_email, key: "email" },
                  { icon: "💬", label: texts.notification_sms, key: "sms" },
                  { icon: "🔗", label: texts.notification_webhook, key: "webhook" },
                ].map((option) => (
                  <button
                    key={option.label}
                    onClick={() => onNotificationToggle(option.key)}
                    className={`p-4 rounded-xl border transition-all hover:scale-105 ${
                      enabledNotifications[option.key]
                        ? "bg-yellow-400/30 border-yellow-400 hover:bg-yellow-400/40"
                        : "bg-white/10 hover:bg-white/20 border-white/30"
                    }`}
                    disabled={isWatching}
                  >
                    <p className="text-2xl mb-1">{option.icon}</p>
                    <p className="text-sm">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={isWatching ? onStopWatching : onStartWatching}
              disabled={!prompt && !isWatching}
              className={`w-full py-5 rounded-2xl text-2xl font-bold transition-all transform hover:scale-105 ${
                isWatching
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 animate-pulse"
              }`}
            >
              {isWatching ? texts.stop_watching : texts.start_watching}
            </button>
          </div>

          {/* Fun Examples */}
          <div className="mt-8 text-center">
            <p className="text-lg mb-4 text-blue-200">
              {texts.try_examples}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                texts.example_dog,
                texts.example_dance,
                texts.example_coffee,
                texts.example_bird,
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => onPromptChange(`${texts.alert_me} ${example}`)}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition-all hover:scale-105"
                  disabled={isWatching}
                >
                  {example}
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

function VideoCamera({ className, fps, imageQuality, isRecording, onFrame }) {
  const cameraRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const captureIntervalRef = React.useRef(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (cameraRef.current) {
          cameraRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startWebcam();

    return () => {
      if (cameraRef.current && cameraRef.current.srcObject) {
        const tracks = cameraRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (cameraRef.current && canvasRef.current) {
      const video = cameraRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (blob && onFrame) {
            onFrame(blob);
          }
        },
        "image/jpeg",
        imageQuality
      );
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
      <video ref={cameraRef} autoPlay playsInline muted className={className} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}

createRoot(document.getElementById("root")).render(<MainPage />);