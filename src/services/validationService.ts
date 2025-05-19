// src/services/validationService.ts
import type { Question, QuestionsData, OptionMap } from '../types/Question';

export interface ValidationError {
  questionId?: string; // Client-side ID if validating QuestionsData
  questionNumber?: number | string; // User-defined question_number or index
  field?: string; // Specific field that has an error
  message: string;
}

const commonQuestionValidation = (
    q: Partial<Omit<Question, 'id'>>,
    index: number,
    _allQuestionNumbers: Set<number>, // Used by validateQuestionsData to detect duplicates across questions
    isRawJsonValidation: boolean = false // To slightly alter behavior for raw JSON vs structured data
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const qNumForError = q.question_number !== undefined ? q.question_number : `(at index ${index})`;

  if (typeof q.question_number !== 'number' || !Number.isInteger(q.question_number) || q.question_number <= 0) {
    errors.push({ questionNumber: qNumForError, field: 'question_number', message: "'question_number' must be a positive integer." });
  }
  // Note: Cross-question duplicate q_number check is handled in validateQuestionsData and validateRawJsonString

  if (typeof q.question_text !== 'string' || q.question_text.trim() === '') {
    errors.push({ questionNumber: qNumForError, field: 'question_text', message: "'question_text' must be a non-empty string." });
  }

  // Validate options structure first
  if (typeof q.options !== 'object' || q.options === null || Object.keys(q.options).length < 2) {
    errors.push({ questionNumber: qNumForError, field: 'options', message: "'options' must be an object with at least two key-value pairs." });
  } else {
    // Option values and keys validation
    for (const key in q.options) {
      if (typeof (q.options as OptionMap)[key] !== 'string' || (q.options as OptionMap)[key].trim() === '') {
        errors.push({ questionNumber: qNumForError, field: `options.${key}`, message: `Option '${key}' value must be a non-empty string.` });
      }
      if (key.trim() === '') {
        errors.push({ questionNumber: qNumForError, field: 'options', message: 'Option keys cannot be empty.'});
      }
    }
    const optionKeys = Object.keys(q.options);
    if (new Set(optionKeys).size !== optionKeys.length) {
        errors.push({ questionNumber: qNumForError, field: 'options', message: 'Option keys must be unique within a question.' });
    }
  }

  // Validate correct_answer (works with or without valid options)
  if (typeof q.correct_answer !== 'string' || q.correct_answer.trim() === '') {
    errors.push({ questionNumber: qNumForError, field: 'correct_answer', message: "'correct_answer' must be a non-empty string." });
  } else if (!q.options || typeof q.options !== 'object' || q.options === null) {
    errors.push({ questionNumber: qNumForError, field: 'correct_answer', message: `'correct_answer' ("${q.correct_answer}") specified, but no valid 'options' object found.` });
  } else {
    // Check if any option key matches correct_answer case-insensitively
    const optionKeys = Object.keys(q.options);
    const optionKeysLower = optionKeys.map(k => k.toLowerCase());
    const correctAnswerLower = q.correct_answer.toLowerCase();
    
    if (!optionKeysLower.includes(correctAnswerLower)) {
      errors.push({
        questionNumber: qNumForError,
        field: 'correct_answer',
        message: `'correct_answer' ("${q.correct_answer}") must match an existing option key (case-insensitive). Available options: ${optionKeys.join(', ')}.`
      });
    }
  }

  // Optional fields validation
  if (q.hasOwnProperty('subject') && q.subject !== null && (typeof q.subject !== 'string' || q.subject.trim() === '')) {
    errors.push({ questionNumber: qNumForError, field: 'subject', message: "'subject', if present and not null, must be a non-empty string." });
  }
  if (q.hasOwnProperty('topic') && q.topic !== null && (typeof q.topic !== 'string' || q.topic.trim() === '')) {
    errors.push({ questionNumber: qNumForError, field: 'topic', message: "'topic', if present and not null, must be a non-empty string." });
  }
  if (q.hasOwnProperty('explanation') && q.explanation !== null && typeof q.explanation !== 'string') {
    errors.push({ questionNumber: qNumForError, field: 'explanation', message: "'explanation', if present and not null, must be a string." });
  }
  if (q.hasOwnProperty('difficulty') && q.difficulty !== null && q.difficulty !== '' && !['Easy', 'Medium', 'Hard'].includes(q.difficulty!)) {
    errors.push({ questionNumber: qNumForError, field: 'difficulty', message: "'difficulty', if present and not null, must be 'Easy', 'Medium', 'Hard', or an empty string." });
  }
  if (q.hasOwnProperty('section_id') && q.section_id !== null && (typeof q.section_id !== 'string' || q.section_id.trim() === '')) {
    errors.push({ questionNumber: qNumForError, field: 'section_id', message: "'section_id', if present and not null, must be a non-empty string." });
  }
  
  // Check for unknown keys
  const allowedKeys = ['question_number', 'question_text', 'options', 'correct_answer', 'subject', 'topic', 'explanation', 'difficulty', 'section_id'];
  // For raw JSON validation, we don't expect 'id' or '_isDirty'
  const internalClientKeys = isRawJsonValidation ? [] : ['id', '_isDirty']; 
  const allRecognizedKeys = [...allowedKeys, ...internalClientKeys];

  for (const key in q) {
      if (q.hasOwnProperty(key) && !allRecognizedKeys.includes(key) && !key.startsWith('_comment')) {
          // MODIFICATION: Add as an error instead of console.warn
          errors.push({ questionNumber: qNumForError, field: key, message: `Unrecognized field '${key}' found.` });
      }
  }

  return errors;
};

