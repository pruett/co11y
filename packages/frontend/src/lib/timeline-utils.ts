/**
 * Timeline utility functions for calculating positions and durations
 * in the swimlane timeline visualization
 */

export const WINDOW_MINUTES = 10; // Show last 10 minutes by default
export const PIXELS_PER_SECOND = 10; // Default zoom level
export const MIN_BLOCK_WIDTH = 4; // Minimum width for tool blocks in pixels

/**
 * Calculate the time window for the timeline
 */
export function getTimeWindow(minutes: number = WINDOW_MINUTES): {
  start: number;
  end: number;
} {
  const now = Date.now();
  return {
    start: now - minutes * 60 * 1000,
    end: now,
  };
}

/**
 * Convert a timestamp to pixel offset from window start
 */
export function timestampToPixels(
  timestamp: string,
  windowStart: number,
  pixelsPerSecond: number = PIXELS_PER_SECOND
): number {
  const time = new Date(timestamp).getTime();
  const offsetSeconds = (time - windowStart) / 1000;
  return offsetSeconds * pixelsPerSecond;
}

/**
 * Convert duration in milliseconds to pixel width
 */
export function durationToPixels(
  durationMs: number,
  pixelsPerSecond: number = PIXELS_PER_SECOND
): number {
  const durationSeconds = durationMs / 1000;
  return Math.max(durationSeconds * pixelsPerSecond, MIN_BLOCK_WIDTH);
}

/**
 * Format elapsed time from milliseconds
 */
export function formatElapsedTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Format timestamp for time axis labels
 */
export function formatTimeLabel(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

/**
 * Check if a timestamp is within the visible time window
 */
export function isInTimeWindow(
  timestamp: string,
  windowStart: number,
  windowEnd: number
): boolean {
  const time = new Date(timestamp).getTime();
  return time >= windowStart && time <= windowEnd;
}

/**
 * Calculate total timeline width in pixels
 */
export function calculateTimelineWidth(
  windowMinutes: number = WINDOW_MINUTES,
  pixelsPerSecond: number = PIXELS_PER_SECOND
): number {
  return windowMinutes * 60 * pixelsPerSecond;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
