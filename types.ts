export enum AppMode {
  TIME_TRAVEL = 'TIME_TRAVEL',
  MAGIC_EDIT = 'MAGIC_EDIT',
  ANALYZE = 'ANALYZE'
}

export enum AppState {
  LANDING = 'LANDING',
  CAPTURE = 'CAPTURE',
  CONFIG = 'CONFIG',
  PROCESSING = 'PROCESSING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export interface HistoricalEra {
  id: string;
  name: string;
  description: string;
  prompt: string;
  emoji: string;
  color: string;
}

export interface GeneratedResult {
  imageUrl?: string;
  text?: string;
  backstory?: string;
}

export type ProcessingStatus = 'initializing' | 'uploading' | 'generating_image' | 'analyzing_history' | 'analyzing_image' | 'complete';