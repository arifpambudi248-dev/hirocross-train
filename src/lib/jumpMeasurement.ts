export type JumpProtocol = "cmj" | "vertical-jump";

export type JumpCaptureMethod = "camera" | "sensor";

export const GRAVITY_M_PER_SECOND_SQUARED = 9.80665;

export function calculateJumpHeightCm(flightTimeSeconds: number): number | null {
  if (!Number.isFinite(flightTimeSeconds) || flightTimeSeconds <= 0 || flightTimeSeconds > 2) {
    return null;
  }

  return (GRAVITY_M_PER_SECOND_SQUARED * flightTimeSeconds ** 2 * 100) / 8;
}

export function calculateRealFlightTimeSeconds(
  takeoffTimelineSeconds: number,
  landingTimelineSeconds: number,
  captureFramesPerSecond: number,
  timelineFramesPerSecond: number,
): number | null {
  if (
    !Number.isFinite(takeoffTimelineSeconds) ||
    !Number.isFinite(landingTimelineSeconds) ||
    !Number.isFinite(captureFramesPerSecond) ||
    !Number.isFinite(timelineFramesPerSecond) ||
    captureFramesPerSecond <= 0 ||
    timelineFramesPerSecond <= 0 ||
    landingTimelineSeconds <= takeoffTimelineSeconds
  ) {
    return null;
  }

  const timelineDuration = landingTimelineSeconds - takeoffTimelineSeconds;
  return (timelineDuration * timelineFramesPerSecond) / captureFramesPerSecond;
}

export function getJumpTestName(protocol: JumpProtocol): string {
  return protocol === "cmj" ? "CMJ (Counter Movement Jump)" : "Squat Jump";
}