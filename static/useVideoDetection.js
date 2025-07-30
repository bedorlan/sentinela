import * as MessagePack from "@msgpack/msgpack";
import { useEffect } from "react";
import ruw from "react-use-websocket";
import { DetectionState, Events } from "./constants.js";
import { getPathPrefix } from "./utils.js";

const { default: useWebSocket } = ruw;

export function useVideoDetection(state, dispatch) {
  const { detectionState, lastVideoFrame, prompt, currentLanguage } = state;

  const isWatching =
    detectionState === DetectionState.WATCHING ||
    detectionState === DetectionState.DETECTED;
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const serverPathPrefix = getPathPrefix();
  const wsUrl = isWatching
    ? `${wsProtocol}//${window.location.host}${serverPathPrefix}/ws/frames`
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
