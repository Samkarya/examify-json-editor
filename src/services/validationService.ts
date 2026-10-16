// src/services/validationService.ts
//
// Thin adapter over the shared core (./examCore). The public API below is UNCHANGED
// (ValidationError, validateQuestionsData, cleanJsonString, autoFixRawJsonString,
// validateRawJsonString, formatValidationErrors) so existing callers keep working.
// New, additive helpers (analyzeRawJson, autoFixRawJson) give the editor grouped problems,
// click-to-jump positions, an LLM-ready prompt and a real auto-fix.
import type { Question, QuestionsData } from '../types/Question';
import { processExamItems, processExamText, buildLlmPrompt, locateQuestions, lineCol } from './examCore';
import type { Issue, ExamReport, FixNote, IssueGroup } from './examCore';

export interface ValidationError {
  questionId?: string; // Client-side ID if validating QuestionsData
  questionNumber?: number | string; // User-defined question_number or "(item N)"
  field?: string; // Specific field that has an error
  message: string;
  // ---- additive fields (older callers can ignore them) ----
  code?: string; // stable machine-readable code, e.g. "E_ANSWER_NO_MATCH"
  severity?: 'error' | 'warning' | 'info';
  fix?: 'safe' | 'guess'; // can the auto-fix repair it? (safe = lossless, guess = heuristic)
  line?: number; // 1-based, for click-to-jump
  column?: number;
  offset?: number;
}

const toError = (i: Issue, ids?: Array<string | undefined>, offsets?: number[], text?: string): ValidationError => {
  const e: ValidationError = {
    questionId: i.index !== undefined && ids ? ids[i.index] : undefined,
    questionNumber: i.questionNumber,
    field: i.field,
    message: i.message,
    code: i.code,
    severity: i.severity,
    fix: i.fix === 'safe' || i.fix === 'guess' ? i.fix : undefined,
    line: i.line,
    column: i.column,
    offset: i.offset,
  };
  if (e.offset === undefined && i.index !== undefined && offsets && offsets[i.index] !== undefined && text !== undefined) {
    e.offset = offsets[i.index];
    const lc = lineCol(text, e.offset);
    e.line = lc.line;
    e.column = lc.column;
  }
  return e;
};

/** Validates structured editor data. Returns ERRORS only (same contract as before). */
export const validateQuestionsData = (questions: QuestionsData): ValidationError[] => {
  const list = questions as unknown as Array<{ id?: string }>;
  const report = processExamItems(list, { mode: 'check', clientKeys: ['id', '_isDirty'] });
  const ids = list.map((q) => (q && typeof q === 'object' ? q.id : undefined));
  return report.issues.filter((i) => i.severity === 'error').map((i) => toError(i, ids));
};

/** Strips ```json fences (any case / language tag) and surrounding commentary. */
export const cleanJsonString = (rawString: string): string => {
  const trimmed = rawString.trim();
  const fenced = /(?:```|~~~)[A-Za-z0-9_-]*[ \t]*\r?\n?([\s\S]*?)(?:```|~~~)/.exec(trimmed);
  if (fenced && fenced[1].trim() !== '') return fenced[1].trim();
  return trimmed.replace(/^(?:```|~~~)[A-Za-z0-9_-]*/, '').replace(/(?:```|~~~)$/, '').trim();
};

export interface AutoFixResult {
  /** repaired JSON text (4-space indent, like before), or null when nothing could be read */
  fixedJson: string | null;
  error: string | null;
  /** what was changed ("Renumbered questions", "Converted single quotes …") with safe/guess tiers */
  fixes: FixNote[];
  /** what is STILL wrong after the fix (needs a human or the AI) */
  remaining: ValidationError[];
  /** questions the fixer could not repair; they are kept exactly as written, never dropped */
  unfixedCount: number;
}

