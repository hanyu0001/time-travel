export enum AppState {
  LANDING = 'LANDING',
  CAPTURE = 'CAPTURE',
  SELECT_ERA = 'SELECT_ERA',
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
  imageUrl: string;
  backstory?: string;
}

export type ProcessingStatus = 'initializing' | 'uploading' | 'generating_image' | 'analyzing_history' | 'complete';
