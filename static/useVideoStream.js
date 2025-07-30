import React, { useEffect } from "react";
import { getPathPrefix } from "./utils.js";

export function useVideoStream(state) {
  const { demoMode, currentDemo } = state;
  const videoRef = React.useRef(null);
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    setReady(false);

    const setupStream = async () => {
      if (demoMode && currentDemo) {
        if (videoRef.current) {
          const serverPathPrefix = getPathPrefix();
          videoRef.current.src = `${serverPathPrefix}/static/demos/${currentDemo.file}`;
          videoRef.current.loop = false;
          videoRef.current.muted = true;

          await videoRef.current
            .play()
            .catch((err) => console.error("Error playing demo video:", err));

          setReady(true);
        }
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setReady(true);
          }
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    };

    setupStream();

    return () => {
      setReady(false);
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach((track) => track.stop());
        }
        videoRef.current.srcObject = null;
        videoRef.current.src = "";
      }
    };
  }, [demoMode, currentDemo]);

  return { videoRef, ready };
}
