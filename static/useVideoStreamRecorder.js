import { useEffect, useRef, useCallback } from "react";
import {
  DetectionState,
  Events,
  RECORDING_ROTATION_INTERVAL,
  POST_DETECTION_RECORDING_DURATION,
} from "./constants.js";

export function useVideoStreamRecorder(state, dispatch) {
  const { videoRef, isVideoStreamReady, detectionState, demoMode } = state;
  const recordersRef = useRef([]);
  const detectionRecorderRef = useRef(null);
  const rotationIntervalRef = useRef(null);

  const isRecordingActive =
    !demoMode &&
    (detectionState === DetectionState.WATCHING ||
      detectionState === DetectionState.DETECTED);

  const startNewRecorder = useCallback(() => {
    if (!videoRef?.current?.srcObject || !isVideoStreamReady) return null;

    const stream = videoRef.current.srcObject;
    const recorder = new MediaRecorder(stream, { mimeType: "video/mp4" });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: "video/mp4" });
        if (recorder.onBlobReady) {
          recorder.onBlobReady(blob);
        }
      }
    };

    recorder.start();
    return recorder;
  }, [videoRef, isVideoStreamReady]);

  const stopRecorder = useCallback((recorder) => {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const rotateRecorders = useCallback(() => {
    const newRecorder = startNewRecorder();
    if (!newRecorder) return;

    recordersRef.current.push(newRecorder);

    if (recordersRef.current.length > 2) {
      const oldRecorder = recordersRef.current.shift();
      stopRecorder(oldRecorder);
    }
  }, [startNewRecorder, stopRecorder]);

  useEffect(
    function manageRecordingRotation() {
      if (isVideoStreamReady && isRecordingActive) {
        recordersRef.current = [];

        rotateRecorders();
        rotationIntervalRef.current = setInterval(
          rotateRecorders,
          RECORDING_ROTATION_INTERVAL,
        );
      } else {
        if (rotationIntervalRef.current) {
          clearInterval(rotationIntervalRef.current);
          rotationIntervalRef.current = null;
        }

        recordersRef.current.forEach(stopRecorder);
        recordersRef.current = [];
      }

      return () => {
        if (rotationIntervalRef.current) {
          clearInterval(rotationIntervalRef.current);
          rotationIntervalRef.current = null;
        }
        recordersRef.current.forEach(stopRecorder);
        recordersRef.current = [];
      };
    },
    [
      isVideoStreamReady,
      isRecordingActive,
      startNewRecorder,
      rotateRecorders,
      stopRecorder,
    ],
  );

  useEffect(
    function handleDetectionRecording() {
      if (demoMode || detectionState !== DetectionState.DETECTED) {
        detectionRecorderRef.current = null;
        return;
      }

      if (detectionRecorderRef.current) return;
      if (recordersRef.current.length === 0) return;

      detectionRecorderRef.current = recordersRef.current.shift();
      const recorderFinishingTheClip = detectionRecorderRef.current;

      setTimeout(() => {
        if (!recorderFinishingTheClip) return;

        recorderFinishingTheClip.onBlobReady = (blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result;
            dispatch({
              type: Events.onDetectionVideoClip,
              payload: {
                videoUrl: dataUrl,
              },
            });
            detectionRecorderRef.current = null;
          };
          reader.readAsDataURL(blob);
        };

        stopRecorder(recorderFinishingTheClip);
      }, POST_DETECTION_RECORDING_DURATION);
    },
    [demoMode, detectionState, stopRecorder],
  );
}