export const validateQuestionsData = (questions: QuestionsData): ValidationError[] => {
  const allErrors: ValidationError[] = [];
  const questionNumbersEncountered = new Set<number>(); // For duplicate check
  
  // Create a sorted list for sequential check, but iterate original for error reporting context
  const sortedQuestionsForSeqCheck = [...questions].sort((a,b) => (a.question_number || 0) - (b.question_number || 0));
  let previousQNumberForSeqCheck = 0;
  let nonSequentialErrorAdded = false; // Flag to add only one global non-sequential error

  // Check for non-sequential numbers in the sorted list
  for (let i = 0; i < sortedQuestionsForSeqCheck.length; i++) {
    const qSorted = sortedQuestionsForSeqCheck[i];
    if (qSorted.question_number) { // Only consider if question_number is valid type and present
        // Check for gaps: e.g. 1, 2, 5 (gap after 2)
        if (i > 0 && qSorted.question_number > previousQNumberForSeqCheck + 1 && !nonSequentialErrorAdded) {
             // MODIFICATION: Add as a general error (not tied to a specific question)
            allErrors.push({ message: `Question numbers are not strictly sequential (e.g., gap detected after Q#${previousQNumberForSeqCheck}). Please ensure numbers are consecutive.` });
            nonSequentialErrorAdded = true; // Add this general error only once
            break; // No need to check further for this specific type of non-sequential error
        }
        previousQNumberForSeqCheck = qSorted.question_number;
    }
  }


  questions.forEach((q, index) => {
    // For common validation, we don't pass the Set if we are validating raw JSON initially,
    // as duplicate numbers across questions will be checked after all individual questions are parsed.
    // However, for structured QuestionsData, we can perform the check.
    const errors = commonQuestionValidation(q, index, questionNumbersEncountered, false);
    errors.forEach(err => allErrors.push({ ...err, questionId: q.id }));

    if (q.question_number && typeof q.question_number === 'number') {
      if (questionNumbersEncountered.has(q.question_number)) {
        allErrors.push({
          questionId: q.id,
          questionNumber: q.question_number,
          field: 'question_number',
          message: "'question_number' is duplicated. Must be unique across all questions.",
        });
      } else {
        questionNumbersEncountered.add(q.question_number);
      }
    }
  });

  return allErrors;
};


