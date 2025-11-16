/**
 * Speech persistence utilities for maintaining narration state across navigation
 */

export interface SpeechState {
  text: string;
  timestamp: number;
  language: string;
  isPaused: boolean;
}

const SPEECH_STATE_KEY = 'ai-tourist-guide-speech-state';
const STATE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Save speech state to localStorage
 */
export const saveSpeechState = (text: string, language: string, isPaused: boolean = false): void => {
  try {
    const state: SpeechState = {
      text,
      timestamp: Date.now(),
      language,
      isPaused,
    };
    localStorage.setItem(SPEECH_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save speech state:', error);
  }
};

/**
 * Load speech state from localStorage
 * Returns null if state is expired or invalid
 */
export const loadSpeechState = (): SpeechState | null => {
  try {
    const stored = localStorage.getItem(SPEECH_STATE_KEY);
    if (!stored) return null;

    const state: SpeechState = JSON.parse(stored);
    
    // Check if state has expired
    if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      clearSpeechState();
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to load speech state:', error);
    return null;
  }
};

/**
 * Clear speech state from localStorage
 */
export const clearSpeechState = (): void => {
  try {
    localStorage.removeItem(SPEECH_STATE_KEY);
  } catch (error) {
    console.error('Failed to clear speech state:', error);
  }
};

/**
 * Update pause state without changing text
 */
export const updatePauseState = (isPaused: boolean): void => {
  try {
    const state = loadSpeechState();
    if (state) {
      saveSpeechState(state.text, state.language, isPaused);
    }
  } catch (error) {
    console.error('Failed to update pause state:', error);
  }
};
