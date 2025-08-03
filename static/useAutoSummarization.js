import React, { useEffect } from "react";
import {
  Events,
  SUMMARY_TIME_WINDOWS,
  WatchLogEventType,
} from "./constants.js";
import { getPathPrefix } from "./utils.js";

export function useAutoSummarization(state, dispatch) {
  const { watchingLogs, watchingStartTime } = state;
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [lastSummarizedAt, setLastSummarizedAt] = React.useState(() =>
    Object.fromEntries(
      Object.keys(SUMMARY_TIME_WINDOWS).map((level) => [level, Date.now()]),
    ),
  );

  useEffect(() => {
    if (watchingStartTime) {
      setLastSummarizedAt(
        Object.fromEntries(
          Object.keys(SUMMARY_TIME_WINDOWS).map((level) => [
            level,
            watchingStartTime,
          ]),
        ),
      );
    }
  }, [watchingStartTime]);

  useEffect(() => {
    const processSummarization = async (level) => {
      try {
        const config = SUMMARY_TIME_WINDOWS[level];
        const currentLevel = parseInt(level);
        const eligibleLogs = watchingLogs.filter(
          (log) =>
            log.type === WatchLogEventType.UPDATE ||
            (log.type === WatchLogEventType.SUMMARY &&
              log.summaryLevel < currentLevel),
        );

        const now = Date.now();
        const timeWindowStart = now - config.timeWindow;
        const logsInTimeWindow = eligibleLogs.filter(
          (log) => new Date(log.timestamp).getTime() >= timeWindowStart,
        );

        if (logsInTimeWindow.length === 0) {
          return;
        }

        setIsSummarizing(true);
        const serverPathPrefix = getPathPrefix();
        const response = await fetch(
          `${serverPathPrefix}/summarize-watch-logs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              events: logsInTimeWindow.map((log) => log.reason),
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data?.summary) return;

        dispatch({
          type: Events.onLogSummarize,
          payload: {
            summary: data.summary,
            logIds: logsInTimeWindow.map((log) => log.id),
            summaryLevel: parseInt(level),
          },
        });

        setLastSummarizedAt(function updateTimestampsForLevelAndBelow(prev) {
          const updated = { ...prev };
          const currentLevel = parseInt(level);

          Object.keys(SUMMARY_TIME_WINDOWS).forEach((configLevel) => {
            if (parseInt(configLevel) <= currentLevel) {
              updated[configLevel] = now;
            }
          });

          return updated;
        });
      } catch (error) {
        console.error(
          `Error processing summarization for level ${level}:`,
          error,
        );
      } finally {
        setIsSummarizing(false);
      }
    };

    const processNextSummarization = () => {
      if (isSummarizing) return;

      const now = Date.now();
      const sortedLevels = Object.entries(SUMMARY_TIME_WINDOWS).sort(
        ([a], [b]) => parseInt(b) - parseInt(a),
      );

      for (const [level, config] of sortedLevels) {
        const levelLastSummarizedAt = lastSummarizedAt[level];

        if (now - levelLastSummarizedAt >= config.timeWindow) {
          processSummarization(level);
          break;
        }
      }
    };

    processNextSummarization();
  }, [watchingLogs.length, isSummarizing, lastSummarizedAt]);

  return { isSummarizing };
}
