
export enum StudentLevel {
  JUNIOR = 'Junior High',
  SENIOR = 'Senior High',
  TOEIC = 'TOEIC'
}

export enum TargetLanguage {
  TRADITIONAL_CHINESE = '繁體中文',
  SIMPLIFIED_CHINESE = '簡體中文',
  JAPANESE = '日文',
  KOREAN = '韓文',
  FRENCH = '法文',
  GERMAN = '德文',
  SPANISH = '西班牙文'
}

export interface Word {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  translation: string;
  exampleSentence: string;
  exampleTranslation: string;
  level: StudentLevel;
  learned: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  wordId: string;
  type: 'meaning' | 'spelling' | 'completion';
}

export interface UserStats {
  totalWordsLearned: number;
  currentStreak: number;
  lastStudyDate: string;
  level: StudentLevel;
  targetLanguage: TargetLanguage;
}
