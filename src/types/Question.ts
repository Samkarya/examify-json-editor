// src/types/Question.ts

export interface OptionMap {
  [key: string]: string; // e.g., "a": "Option A text", "b": "Option B text"
}

export interface Question {
  // A unique client-side ID for React list keys and easier state management.
  // This is different from question_number which might be user-defined and re-ordered.
  id: string;

  question_number: number;
  question_text: string;
  options: OptionMap;
  correct_answer: string; // This will be one of the keys from the options OptionMap

  subject?: string | null;
  topic?: string | null;
  explanation?: string | null;
  difficulty?: 'Easy' | 'Medium' | 'Hard' | '' | null; // '' for 'Not specified' from form
  section_id?: string | null;

  // For internal tracking, not part of the exported JSON unless explicitly handled
  _isDirty?: boolean; // Example: to track if a question has unsaved changes
}

// Type for the entire JSON structure (array of questions)
export type QuestionsData = Question[];

// Type for template items
export interface TemplateItem {
  name: string;
  icon: string;
  data: Partial<Question>[]; // Templates might provide partial data to be filled
}

export interface TemplatesByCategory {
  basic: TemplateItem[];
  subjects: TemplateItem[];
  complex: TemplateItem[];
}