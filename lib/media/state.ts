import type { MediaProcessingState } from "./capabilities";

const TRANSITIONS: Record<MediaProcessingState, readonly MediaProcessingState[]> = {
  pending: ["uploading", "failed"],
  uploading: ["processing", "failed"],
  processing: ["ready", "failed"],
  ready: [],
  failed: ["pending"],
};

export function canTransitionMediaState(
  from: MediaProcessingState,
  to: MediaProcessingState,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertMediaStateTransition(
  from: MediaProcessingState,
  to: MediaProcessingState,
): void {
  if (!canTransitionMediaState(from, to)) {
    throw new Error(`Invalid media state transition: ${from} -> ${to}`);
  }
}