export const validateRawJsonString = (
  jsonString: string
): { data: Omit<Question, 'id'>[] | null; errors: ValidationError[] } => {
  const allErrors: ValidationError[] = [];
  let parsedData: any = null;

  if (jsonString.trim() === "") {
    allErrors.push({ message: "JSON content cannot be empty. It should be an array, e.g., '[]'." });
    return { data: null, errors: allErrors };
  }

  try {
    parsedData = JSON.parse(jsonString);
  } catch (err: any) {
    allErrors.push({ message: `Invalid JSON syntax: ${err.message}. (Check for missing/extra commas, quotes, or brackets)` });
    return { data: null, errors: allErrors };
  }

  if (!Array.isArray(parsedData)) {
    allErrors.push({ message: "Invalid format: Top level of JSON must be an array of question objects." });
    return { data: null, errors: allErrors };
  }

  const questionNumbersEncountered = new Set<number>(); // For duplicate check in raw JSON
  let previousQNumberForSeqCheck = 0;
  let nonSequentialErrorAdded = false; // Flag for raw JSON sequential check

  // Sort parsed data by question_number for sequential check
  const sortedParsedData = [...parsedData].sort((a, b) => (a.question_number || 0) - (b.question_number || 0));

  for (let i = 0; i < sortedParsedData.length; i++) {
    const qSorted = sortedParsedData[i];
    if (qSorted.question_number && typeof qSorted.question_number === 'number') {
      if (i > 0 && qSorted.question_number > previousQNumberForSeqCheck + 1 && !nonSequentialErrorAdded) {
        // MODIFICATION: Add as a general error for raw JSON validation
        allErrors.push({ message: `Question numbers in JSON are not strictly sequential (e.g., gap detected after Q#${previousQNumberForSeqCheck}). Please ensure numbers are consecutive.` });
        nonSequentialErrorAdded = true;
        break; 
      }
      previousQNumberForSeqCheck = qSorted.question_number;
    }
  }

  parsedData.forEach((q: any, index: number) => {
    // For common validation of raw JSON items, we pass an empty Set for `allQuestionNumbers` initially,
    // because we handle duplicate checking for raw JSON after parsing all items.
    const itemErrors = commonQuestionValidation(q, index, new Set(), true); 
    itemErrors.forEach(err => allErrors.push(err));

    // Duplicate q_number check specifically for raw JSON context
    if (q.question_number && typeof q.question_number === 'number') {
        if (questionNumbersEncountered.has(q.question_number)) {
            allErrors.push({
                questionNumber: q.question_number,
                field: 'question_number',
                message: `'question_number' is duplicated within the JSON. Must be unique. (Occurred at original index ${index})`,
            });
        } else {
            questionNumbersEncountered.add(q.question_number);
        }
    }
  });

  if (allErrors.length > 0) {
    return { data: null, errors: allErrors };
  }

  return { data: parsedData as Omit<Question, 'id'>[], errors: [] };
};


export const formatValidationErrors = (errors: ValidationError[]): string[] => {
    return errors.map(err => {
        let prefix = '';
        // If it's a general message not tied to a question number (like sequential error)
        if (err.questionNumber === undefined && err.field === undefined && err.questionId === undefined) {
            return err.message;
        }

        if (err.questionNumber !== undefined) {
            prefix += `Q#${err.questionNumber}`;
        } else if (err.questionId) {
            // Could fetch the question from store to get its number if needed for display,
            // but for now, client ID might be too technical for user. Let's stick to qNum.
            // Or, if it's a general error from validateQuestionsData not tied to a specific question
        }

        if (err.field) {
            prefix += ` (Field: ${err.field})`;
        }
        return `${prefix ? prefix + ': ' : ''}${err.message}`;
    });
};