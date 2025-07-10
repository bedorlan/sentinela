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

const placeholders = [
  "Tell me when my cat enters the room... 🐱",
  "Alert me when someone smiles... 😊",
  "Notify me when the sun sets... 🌅",
  "Watch for when my pizza arrives... 🍕",
  "Let me know when the baby wakes up... 👶",
  "Warn me if someone looks sad... 😢",
];

function MainPage() {
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
  //
  onFpsChange,
  onHandleFrame,
  onImageQualityChange,
  onNotificationToggle,
  onPromptChange,
  onStartWatching,
  onStopWatching,
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
          <h1 className="text-6xl font-bold mb-4 animate-bounce">
            <span className="inline-block">👁️</span> Sentinela
          </h1>
          <p className="text-2xl text-blue-200">
            Tell me what to watch for in plain words!
          </p>
        </div>

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
                          DETECTED!
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
                          Confidence: {Math.round(confidence)}%
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
                ✨ What should I watch for?
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
                ⚡ Frames per second
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
                📷 Image quality: {Math.round(imageQuality * 100)}%
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
                <span>Low (10%)</span>
                <span>Medium (50%)</span>
                <span>High (100%)</span>
              </div>
            </div>

            {/* Notification Type */}
            <div className="mb-6">
              <label className="block text-xl mb-3 font-semibold">
                🔔 How should I notify you?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: "🔊", label: "Sound", key: "sound" },
                  { icon: "📧", label: "Email", key: "email" },
                  { icon: "💬", label: "SMS", key: "sms" },
                  { icon: "🔗", label: "Webhook", key: "webhook" },
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
              {isWatching ? "🛑 Stop Watching" : "🚀 Start Watching!"}
            </button>
          </div>

          {/* Fun Examples */}
          <div className="mt-8 text-center">
            <p className="text-lg mb-4 text-blue-200">
              Try these magical examples:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "when my dog sits 🐕",
                "if someone dances 💃",
                "when coffee is ready ☕",
                "if a bird appears 🦅",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => onPromptChange(`Alert me ${example}`)}
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