/**
 * Real auto-fix: syntax (quotes, commas, comments, truncation, several pasted lists, fences …),
 * structure (field names, options list -> object, answer resolution, numbering) and content
 * (LaTeX backslashes eaten by JSON, \( \) math, "$5 … $10" money, bare "<"). Never drops a question.
 */
export const autoFixRawJson = (text: string, opts: { applyGuess?: boolean } = {}): AutoFixResult => {
  const report = processExamText(text, { mode: 'repair', applyGuess: opts.applyGuess !== false });
  if (report.fatal) return { fixedJson: null, error: report.fatal.message, fixes: [], remaining: [], unfixedCount: 0 };
  // nothing to fix and already valid JSON: hand back the user's own text, formatting untouched
  const untouched = report.fixes.length === 0 && report.info.source === 'native';
  const fixedJson = untouched ? text : JSON.stringify(report.repairedItems, null, 4);
  const after = processExamText(fixedJson, { mode: 'check' });
  return {
    fixedJson,
    error: null,
    fixes: report.fixes,
    remaining: after.issues.filter((i) => i.severity === 'error').map((i) => toError(i, undefined, locateQuestions(fixedJson), fixedJson)),
    unfixedCount: report.skipped.length,
  };
};

/** Old signature, kept. Now fixes far more than renumbering. */
export const autoFixRawJsonString = (jsonString: string): { fixedJson: string | null; error: string | null } => {
  const r = autoFixRawJson(jsonString);
  return { fixedJson: r.fixedJson, error: r.error };
};

export const validateRawJsonString = (
  jsonString: string
): { data: Omit<Question, 'id'>[] | null; errors: ValidationError[] } => {
  // an empty list is a valid starting point for the editor
  if (/^\[\s*\]$/.test(cleanJsonString(jsonString))) return { data: [], errors: [] };
  const report = processExamText(jsonString, { mode: 'check' });
  const offsets = report.info.source === 'native' ? locateQuestions(jsonString) : undefined;
  const errors = report.issues.filter((i) => i.severity === 'error').map((i) => toError(i, undefined, offsets, jsonString));
  if (errors.length > 0) return { data: null, errors };
  return { data: report.items as Omit<Question, 'id'>[], errors: [] };
};

export interface RawJsonAnalysis {
  report: ExamReport;
  errors: ValidationError[];
  warnings: ValidationError[];
  /** one row per root cause ("Q#1–Q#5000: missing options" is ONE row, not 5000) */
  groups: IssueGroup[];
  /** ready-to-paste prompt for the user's AI chat */
  llmPrompt: string;
}

/** Everything the editor's "Validate" button needs, in one call. Nothing is modified. */
export const analyzeRawJson = (text: string): RawJsonAnalysis => {
  const report = processExamText(text, { mode: 'check' });
  const offsets = report.info.source === 'native' ? locateQuestions(text) : undefined;
  const all = report.issues.map((i) => toError(i, undefined, offsets, text));
  return {
    report,
    errors: all.filter((e) => e.severity === 'error'),
    warnings: all.filter((e) => e.severity !== 'error'),
    groups: report.groups,
    llmPrompt: buildLlmPrompt(report, text),
  };
};

export const formatValidationErrors = (errors: ValidationError[]): string[] => {
  return errors.map((err) => {
    // general message not tied to a question (syntax, numbering …)
    if (err.questionNumber === undefined && err.field === undefined && err.questionId === undefined) {
      return err.line !== undefined && !/line \d+/i.test(err.message) ? `Line ${err.line}: ${err.message}` : err.message;
    }
    let prefix = '';
    if (err.questionNumber !== undefined) {
      const qn = String(err.questionNumber);
      prefix += /^\(item \d+\)$/.test(qn) ? qn.replace(/[()]/g, '').replace(/^./, (c) => c.toUpperCase()) : `Q#${qn}`;
    }
    if (err.field) prefix += ` (Field: ${err.field})`;
    return `${prefix ? prefix + ': ' : ''}${err.message}`;
  });
};