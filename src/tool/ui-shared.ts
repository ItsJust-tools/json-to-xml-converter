import { DEFAULT_STATE, type ToolState } from './types';
import { convertWithState, summaryText, stepsFor, historyText, isState } from './tool-definition';

export { convertWithState, summaryText, stepsFor, historyText, isState };

/** Convenience helper reused by Canvas and the status bar. */
export function outputFor(state: ToolState): string {
  return convertWithState(state).xml ?? '';
}

export { DEFAULT_STATE };
