/**
 * examCore.ts — shared exam JSON reader / repairer / validator.
 *
 * ONE source of truth for the bank CLI (validate.ts), the editor (validationService.ts)
 * and the import worker.  Pure TypeScript, no runtime dependencies (only ./renderSupport data),
 * so it loads in CommonJS ts-node, browsers and web workers alike.
 *
 * Design rules
 *  - Fast path first: native JSON.parse. Clean input costs nothing extra.
 *  - Slow path only on failure: ONE forgiving O(n) scanner (no backtracking regexes, depth-capped).
 *  - Tolerant reader, strict output: whatever comes in, the output is today's question shape.
 *  - Never reflows text: content is only changed by an explicit, reported fix.
 *  - Every fix has a tier:  safe (lossless) | guess (heuristic) | none (needs a human).
 *  - mode 'check'  : report only, never mutate (CLI, editor "Validate").
 *    mode 'repair' : apply safe fixes (+ guess fixes when applyGuess) and return clean questions.
 */
import { BASE_TAGS, BASE_GLOBAL_ATTRS, EXTRA_TAGS, GLOBAL_ATTRS_EXTRA, TAG_ATTRS, KNOWN_ELEMENTS } from './renderSupport';

// ───────────────────────────────────────────────────────────── public types

export type Severity = 'error' | 'warning' | 'info';
export type FixTier = 'safe' | 'guess' | 'none';

export interface Issue {
  code: string;
  severity: Severity;
  message: string;
  /** 0-based position in the question list */
  index?: number;
  /** what to show to the user: the question's number, or "(item N)" when it has none */
  questionNumber?: number | string;
  field?: string;
  line?: number;
  column?: number;
  offset?: number;
  fix?: FixTier;
  /** plain-English hint for what to look at (fatal syntax errors) */
  suggestion?: string;
}

export interface FixNote {
  code: string;
  message: string;
  count: number;
  tier: 'safe' | 'guess';
}

export interface IssueGroup {
  code: string;
  severity: Severity;
  title: string;
  field?: string;
  count: number;
  /** question numbers / labels (first 200) */
  questions: Array<number | string>;
  example: string;
  line?: number;
  fix?: FixTier;
}

export interface ExamQuestion {
  question_number: number;
  question_text: string;
  options: Record<string, string>;
  correct_answer: string;
  subject?: string | null;
  topic?: string | null;
  explanation?: string | null;
  difficulty?: string | null;
  section_id?: string | null;
  images?: string[] | null;
  [extra: string]: unknown;
}

export interface SkippedItem {
  /** 0-based index in the question list (undefined for pieces that could not even be read) */
  index?: number;
  line?: number;
  reason: string;
}

export interface ExamSummary {
  count: number;
  subjects: string[];
  topics: string[];
}

export interface ExamReport {
  /** no errors left and at least one question */
  ok: boolean;
  /** set when nothing usable could be read at all */
  fatal: Issue | null;
  /** raw parsed items (always filled when something was read) */
  items: unknown[];
  /** clean, normalised questions (repair mode only; questions that cannot be repaired are left out) */
  questions: ExamQuestion[];
  /** repair mode: same length/order as `items`; repaired questions, with unrepairable ones kept as written (editor use: never lose the user's text) */
  repairedItems: unknown[];
  skipped: SkippedItem[];
  issues: Issue[];
  groups: IssueGroup[];
  fixes: FixNote[];
  summary: ExamSummary;
  info: { source: 'native' | 'repaired'; arrays: number; truncated: boolean; ms: number };
}

export interface ProcessOptions {
  /** 'check' never mutates (default). 'repair' applies fixes. */
  mode?: 'check' | 'repair';
  /** repair mode: also apply heuristic (guess-tier) fixes */
  applyGuess?: boolean;
  /** keys accepted silently and passed through (editor: ['id', '_isDirty']) */
  clientKeys?: string[];
  maxQuestions?: number;
  maxBytes?: number;
  /** stop scanning after this many ms (low-end device guard) */
  timeBudgetMs?: number;
}

// ───────────────────────────────────────────────────────────── small utils

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasOwn = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);
const now = (): number => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());

export function lineCol(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let last = -1;
  const end = Math.min(Math.max(offset, 0), text.length);
  let p = text.indexOf('\n');
  while (p >= 0 && p < end) {
    line++;
    last = p;
    p = text.indexOf('\n', p + 1);
  }
  return { line, column: end - last };
}

export function snippetAt(text: string, offset: number): string {
  const { line, column } = lineCol(text, offset);
  const start = text.lastIndexOf('\n', Math.max(offset - 1, 0)) + (offset > 0 ? 1 : 0);
  let end = text.indexOf('\n', offset);
  if (end < 0) end = text.length;
  let lineText = text.slice(start, end);
  let col = offset - start;
  if (lineText.length > 110) {
    const from = Math.max(0, col - 50);
    lineText = (from > 0 ? '…' : '') + lineText.slice(from, from + 100) + (from + 100 < lineText.length ? '…' : '');
    col = col - from + (from > 0 ? 1 : 0);
  }
  return `Line ${line}, column ${column}:\n${lineText}\n${' '.repeat(Math.max(0, col))}^`;
}

function describe(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'a list';
  switch (typeof v) {
    case 'string': return 'text';
    case 'number': return 'a number';
    case 'boolean': return 'true/false';
    default: return typeof v;
  }
}

// ───────────────────────────────────────────────────────────── catalogue

const CATALOG: Record<string, { title: string; fixed: string }> = {
  // syntax
  S_TRAILING_COMMA: { title: 'Extra or trailing comma', fixed: 'Removed extra commas' },
  S_MISSING_COMMA: { title: 'Missing comma', fixed: 'Added missing commas' },
  S_SINGLE_QUOTES: { title: 'Single quotes used instead of double quotes', fixed: 'Converted single quotes to double quotes' },
  S_SMART_QUOTES: { title: 'Curly “smart” quotes used instead of straight quotes', fixed: 'Converted curly quotes to straight quotes' },
  S_UNQUOTED_KEY: { title: 'Field name without quotes', fixed: 'Added quotes around field names' },
  S_COMMENT: { title: 'Comments inside the JSON', fixed: 'Removed comments' },
  S_RAW_NEWLINE: { title: 'Line break typed inside a text value (must be \\n)', fixed: 'Converted line breaks inside text to \\n' },
  S_INVALID_ESCAPE: { title: 'Backslash that JSON does not allow (usually LaTeX like \\int or \\pi)', fixed: 'Kept LaTeX backslashes that JSON does not allow (\\int, \\pi …)' },
  S_INNER_QUOTE: { title: 'Double quote inside text that is not escaped', fixed: 'Escaped double quotes inside text' },
  S_PY_LITERAL: { title: 'Python/JavaScript value (True, None, undefined)', fixed: 'Converted True/False/None/undefined to JSON values' },
  S_TRUNCATED: { title: 'The text is cut off (unfinished)', fixed: 'Closed unfinished text/brackets' },
  S_PLACEHOLDER: { title: 'A "..." placeholder where content was left out', fixed: 'Ignored "..." placeholders' },
  S_INVISIBLE: { title: 'Invisible characters (BOM / zero-width space)', fixed: 'Removed invisible characters' },
  S_EXTRA_TEXT: { title: 'Extra text around the JSON', fixed: 'Ignored the text around the JSON' },
  S_FENCE: { title: 'Markdown code fences (```) around the JSON', fixed: 'Removed code fences' },
  S_MULTI_ARRAY: { title: 'Several separate lists pasted together', fixed: 'Merged several lists into one' },
  S_UNWRAP: { title: 'Questions are wrapped in an extra object/list', fixed: 'Unwrapped the question list' },
  S_WRAP: { title: 'A single question without the surrounding [ ]', fixed: 'Wrapped the single question into a list' },
  S_DOUBLE_ENCODED: { title: 'The JSON is escaped as a text string', fixed: 'Decoded the escaped JSON text' },
  // fatal
  E_EMPTY: { title: 'Nothing was pasted', fixed: '' },
  E_TOO_BIG: { title: 'The input is too large', fixed: '' },
  E_SYNTAX: { title: 'The JSON could not be read', fixed: '' },
  E_NO_QUESTIONS: { title: 'No questions were found', fixed: '' },
  E_TOO_MANY: { title: 'Too many questions', fixed: '' },
  // items
  E_ITEM_NOT_OBJECT: { title: 'List item is not a question object', fixed: '' },
  E_UNREADABLE_ITEM: { title: 'A question could not be read', fixed: '' },
  E_ALIAS_KEY: { title: 'Field has the wrong name', fixed: 'Renamed fields (question → question_text, answer → correct_answer …)' },
  W_UNKNOWN_KEY: { title: 'Unrecognised field (ignored)', fixed: 'Removed unrecognised fields' },
  W_CLIENT_KEY: { title: 'App-internal field (id / _isDirty) in imported data', fixed: 'Removed app-internal fields' },
  E_QNUM_TYPE: { title: "'question_number' is text, not a number", fixed: 'Converted question numbers from text to numbers' },
  E_QNUM_INVALID: { title: "'question_number' missing or not a positive whole number", fixed: 'Assigned missing question numbers' },
  E_QNUM_DUP: { title: 'Duplicate question numbers', fixed: '' },
  E_QNUM_SEQ: { title: 'Question numbers are not 1, 2, 3 … with no gaps', fixed: 'Renumbered questions 1…N' },
  E_NO_TEXT: { title: "'question_text' missing or empty", fixed: '' },
  E_TEXT_TYPE: { title: "'question_text' is not a single text", fixed: 'Joined a list of lines into one text' },
  E_NO_OPTIONS: { title: "'options' missing", fixed: '' },
  E_OPTIONS_TYPE: { title: "'options' has the wrong type", fixed: '' },
  E_OPTIONS_ARRAY: { title: "'options' is a list instead of an object", fixed: 'Converted option lists to {"a": …, "b": …}' },
  E_OPTIONS_MIN: { title: "'options' needs at least two choices", fixed: '' },
  E_OPTION_KEY_EMPTY: { title: 'Empty option key', fixed: '' },
  E_OPTION_KEY_SPACE: { title: 'Option key has spaces around it', fixed: 'Trimmed spaces around option keys' },
  E_OPTION_TYPE: { title: 'Option value is not text', fixed: 'Converted option values to text' },
  E_OPTION_EMPTY: { title: 'Empty option text', fixed: '' },
  W_OPTION_KEY_CASE: { title: 'Option keys differ only by upper/lower case', fixed: '' },
  W_OPTION_PREFIX: { title: 'Option text repeats its own letter ("a) …")', fixed: 'Removed repeated letters ("a) ") from option texts' },
  W_DUP_OPTION: { title: 'Two options have identical text', fixed: '' },
  E_NO_ANSWER: { title: "'correct_answer' missing or empty", fixed: '' },
  E_ANSWER_MULTI: { title: 'More than one correct answer', fixed: '' },
  E_ANSWER_FORMAT: { title: "'correct_answer' is not exactly an option key", fixed: 'Set correct_answer to the matching option key' },
  E_ANSWER_NO_MATCH: { title: "'correct_answer' does not match any option", fixed: '' },
  W_DIFFICULTY: { title: "'difficulty' is not Easy / Medium / Hard", fixed: 'Normalised difficulty values' },
  W_FIELD_TYPE: { title: 'Optional field has the wrong type', fixed: 'Converted/removed optional fields with the wrong type' },
  W_EMPTY_FIELD: { title: 'Optional field is an empty text', fixed: 'Replaced empty optional fields with null' },
  W_IMAGES_TYPE: { title: "'images' must be a list of texts", fixed: "Removed invalid 'images'" },
  W_DUP_QUESTION: { title: 'Duplicate question', fixed: 'Removed duplicate questions' },
  // content
  E_ESCAPE_DAMAGE: { title: 'LaTeX backslash was eaten by JSON (TAB / line break / CR where \\times, \\right, \\neq … should be)', fixed: 'Restored LaTeX commands damaged by JSON escapes (\\times, \\text, \\right, \\neq …)' },
  W_AI_ARTIFACT: { title: 'AI citation artifacts in the text', fixed: 'Removed AI citation artifacts' },
  W_LATEX_DELIMS: { title: 'Math written as \\( … \\) or \\[ … \\] (the app only renders $ … $ and $$ … $$)', fixed: 'Converted \\( \\) and \\[ \\] math to $ $ and $$ $$' },
  W_MISSING_BACKSLASH: { title: 'LaTeX command written without its backslash inside math (approx instead of \\approx)', fixed: 'Added the missing backslash to LaTeX commands inside math (approx → \\approx)' },
  W_OVER_ESCAPED: { title: 'LaTeX command with a doubled backslash inside math (\\\\times)', fixed: 'Fixed doubled backslashes inside math' },
  W_CURRENCY_MATH: { title: 'Dollar amounts will be read as math ($5 … $10)', fixed: 'Escaped dollar amounts so they show as money' },
  W_BARE_LT: { title: 'A "<word>" in the text is read as HTML and will vanish', fixed: 'Escaped "<" that was meant as text' },
  W_SVG_STRIPPED: { title: 'SVG uses parts the renderer removes', fixed: '' },
  W_HTML_EXECUTE: { title: 'Contains an html-execute block (runs HTML/JavaScript in a sandbox)', fixed: '' },
  W_UNCLOSED_FENCE: { title: 'Unclosed ``` code fence', fixed: '' },
  W_LATEX_OUTSIDE_MATH: { title: 'LaTeX outside $ … $ (shows as raw text)', fixed: '' },
  W_LONG_TEXT: { title: 'Very long text', fixed: '' },
};

const TIER: Record<string, FixTier> = { S_INNER_QUOTE: 'guess', S_TRUNCATED: 'guess', S_PLACEHOLDER: 'guess' };

class Book {
  m = new Map<string, { count: number; first: number; tier: FixTier }>();
  add(code: string, pos = -1, tier?: FixTier): void {
    const e = this.m.get(code);
    if (e) e.count++;
    else this.m.set(code, { count: 1, first: pos, tier: tier ?? TIER[code] ?? 'safe' });
  }
  merge(o: Book): void {
    o.m.forEach((v, k) => {
      const e = this.m.get(k);
      if (e) e.count += v.count;
      else this.m.set(k, { ...v });
    });
  }
}

// ───────────────────────────────────────────────────────────── forgiving parser

class Fail {
  pos: number;
  kind: string;
  message: string;
  constructor(pos: number, kind: string, message: string) {
    this.pos = pos;
    this.kind = kind;
    this.message = message;
  }
}

interface SkipRec { ordinal: number; offset: number; pos: number; kind: string; message: string }
interface ParseOutcome { ok: boolean; value?: unknown; end: number; eof: boolean; fail?: { pos: number; kind: string; message: string } }

const PLACEHOLDER = Symbol('placeholder');
const MAX_DEPTH = 64;
const OPENERS = '"\'“”„‟‘’‚';
const isQuoteCh = (c: string): boolean => c !== '' && OPENERS.indexOf(c) >= 0;
const isIdentStart = (c: string): boolean => c !== '' && /[A-Za-z_$]/.test(c);
const NUM_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const RESYNC_RE = /\{\s*["'“”‘’]?\s*(?:question_number|question_text|question|options|subject|topic|number|q)\b/g;

function closersFor(open: string): string {
  if (open === '"') return '"';
  if (open === "'") return "'";
  if (open === '“' || open === '”' || open === '„' || open === '‟') return '”“"„';
  return '’‘\'‚';
}

function forgivingParse(s: string, start: number, book: Book, skipped: SkipRec[]): ParseOutcome {
  const n = s.length;
  let i = start;
  let depth = 0;
  let eof = false;

  const skip = (): void => {
    while (i < n) {
      const c = s.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13) { i++; continue; }
      if (c === 0xfeff || c === 0xa0 || c === 0x200b || c === 0x200c || c === 0x200d || c === 0x2060 || c === 0x2007 || c === 0x202f) { book.add('S_INVISIBLE', i); i++; continue; }
      if (c === 47) {
        const d = s.charCodeAt(i + 1);
        if (d === 47) { book.add('S_COMMENT', i); const e = s.indexOf('\n', i); i = e < 0 ? n : e + 1; continue; }
        if (d === 42) { book.add('S_COMMENT', i); const e = s.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
      }
      if (c === 35) { book.add('S_COMMENT', i); const e = s.indexOf('\n', i); i = e < 0 ? n : e + 1; continue; }
      return;
    }
  };

  const looksLikeEnd = (pos: number, isKey: boolean): boolean => {
    let j = pos + 1;
    while (j < n && (s.charCodeAt(j) === 32 || s.charCodeAt(j) === 9)) j++;
    if (j >= n) return true;
    const c = s.charAt(j);
    if (c === ',' || c === '}' || c === ']') return true;
    if (c === ':') return isKey;
    if (c === '\n' || c === '\r') {
      while (j < n && /\s/.test(s.charAt(j))) j++;
      if (j >= n) return true;
      const d = s.charAt(j);
      if (d === '"' || d === "'" || isQuoteCh(d) || d === '{' || d === '[' || d === '}' || d === ']' || d === ',') return true;
      return !isKey && /^[A-Za-z_$][\w$-]*\s*:/.test(s.slice(j, j + 60));
    }
    return false;
  };

  const num = (): number => {
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(s);
    if (!m) throw new Fail(i, 'EXPECTED_VALUE', 'Invalid number');
    i += m[0].length;
    return Number(m[0]);
  };

  const str = (isKey: boolean): string => {
    const open = s.charAt(i);
    const closers = closersFor(open);
    if (open !== '"') book.add(open === "'" ? 'S_SINGLE_QUOTES' : 'S_SMART_QUOTES', i);
    i++;
    let out = '';
    let run = i;
    for (;;) {
      if (i >= n) { eof = true; book.add('S_TRUNCATED', i); return out + s.slice(run, i); }
      const cc = s.charCodeAt(i);
      if (cc === 92) {
        out += s.slice(run, i);
        const nx = s.charAt(i + 1);
        if (nx === '') { out += '\\'; i++; run = i; continue; }
        switch (nx) {
          case '"': out += '"'; i += 2; break;
          case '\\': out += '\\'; i += 2; break;
          case '/': out += '/'; i += 2; break;
          case "'": out += "'"; i += 2; break;
          case 'b': out += '\b'; i += 2; break;
          case 'f': out += '\f'; i += 2; break;
          case 'n': out += '\n'; i += 2; break;
          case 'r': out += '\r'; i += 2; break;
          case 't': out += '\t'; i += 2; break;
          case 'u': {
            const hex = s.substr(i + 2, 4);
            if (/^[0-9a-fA-F]{4}$/.test(hex)) { out += String.fromCharCode(parseInt(hex, 16)); i += 6; }
            else { book.add('S_INVALID_ESCAPE', i); out += '\\u'; i += 2; }
            break;
          }
          default: book.add('S_INVALID_ESCAPE', i); out += '\\' + nx; i += 2;
        }
        run = i;
        continue;
      }
      const c = s.charAt(i);
      if (closers.indexOf(c) >= 0) {
        if (looksLikeEnd(i, isKey)) { out += s.slice(run, i); i++; return out; }
        book.add('S_INNER_QUOTE', i);
        i++;
        continue;
      }
      if (cc === 10 || cc === 13) book.add('S_RAW_NEWLINE', i);
      i++;
    }
  };

  const resync = (pos: number): number => {
    RESYNC_RE.lastIndex = pos + 1;
    const m = RESYNC_RE.exec(s);
    return m ? m.index : -1;
  };

  const value = (): unknown => {
    skip();
    if (i >= n) { eof = true; throw new Fail(i, 'EOF', 'Unexpected end of text'); }
    const c = s.charAt(i);
    if (c === '{') return obj();
    if (c === '[') return arr();
    if (isQuoteCh(c)) return str(false);
    if (c === '-' || (c >= '0' && c <= '9')) return num();
    if (c === '.' && s.charCodeAt(i + 1) === 46 && s.charCodeAt(i + 2) === 46) { book.add('S_PLACEHOLDER', i); i += 3; return PLACEHOLDER; }
    if (c === '…') { book.add('S_PLACEHOLDER', i); i++; return PLACEHOLDER; }
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(s.charAt(j))) j++;
      const w = s.slice(i, j);
      const lw = w.toLowerCase();
      if (w === 'true') { i = j; return true; }
      if (w === 'false') { i = j; return false; }
      if (w === 'null') { i = j; return null; }
      if (lw === 'true' || lw === 'false' || lw === 'none' || lw === 'null') { book.add('S_PY_LITERAL', i); i = j; return lw === 'true' ? true : lw === 'false' ? false : null; }
      if (w === 'undefined' || w === 'NaN' || w === 'Infinity') { book.add('S_PY_LITERAL', i); i = j; return null; }
      throw new Fail(i, 'EXPECTED_VALUE', `Unexpected word "${w.slice(0, 24)}" where a value was expected`);
    }
    throw new Fail(i, 'EXPECTED_VALUE', `Unexpected "${c}" where a value was expected`);
  };

  const obj = (): Record<string, unknown> => {
    if (++depth > MAX_DEPTH) throw new Fail(i, 'TOO_DEEP', 'Nested far too deeply');
    const o: Record<string, unknown> = {};
    i++;
    let prevComma = false;
    for (;;) {
      skip();
      if (i >= n) { eof = true; book.add('S_TRUNCATED', i); break; }
      const c = s.charAt(i);
      if (c === '}') { if (prevComma) book.add('S_TRAILING_COMMA', i); i++; break; }
      if (c === ',') { book.add('S_TRAILING_COMMA', i); i++; continue; }
      let key: string;
      if (isQuoteCh(c)) key = str(true);
      else if (isIdentStart(c)) {
        let j = i + 1;
        while (j < n && /[A-Za-z0-9_$-]/.test(s.charAt(j))) j++;
        key = s.slice(i, j);
        book.add('S_UNQUOTED_KEY', i);
        i = j;
      } else throw new Fail(i, 'EXPECTED_KEY', `Expected a field name but found "${c}"`);
      skip();
      const colon = s.charAt(i);
      if (colon === ':' || colon === '=') i++;
      else if (i >= n) { eof = true; book.add('S_TRUNCATED', i); break; }
      else throw new Fail(i, 'EXPECTED_COLON', 'Expected ":" after a field name');
      let v: unknown;
      try { v = value(); } catch (e) { if (e instanceof Fail && e.kind === 'EOF') break; throw e; }
      if (v !== PLACEHOLDER) Object.defineProperty(o, key, { value: v, enumerable: true, writable: true, configurable: true });
      skip();
      const d = s.charAt(i);
      if (d === ',') { i++; prevComma = true; continue; }
      prevComma = false;
      if (d === '}') { i++; break; }
      if (i >= n) { eof = true; book.add('S_TRUNCATED', i); break; }
      if (isQuoteCh(d) || isIdentStart(d)) { book.add('S_MISSING_COMMA', i); continue; }
      throw new Fail(i, 'EXPECTED_COMMA', 'Expected "," or "}" after a value');
    }
    depth--;
    return o;
  };

  const arr = (): unknown[] => {
    if (++depth > MAX_DEPTH) throw new Fail(i, 'TOO_DEEP', 'Nested far too deeply');
    const myDepth = depth;
    const a: unknown[] = [];
    i++;
    let ordinal = 0;
    let prevComma = false;
    for (;;) {
      skip();
      if (i >= n) { eof = true; book.add('S_TRUNCATED', i); break; }
      const c = s.charAt(i);
      if (c === ']') { if (prevComma) book.add('S_TRAILING_COMMA', i); i++; break; }
      if (c === ',') { book.add('S_TRAILING_COMMA', i); i++; continue; }
      const elemStart = i;
      try {
        const v = value();
        if (v !== PLACEHOLDER) {
          if (eof && isObj(v)) {
            skipped.push({ ordinal, offset: elemStart, pos: i, kind: 'CUT_OFF', message: 'This question was cut off — the text ended before it was complete' });
            break;
          }
          a.push(v);
        }
        ordinal++;
        skip();
        const d = s.charAt(i);
        if (d === ',') { i++; prevComma = true; continue; }
        prevComma = false;
        if (d === ']') { i++; break; }
        if (i >= n) { eof = true; book.add('S_TRUNCATED', i); break; }
        if (d === '{' || d === '[' || isQuoteCh(d) || (d >= '0' && d <= '9') || d === '-') { book.add('S_MISSING_COMMA', i); continue; }
        throw new Fail(i, 'EXPECTED_COMMA', 'Expected "," or "]" between items');
      } catch (e) {
        if (!(e instanceof Fail)) throw e;
        depth = myDepth;
        if (e.kind === 'EOF') { eof = true; break; }
        if (myDepth > 2 || s.charAt(elemStart) !== '{') throw e;
        skipped.push({ ordinal, offset: e.kind === 'EXPECTED_COMMA' ? e.pos : elemStart, pos: e.pos, kind: e.kind, message: e.message });
        ordinal++;
        const rs = resync(e.pos);
        if (rs < 0) { i = n; break; }
        i = rs;
        prevComma = false;
      }
    }
    depth--;
    return a;
  };

  try {
    const v = value();
    return { ok: true, value: v, end: i, eof };
  } catch (e) {
    if (e instanceof Fail) return { ok: false, end: i, eof, fail: { pos: e.pos, kind: e.kind, message: e.message } };
    throw e;
  }
}

const KNOWN_KEYS = new Set(['question_number', 'question_text', 'options', 'correct_answer', 'subject', 'topic', 'explanation', 'difficulty', 'section_id', 'images']);
const ALIASES: Record<string, string> = {
  question: 'question_text', q: 'question_text', text: 'question_text', prompt: 'question_text', stem: 'question_text', question_stem: 'question_text', questiontext: 'question_text',
  choices: 'options', opts: 'options', option_list: 'options', answer_options: 'options', answers: 'options', option: 'options',
  answer: 'correct_answer', correct: 'correct_answer', correct_option: 'correct_answer', correct_choice: 'correct_answer', right_answer: 'correct_answer', answer_key: 'correct_answer', ans: 'correct_answer', key: 'correct_answer',
  explain: 'explanation', solution: 'explanation', rationale: 'explanation', reasoning: 'explanation', answer_explanation: 'explanation', explanations: 'explanation',
  level: 'difficulty', difficulty_level: 'difficulty',
  number: 'question_number', no: 'question_number', q_no: 'question_number', qno: 'question_number', q_number: 'question_number', question_no: 'question_number', qnum: 'question_number',
};

function canonKey(k: string): string {
  const n = k.trim().replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase().replace(/[\s\-.]+/g, '_');
  return hasOwn(ALIASES, n) ? ALIASES[n] : n;
}

function looksLikeQuestion(o: Record<string, unknown>): boolean {
  for (const k of Object.keys(o)) {
    const c = canonKey(k);
    if (c === 'question_text' || c === 'options' || c === 'correct_answer') return true;
  }
  return false;
}

function shapeToItems(v: unknown, book: Book): unknown[] | null {
  if (Array.isArray(v)) {
    if (v.length > 0 && v.every((x) => Array.isArray(x))) {
      book.add('S_UNWRAP');
      const flat: unknown[] = [];
      for (const part of v as unknown[][]) for (const x of part) flat.push(x);
      return flat;
    }
    return v;
  }
  if (isObj(v)) {
    for (const pref of ['questions', 'items', 'data', 'exam', 'quiz', 'mcqs', 'results', 'list']) {
      const x = v[pref];
      if (Array.isArray(x)) { book.add('S_UNWRAP'); return x; }
      if (isObj(x)) {
        for (const p2 of ['questions', 'items', 'data']) {
          const y = x[p2];
          if (Array.isArray(y)) { book.add('S_UNWRAP'); return y; }
        }
      }
    }
    const arrKeys = Object.keys(v).filter((k) => Array.isArray(v[k]) && (v[k] as unknown[]).some(isObj));
    if (arrKeys.length === 1) { book.add('S_UNWRAP'); return v[arrKeys[0]] as unknown[]; }
    if (looksLikeQuestion(v)) { book.add('S_WRAP'); return [v]; }
  }
  return null;
}

function plausible(raw: string, idx: number): boolean {
  const n = raw.length;
  let j = idx + 1;
  while (j < n) {
    const c = raw.charCodeAt(j);
    if (c === 32 || c === 9 || c === 10 || c === 13 || c === 0xfeff || c === 0x200b || c === 0xa0) j++;
    else break;
  }
  const c = raw.charAt(j);
  if (raw.charAt(idx) === '[') return c === '{' || c === ']' || c === '[' || c === '/' || c === '#';
  return isQuoteCh(c) || isIdentStart(c) || c === '}' || c === '/';
}

interface Extracted {
  items: unknown[] | null;
  arrays: number;
  truncated: boolean;
  skipped: SkipRec[];
  fail: { pos: number; kind: string; message: string } | null;
}

function extractSlow(raw: string, book: Book, deadline: number): Extracted {
  const n = raw.length;
  const t = raw.trim();
  if (/^[[{\s]*\\"/.test(t)) {
    try {
      const un: unknown = JSON.parse('"' + t.replace(/\r?\n/g, '\\n') + '"');
      if (typeof un === 'string') { book.add('S_DOUBLE_ENCODED', 0); return extractSlow(un, book, deadline); }
    } catch { /* not an escaped document */ }
  }
  const merged: unknown[] = [];
  const skipped: SkipRec[] = [];
  const ranges: Array<[number, number]> = [];
  let arrays = 0;
  let emptyArrays = 0;
  let lists = 0;
  let truncated = false;
  let best: Extracted['fail'] = null;
  const re = /[[{]/g;
  let pos = 0;
  let attempts = 0;
  while (pos < n && attempts < 200 && now() < deadline) {
    re.lastIndex = pos;
    const m = re.exec(raw);
    if (!m) break;
    const idx = m.index;
    attempts++;
    if (!plausible(raw, idx)) { pos = idx + 1; continue; }
    const b = new Book();
    const sk: SkipRec[] = [];
    const out = forgivingParse(raw, idx, b, sk);
    if (!out.ok) {
      if (out.fail && (!best || out.fail.pos > best.pos)) best = out.fail;
      pos = idx + 1;
      continue;
    }
    const shape = new Book();
    const items = shapeToItems(out.value, shape);
    const useful = items !== null && (items.some(isObj) || (items.length === 0 && Array.isArray(out.value)));
    if (!useful || items === null) { pos = Math.max(out.end, idx + 1); continue; }
    book.merge(b);
    book.merge(shape);
    for (const x of sk) skipped.push(x);
    if (items.length > 0) { arrays++; for (const x of items) merged.push(x); } else emptyArrays++;
    if (Array.isArray(out.value) || (isObj(out.value) && !looksLikeQuestion(out.value))) lists++;
    ranges.push([idx, out.end]);
    if (out.eof) truncated = true;
    pos = Math.max(out.end, idx + 1);
  }
  if (arrays === 0 && emptyArrays === 0) return { items: null, arrays: 0, truncated: false, skipped, fail: best };
  if (ranges.length > 0) {
    let prev = 0;
    let fence = false;
    let extra = false;
    const check = (gap: string): void => {
      if (/```|~~~/.test(gap)) fence = true;
      const rest = gap.replace(/(```|~~~)[A-Za-z0-9_-]*/g, '').replace(/[\u200B-\u200D\u2060\uFEFF,;]/g, '').trim();
      if (rest.length > 0) extra = true;
    };
    for (const r of ranges) { check(raw.slice(prev, r[0])); prev = r[1]; }
    check(raw.slice(prev));
    if (fence) book.add('S_FENCE', 0);
    if (extra) book.add('S_EXTRA_TEXT', 0);
  }
  if (lists > 1) book.add('S_MULTI_ARRAY', 0);
  return { items: merged, arrays: Math.max(lists, 1), truncated, skipped, fail: null };
}

// ───────────────────────────────────────────────────────────── markdown-aware text helpers

type Edit = { start: number; end: number; text: string };

function applyEdits(s: string, edits: Edit[]): string {
  if (edits.length === 0) return s;
  edits.sort((a, b) => a.start - b.start);
  let out = '';
  let pos = 0;
  for (const e of edits) {
    if (e.start < pos) continue;
    out += s.slice(pos, e.start) + e.text;
    pos = e.end;
  }
  return out + s.slice(pos);
}

const blank = (m: string): string => m.replace(/[^\n]/g, ' ');
const CODE_RE = /```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]*`/g;

/** Same-length copy of s with code fences / inline code blanked out. Offsets stay valid. */
export function maskCode(s: string): string {
  if (s.indexOf('`') < 0 && s.indexOf('~~~') < 0) return s;
  return s.replace(CODE_RE, blank);
}

interface MathSpan { start: number; end: number; display: boolean }

/** Pairs "$" / "$$" the way remark-math does. end === -1 means unclosed. */
function mathSpans(s: string): MathSpan[] {
  const out: MathSpan[] = [];
  const n = s.length;
  let i = 0;
  while (i < n) {
    const c = s.charCodeAt(i);
    if (c === 92) { i += 2; continue; }
    if (c === 36) {
      if (s.charCodeAt(i + 1) === 36) {
        const j = s.indexOf('$$', i + 2);
        if (j < 0) { out.push({ start: i, end: -1, display: true }); break; }
        out.push({ start: i, end: j + 2, display: true });
        i = j + 2;
        continue;
      }
      let j = i + 1;
      while (j < n) {
        const d = s.charCodeAt(j);
        if (d === 92) { j += 2; continue; }
        if (d === 36) break;
        j++;
      }
      if (j >= n) { out.push({ start: i, end: -1, display: false }); break; }
      out.push({ start: i, end: j + 1, display: false });
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

function maskMath(s: string, spans: MathSpan[]): string {
  const edits: Edit[] = [];
  for (const sp of spans) if (sp.end > 0) edits.push({ start: sp.start, end: sp.end, text: blank(s.slice(sp.start, sp.end)) });
  return applyEdits(s, edits);
}

const inAnyMath = (spans: MathSpan[], pos: number, len: number): boolean => {
  for (const sp of spans) if (pos > sp.start && pos < (sp.end < 0 ? len : sp.end)) return true;
  return false;
};

// ───────────────────────────────────────────────────────────── content rules

interface TextRule {
  code: string;
  severity: Severity;
  tier: FixTier;
  /** returns a short detail string when the rule applies */
  test: (s: string) => string | null;
  fix?: (s: string) => string;
  msg: (detail: string, field: string) => string;
}

// --- escape damage: JSON turned a LaTeX backslash into a control character ---
const DMG: Record<string, { always: Set<string>; mathOnly: Set<string>; letter: string; name: string }> = {
  '\t': { letter: 't', name: 'TAB', always: new Set(['heta', 'imes', 'ext', 'extbf', 'extit', 'extrm', 'extsf', 'exttt', 'extstyle', 'riangle', 'herefore', 'ilde', 'anh', 'frac', 'binom']), mathOnly: new Set(['au', 'an', 'o', 'op', 'ag']) },
  '\r': { letter: 'r', name: 'carriage return', always: new Set(['ight', 'ightarrow', 'angle', 'ceil', 'floor', 'ightharpoonup', 'ightleftharpoons']), mathOnly: new Set(['ho']) },
  '\n': { letter: 'n', name: 'line break', always: new Set<string>(), mathOnly: new Set(['eq', 'abla', 'eg', 'otin', 'less', 'parallel', 'subseteq', 'mid']) },
};
const DMG_RE = /[\f\b]|([\t\r\n])([A-Za-z]+)/g;

function findDamage(s: string): Array<{ pos: number; ch: string; word: string }> {
  if (!/[\f\b]|[\t\r\n][A-Za-z]/.test(s)) return [];
  const hits: Array<{ pos: number; ch: string; word: string }> = [];
  let spans: MathSpan[] | null = null;
  DMG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DMG_RE.exec(s)) !== null) {
    if (m[1] === undefined) { hits.push({ pos: m.index, ch: m[0], word: '' }); continue; }
    const d = DMG[m[1]];
    const word = m[2];
    if (d.always.has(word)) { hits.push({ pos: m.index, ch: m[1], word }); continue; }
    if (d.mathOnly.has(word)) {
      if (spans === null) spans = mathSpans(maskCode(s));
      if (inAnyMath(spans, m.index, s.length)) hits.push({ pos: m.index, ch: m[1], word });
    }
  }
  return hits;
}

const BACK: Record<string, string> = { '\f': 'f', '\b': 'b', '\t': 't', '\r': 'r', '\n': 'n' };

// --- AI artifacts ---
const AI_RE = / ?:contentReference\[oaicite:\d+\]\{index=\d+\}| ?\[cite(?:_start|_end)?(?::[^\]]*)?\]| ?【[^】]*†[^】]*】|\uE200[^\uE201]*\uE201/g;

// --- \( \)  \[ \] math delimiters ---
const DELIM_RE = /\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;

// --- over-escaped commands inside math ---
const OVER_RE = /\\\\(?=(?:frac|dfrac|tfrac|sqrt|times|cdot|text|textbf|chi|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|rho|sigma|tau|phi|psi|omega|Delta|Omega|Sigma|Pi|Gamma|Lambda|sum|prod|int|lim|log|ln|sin|cos|tan|leq|geq|neq|approx|infty|pm|mp|rightarrow|leftarrow|Rightarrow|to|vec|hat|bar|mathrm|mathbf|left|right|degree)(?![A-Za-z]))/g;

// --- bare "<word>" ---
const KNOWN_SET = new Set<string>([...KNOWN_ELEMENTS, ...BASE_TAGS, ...EXTRA_TAGS].map((x) => x.toLowerCase()));
const TAG_RE = /<([A-Za-z][A-Za-z0-9-]*)((?:\s+[A-Za-z_:][\w:.-]*(?:\s*=\s*(?:[^\s"'=<>`]+|'[^']*'|"[^"]*"))?)*)\s*\/?>/g;
const SVG_BLOCK_RE = /<svg\b[\s\S]*?<\/svg>/gi;

function maskForProse(s: string): string {
  let m = maskCode(s);
  if (m.indexOf('<svg') >= 0 || m.indexOf('<SVG') >= 0) m = m.replace(SVG_BLOCK_RE, blank);
  return maskMath(m, mathSpans(m));
}

function findBareLt(s: string): Array<{ pos: number; tag: string }> {
  if (s.indexOf('<') < 0) return [];
  const m = maskForProse(s);
  const hits: Array<{ pos: number; tag: string }> = [];
  TAG_RE.lastIndex = 0;
  let r: RegExpExecArray | null;
  while ((r = TAG_RE.exec(m)) !== null) if (!KNOWN_SET.has(r[1].toLowerCase())) hits.push({ pos: r.index, tag: r[0] });
  return hits;
}

// --- currency read as math ---
function findCurrency(s: string): Array<{ open: number; close: number; text: string }> {
  if (s.indexOf('$') < 0) return [];
  const m = maskCode(s);
  const out: Array<{ open: number; close: number; text: string }> = [];
  for (const sp of mathSpans(m)) {
    if (sp.end < 0 || sp.display) continue;
    const content = m.slice(sp.start + 1, sp.end - 1);
    // both "$" must touch a number ON THE SAME LINE ("$5 … $10"); real math never closes right before a digit
    if (!/^[ \t]?\d/.test(content) || !/^[ \t]?\d/.test(m.slice(sp.end, sp.end + 3))) continue;
    if (/[\\^_{}]/.test(content)) continue;
    // money looks like words between the amounts, or a bare number with an operator ("$5.00 + $2.00")
    const words = content.match(/[A-Za-z]{3,}/g);
    const bareSum = /^[ \t]?[\d.,]+[\d\s.,+\-×*/()=x:;]*$/.test(content);
    const hasProse = words !== null && words.length >= 1;
    if (!bareSum && !hasProse) continue;
    out.push({ open: sp.start, close: sp.end - 1, text: m.slice(sp.start, Math.min(sp.end + 4, sp.start + 40)) });
  }
  return out;
}

// --- SVG lint: what will the renderer strip? ---
const normAttr = (a: string): string => {
  const x = a.toLowerCase().replace(/[-:]/g, '');
  return x === 'class' ? 'classname' : x === 'for' ? 'htmlfor' : x;
};
const GLOBAL_ATTR_SET = new Set<string>([...BASE_GLOBAL_ATTRS, ...GLOBAL_ATTRS_EXTRA].map(normAttr));
const TAG_ATTR_SETS: Record<string, Set<string>> = {};
const ALLOWED_TAG_SET = new Set<string>([...BASE_TAGS, ...EXTRA_TAGS].map((x) => x.toLowerCase()));
function allowedAttrs(tag: string): Set<string> {
  let set = TAG_ATTR_SETS[tag];
  if (!set) {
    set = new Set<string>(GLOBAL_ATTR_SET);
    const own = TAG_ATTRS[tag];
    if (own) for (const a of own) set.add(normAttr(a));
    TAG_ATTR_SETS[tag] = set;
  }
  return set;
}

function svgStripped(s: string): string[] {
  if (s.toLowerCase().indexOf('<svg') < 0) return [];
  const m = maskCode(s);
  const lost = new Set<string>();
  SVG_BLOCK_RE.lastIndex = 0;
  let b: RegExpExecArray | null;
  while ((b = SVG_BLOCK_RE.exec(m)) !== null) {
    const tagRe = /<([A-Za-z][\w:-]*)([^>]*)>/g;
    let t: RegExpExecArray | null;
    while ((t = tagRe.exec(b[0])) !== null) {
      const tag = t[1].toLowerCase();
      if (!ALLOWED_TAG_SET.has(tag)) { lost.add(`<${t[1]}>`); continue; }
      const allowed = allowedAttrs(tag);
      const attrRe = /\s([A-Za-z_:][\w:.-]*)\s*=/g;
      let a: RegExpExecArray | null;
      while ((a = attrRe.exec(t[2])) !== null) {
        if (a[1].toLowerCase() === 'xmlns:xlink' || a[1].toLowerCase() === 'role') continue;
        if (!allowed.has(normAttr(a[1]))) lost.add(`${a[1]} on <${t[1]}>`);
      }
    }
  }
  return Array.from(lost);
}


// --- LaTeX command typed without its backslash inside math ($300/13 approx 23.07$) ---
// Only words that are (almost) never a variable name; short ones (pi, mu, pm …) and function names (sin, log …) are left alone.
const BARE_CMDS = 'approx|times|cdot|leq|geq|neq|infty|rightarrow|leftarrow|Rightarrow|Leftarrow|sqrt|dfrac|frac|alpha|beta|gamma|delta|epsilon|theta|lambda|sigma|omega';
const BARE_RE = new RegExp('(^|[^\\\\A-Za-z])(' + BARE_CMDS + ')(?![A-Za-z])', 'g');

/** Same-length copy of math content with the inside of \text{…}, \mathrm{…} … blanked: words there are ordinary text, not commands. */
function blankTextGroups(c: string): string {
  if (c.indexOf('\\') < 0) return c;
  const re = /\\(?:text|textbf|textit|textrm|textsf|texttt|mathrm|mathbf|mathit|mathsf|mathtt|mbox|hbox|operatorname)\s*\{/g;
  const edits: Edit[] = [];
  let r: RegExpExecArray | null;
  while ((r = re.exec(c)) !== null) {
    let depth = 1;
    let j = r.index + r[0].length;
    const start = j;
    while (j < c.length && depth > 0) {
      const ch = c.charAt(j);
      if (ch === '\\') { j += 2; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      j++;
    }
    const end = depth === 0 ? j - 1 : c.length;
    edits.push({ start, end, text: blank(c.slice(start, end)) });
    re.lastIndex = Math.max(re.lastIndex, end);
  }
  return applyEdits(c, edits);
}

function findMissingBackslash(s: string): Array<{ pos: number; word: string }> {
  if (!new RegExp(BARE_CMDS).test(s) || s.indexOf('$') < 0) return [];
  const m = maskCode(s);
  const hits: Array<{ pos: number; word: string }> = [];
  for (const sp of mathSpans(m)) {
    if (sp.end < 0) continue;
    const from = sp.start + (sp.display ? 2 : 1);
    const to = sp.end - (sp.display ? 2 : 1);
    const content = blankTextGroups(m.slice(from, to));
    BARE_RE.lastIndex = 0;
    let r: RegExpExecArray | null;
    while ((r = BARE_RE.exec(content)) !== null) hits.push({ pos: from + r.index + r[1].length, word: r[2] });
  }
  return hits;
}

const LATEX_CMD_RE = /\\(?:frac|dfrac|sqrt|alpha|beta|gamma|delta|theta|pi|sum|int|times|cdot|leq|geq|neq|rightarrow|vec|hat|lambda|mu|sigma|omega|infty|partial|lim|mathrm|text)(?![A-Za-z])/;

const RULES: TextRule[] = [
  {
    code: 'E_ESCAPE_DAMAGE', severity: 'error', tier: 'safe',
    test: (s) => {
      const hits = findDamage(s);
      if (hits.length === 0) return null;
      const uniq: string[] = [];
      for (const h of hits) {
        const d = h.word === '' ? `a ${h.ch === '\f' ? 'form-feed' : 'backspace'} character` : `${DMG[h.ch].name} before "${h.word}" (was \\${BACK[h.ch]}${h.word}?)`;
        if (uniq.indexOf(d) < 0) uniq.push(d);
      }
      return uniq.slice(0, 3).join('; ') + (hits.length > 1 ? ` — ${hits.length} places in this text` : '');
    },
    fix: (s) => applyEdits(s, findDamage(s).map((h) => ({ start: h.pos, end: h.pos + 1, text: '\\' + BACK[h.ch] }))),
    msg: (d, f) => `${f}: a LaTeX backslash was eaten by JSON — ${d}. In JSON every LaTeX backslash must be written twice (\\\\times).`,
  },
  {
    code: 'W_AI_ARTIFACT', severity: 'warning', tier: 'safe',
    test: (s) => { AI_RE.lastIndex = 0; const m = AI_RE.exec(s); return m ? m[0].trim().slice(0, 40) : null; },
    fix: (s) => s.replace(AI_RE, ''),
    msg: (d, f) => `${f}: contains an AI citation marker (${d}).`,
  },
  {
    code: 'W_LATEX_DELIMS', severity: 'warning', tier: 'safe',
    test: (s) => {
      if (s.indexOf('\\(') < 0 && s.indexOf('\\[') < 0) return null;
      DELIM_RE.lastIndex = 0;
      return DELIM_RE.test(maskCode(s)) ? 'uses \\( \\) or \\[ \\]' : null;
    },
    fix: (s) => {
      const m = maskCode(s);
      const edits: Edit[] = [];
      DELIM_RE.lastIndex = 0;
      let r: RegExpExecArray | null;
      while ((r = DELIM_RE.exec(m)) !== null) {
        const inner = s.slice(r.index + 2, r.index + r[0].length - 2);
        edits.push({ start: r.index, end: r.index + r[0].length, text: r[1] !== undefined ? '$' + inner + '$' : '$$' + inner + '$$' });
      }
      return applyEdits(s, edits);
    },
    msg: (_d, f) => `${f}: math is written with \\( … \\) or \\[ … \\], which the app does not render. Use $ … $ and $$ … $$.`,
  },
  {
    code: 'W_MISSING_BACKSLASH', severity: 'warning', tier: 'guess',
    test: (s) => {
      const h = findMissingBackslash(s);
      if (h.length === 0) return null;
      const uniq: string[] = [];
      for (const x of h) if (uniq.indexOf(x.word) < 0) uniq.push(x.word);
      return uniq.slice(0, 4).map((w) => `${w} → \\${w}`).join(', ');
    },
    fix: (s) => applyEdits(s, findMissingBackslash(s).map((h) => ({ start: h.pos, end: h.pos, text: '\\' }))),
    msg: (d, f) => `${f}: a LaTeX command is missing its backslash inside math (${d}), so it shows as plain letters.`,
  },
  {
    code: 'W_OVER_ESCAPED', severity: 'warning', tier: 'guess',
    test: (s) => {
      if (s.indexOf('\\\\') < 0) return null;
      const m = maskCode(s);
      const spans = mathSpans(m);
      OVER_RE.lastIndex = 0;
      let r: RegExpExecArray | null;
      while ((r = OVER_RE.exec(m)) !== null) if (inAnyMath(spans, r.index, m.length)) return m.slice(r.index, r.index + 12).trim();
      return null;
    },
    fix: (s) => {
      const m = maskCode(s);
      const spans = mathSpans(m);
      const edits: Edit[] = [];
      OVER_RE.lastIndex = 0;
      let r: RegExpExecArray | null;
      while ((r = OVER_RE.exec(m)) !== null) if (inAnyMath(spans, r.index, m.length)) edits.push({ start: r.index, end: r.index + 2, text: '\\' });
      return applyEdits(s, edits);
    },
    msg: (d, f) => `${f}: a LaTeX command has a doubled backslash inside math (${d}…) and will not render.`,
  },
  {
    code: 'W_CURRENCY_MATH', severity: 'warning', tier: 'guess',
    test: (s) => { const c = findCurrency(s); return c.length ? c[0].text.replace(/\n/g, ' ') : null; },
    fix: (s) => {
      let cur = s;
      let changed = false;
      for (let pass = 0; pass < 4; pass++) {
        const c = findCurrency(cur);
        if (c.length === 0) break;
        const edits: Edit[] = [];
        for (const x of c) { edits.push({ start: x.open, end: x.open, text: '\\' }); edits.push({ start: x.close, end: x.close, text: '\\' }); }
        cur = applyEdits(cur, edits);
        changed = true;
      }
      if (changed) {
        // a field that talks about money: also escape leftover unpaired "$5" signs so the whole text is consistent
        const m = maskCode(cur);
        const lone: Edit[] = [];
        for (const sp of mathSpans(m)) if (sp.end < 0 && !sp.display && /^[ \t]?\d/.test(m.slice(sp.start + 1, sp.start + 4))) lone.push({ start: sp.start, end: sp.start, text: '\\' });
        cur = applyEdits(cur, lone);
      }
      return cur;
    },
    msg: (d, f) => `${f}: dollar amounts such as "${d}…" will be read as math and garbled. Write money as \\$5.`,
  },
  {
    code: 'W_BARE_LT', severity: 'warning', tier: 'guess',
    test: (s) => { const h = findBareLt(s); return h.length ? h[0].tag.slice(0, 30) : null; },
    fix: (s) => applyEdits(s, findBareLt(s).map((h) => ({ start: h.pos, end: h.pos, text: '\\' }))),
    msg: (d, f) => `${f}: "${d}" looks like HTML and will disappear when shown. Write "<" as \\< or &lt;.`,
  },
  {
    code: 'W_SVG_STRIPPED', severity: 'warning', tier: 'none',
    test: (s) => { const l = svgStripped(s); return l.length ? l.slice(0, 6).join(', ') + (l.length > 6 ? ` … (+${l.length - 6})` : '') : null; },
    msg: (d, f) => `${f}: the SVG uses parts the renderer removes: ${d}.`,
  },
  {
    code: 'W_HTML_EXECUTE', severity: 'warning', tier: 'none',
    test: (s) => (s.indexOf('html-execute') >= 0 && /(^|\n)\s*(```|~~~)\s*html-execute\b/.test(s) ? 'html-execute' : null),
    msg: (_d, f) => `${f}: contains an html-execute block — HTML/JavaScript that runs inside a sandboxed frame. Review it.`,
  },
  {
    code: 'W_UNCLOSED_FENCE', severity: 'warning', tier: 'none',
    test: (s) => {
      if (s.indexOf('```') < 0) return null;
      const c = s.match(/(^|\n)[ \t]*```/g);
      return c && c.length % 2 === 1 ? 'unclosed' : null;
    },
    msg: (_d, f) => `${f}: a ${'```'} code fence is opened but never closed, so the rest of the text will render as code.`,
  },
  {
    code: 'W_LATEX_OUTSIDE_MATH', severity: 'warning', tier: 'none',
    test: (s) => {
      if (s.indexOf('\\') < 0) return null;
      const m = maskForProse(s);
      const r = LATEX_CMD_RE.exec(m);
      return r ? r[0] : null;
    },
    msg: (d, f) => `${f}: LaTeX command ${d} appears outside $ … $ and will show as raw text (missing or unbalanced $).`,
  },
  {
    code: 'W_LONG_TEXT', severity: 'info', tier: 'none',
    test: (s) => (s.length > 20000 ? `${s.length} characters` : null),
    msg: (d, f) => `${f}: very long text (${d}); it may be slow on low-end devices.`,
  },
];

type Emit = (code: string, severity: Severity, field: string | undefined, message: string, tier: FixTier, apply?: () => void) => boolean;

function applyTextRules(s: string, field: string, emit: Emit): string {
  let cur = s;
  for (const r of RULES) {
    const before = cur;
    const detail = r.test(before);
    if (detail === null) continue;
    const fix = r.fix;
    if (fix) {
      let applied = before;
      const applyFix = (): void => { applied = fix(before); };
      const accepted = emit(r.code, r.severity, field, r.msg(detail, field), r.tier, applyFix);
      if (accepted) cur = applied;
    } else {
      emit(r.code, r.severity, field, r.msg(detail, field), 'none');
    }
  }
  return cur;
}

/** Apply content fixes to one text. `only` restricts which rule codes may change the text. Used by data-repair scripts. */
export function repairText(s: string, applyGuess = false, only?: string[]): { text: string; fixed: string[] } {
  const fixed: string[] = [];
  const emit: Emit = (code, _sev, _field, _msg, tier, apply) => {
    if (apply && (!only || only.indexOf(code) >= 0) && (tier === 'safe' || (tier === 'guess' && applyGuess))) { apply(); fixed.push(code); return true; }
    return false;
  };
  const text = applyTextRules(s, 'text', emit);
  return { text, fixed };
}

/** Detect content problems in one text without changing it. */
export function lintText(s: string, field = 'text'): Array<{ code: string; severity: Severity; message: string; fix: FixTier }> {
  const out: Array<{ code: string; severity: Severity; message: string; fix: FixTier }> = [];
  const emit: Emit = (code, severity, _f, message, tier) => { out.push({ code, severity, message, fix: tier }); return false; };
  applyTextRules(s, field, emit);
  return out;
}

// ───────────────────────────────────────────────────────────── images

export interface ImageRef { src: string; kind: 'markdown' | 'html' }

/** Find image references the way a markdown parser would (titles, parentheses, <img src>), ignoring code. */
export function extractImageRefs(text: string): ImageRef[] {
  const out: ImageRef[] = [];
  if (text.indexOf('![') < 0 && text.toLowerCase().indexOf('<img') < 0) return out;
  const m = maskCode(text);
  let i = 0;
  while ((i = m.indexOf('![', i)) >= 0) {
    let j = i + 2;
    let depth = 1;
    while (j < m.length && depth > 0) {
      const c = m.charAt(j);
      if (c === '\\') { j += 2; continue; }
      if (c === '[') depth++;
      else if (c === ']') depth--;
      j++;
    }
    if (depth !== 0 || m.charAt(j) !== '(') { i += 2; continue; }
    let k = j + 1;
    while (k < m.length && /\s/.test(m.charAt(k))) k++;
    let dest = '';
    if (m.charAt(k) === '<') {
      const e = m.indexOf('>', k);
      if (e < 0) { i += 2; continue; }
      dest = text.slice(k + 1, e);
      k = e + 1;
    } else {
      let pd = 0;
      const st = k;
      while (k < m.length) {
        const c = m.charAt(k);
        if (c === '\\') { k += 2; continue; }
        if (c === '(') pd++;
        else if (c === ')') { if (pd === 0) break; pd--; }
        else if (/\s/.test(c)) break;
        k++;
      }
      dest = text.slice(st, k);
    }
    out.push({ src: dest, kind: 'markdown' });
    i = k;
  }
  const re = /<img\b[^>]*?\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let r: RegExpExecArray | null;
  while ((r = re.exec(m)) !== null) out.push({ src: r[1] !== undefined ? r[1] : r[2] !== undefined ? r[2] : r[3], kind: 'html' });
  return out;
}

// ───────────────────────────────────────────────────────────── question processing

interface Ctx {
  repair: boolean;
  applyGuess: boolean;
  book: Book;
  issues: Issue[];
  clientKeys: Set<string>;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
const normText = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');
const DIFF_CANON: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFF_ALIAS: Record<string, string> = { simple: 'Easy', beginner: 'Easy', basic: 'Easy', low: 'Easy', moderate: 'Medium', intermediate: 'Medium', normal: 'Medium', average: 'Medium', mid: 'Medium', difficult: 'Hard', tough: 'Hard', advanced: 'Hard', high: 'Hard', '1': 'Easy', '2': 'Medium', '3': 'Hard' };

function optionsFromArray(a: unknown[]): Record<string, unknown> | null {
  if (a.length < 1 || a.length > LETTERS.length) return null;
  const out: Record<string, unknown> = {};
  for (let i = 0; i < a.length; i++) {
    const el = a[i];
    if (typeof el === 'string' || typeof el === 'number') out[LETTERS.charAt(i)] = el;
    else if (isObj(el)) {
      const text = el.text ?? el.value ?? el.content ?? el.option ?? el.answer ?? el.label_text;
      const keyRaw = el.key ?? el.id ?? el.letter ?? el.label ?? el.name;
      if (typeof text !== 'string' && typeof text !== 'number') return null;
      const key = typeof keyRaw === 'string' && /^[A-Za-z0-9]{1,3}$/.test(keyRaw.trim()) ? keyRaw.trim() : LETTERS.charAt(i);
      if (hasOwn(out, key)) return null;
      out[key] = text;
    } else return null;
  }
  return out;
}

type How = 'exact' | 'case' | 'decor' | 'text' | 'index' | 'multi' | 'empty' | 'none';

function resolveAnswer(ca: unknown, opts: Record<string, string>): { key: string | null; how: How } {
  const keys = Object.keys(opts);
  let t: string;
  if (Array.isArray(ca)) {
    if (ca.length === 1 && (typeof ca[0] === 'string' || typeof ca[0] === 'number')) t = String(ca[0]);
    else return { key: null, how: ca.length === 0 ? 'empty' : 'multi' };
  } else if (typeof ca === 'string') t = ca;
  else if (typeof ca === 'number') t = String(ca);
  else return { key: null, how: ca === undefined || ca === null ? 'empty' : 'none' };
  t = t.trim();
  if (t === '') return { key: null, how: 'empty' };
  if (hasOwn(opts, t)) return { key: t, how: 'exact' };
  const lt = t.toLowerCase();
  const ci = keys.filter((k) => k.toLowerCase() === lt);
  if (ci.length === 1) return { key: ci[0], how: 'case' };
  const parts = t.split(/\s*(?:,|;|&|\/|\band\b)\s*/i).filter((p) => p !== '');
  if (parts.length >= 2 && parts.every((p) => keys.some((k) => k.toLowerCase() === p.toLowerCase()))) return { key: null, how: 'multi' };
  const s1 = t.replace(/^(?:the\s+)?(?:correct\s+)?(?:option|choice|answer|ans)\s*(?:is|:|-)?\s*/i, '');
  const dm = /^[([]?([A-Za-z0-9]{1,3})(?:[)\].:][\s\S]*)?$/.exec(s1);
  if (dm) {
    const k2 = keys.filter((k) => k.toLowerCase() === dm[1].toLowerCase());
    if (k2.length === 1) return { key: k2[0], how: 'decor' };
  }
  const nt = normText(t);
  const hit = keys.filter((k) => normText(opts[k]) === nt);
  if (hit.length === 1) return { key: hit[0], how: 'text' };
  const stripped = t.replace(/^[([]?[A-Za-z0-9]{1,3}[)\].:]\s*/, '');
  if (stripped !== t) {
    const ns = normText(stripped);
    const hit2 = keys.filter((k) => normText(opts[k]) === ns);
    if (hit2.length === 1) return { key: hit2[0], how: 'text' };
  }
  if (/^\d+$/.test(t)) {
    const num = parseInt(t, 10);
    const idx = num === 0 ? 0 : num - 1;
    if (idx >= 0 && idx < keys.length) return { key: keys[idx], how: 'index' };
  }
  return { key: null, how: 'none' };
}

interface QResult { q: ExamQuestion | null; errors: number; number: number | null }

function processQuestion(item: unknown, index: number, ctx: Ctx): QResult {
  let errors = 0;
  let label: number | string = `(item ${index + 1})`;
  const emit: Emit = (code, severity, field, message, tier, apply) => {
    if (ctx.repair && apply && (tier === 'safe' || (tier === 'guess' && ctx.applyGuess))) {
      apply();
      ctx.book.add(code, -1, tier);
      return true;
    }
    ctx.issues.push({ code, severity, message, index, questionNumber: label, field, fix: tier === 'none' ? undefined : tier });
    if (severity === 'error') errors++;
    return false;
  };

  if (!isObj(item)) {
    emit('E_ITEM_NOT_OBJECT', 'error', undefined, `Item ${index + 1} is ${describe(item)}, not a question object { … }.`, 'none');
    return { q: null, errors, number: null };
  }

  // ── keys ──
  const q: Record<string, unknown> = {};
  const extras: Record<string, unknown> = {};
  const aliasKeys: Array<[string, string]> = [];
  for (const k of Object.keys(item)) {
    if (k.indexOf('_comment') === 0) continue;
    if (ctx.clientKeys.has(k)) { extras[k] = item[k]; continue; }
    if (k === 'id' || k === '_isDirty') {
      emit('W_CLIENT_KEY', 'warning', k, `Field '${k}' is used internally by the app and is ignored in imported exams.`, 'safe', () => undefined);
      continue;
    }
    const c = canonKey(k);
    if (KNOWN_KEYS.has(c)) {
      if (c === k) { if (!hasOwn(q, c)) q[c] = item[k]; } else aliasKeys.push([k, c]);
    } else {
      emit('W_UNKNOWN_KEY', 'warning', k, `Unrecognised field '${k}' (it is ignored).`, 'safe', () => undefined);
    }
  }
  for (const [k, c] of aliasKeys) {
    if (hasOwn(q, c)) continue;
    q[c] = item[k];
    emit('E_ALIAS_KEY', 'error', k, `Field '${k}' should be named '${c}'.`, 'safe', () => undefined);
  }

  // ── question_number ──
  let number: number | null = null;
  const qn = q.question_number;
  if (typeof qn === 'number' && Number.isInteger(qn) && qn > 0) number = qn;
  else if (typeof qn === 'string' && /^\s*\d+\s*$/.test(qn) && Number(qn) > 0) {
    number = Number(qn);
    emit('E_QNUM_TYPE', 'error', 'question_number', `'question_number' is written as text ("${qn}"); it must be a number.`, 'safe', () => undefined);
  } else {
    emit('E_QNUM_INVALID', 'error', 'question_number', "'question_number' must be a positive whole number.", 'safe', () => { number = index + 1; });
  }
  if (number !== null) label = number;

  // ── question_text ──
  let text: string | null = null;
  const qt = q.question_text;
  if (typeof qt === 'string') text = qt;
  else if (Array.isArray(qt) && qt.length > 0 && qt.every((x) => typeof x === 'string')) {
    text = (qt as string[]).join('\n');
    emit('E_TEXT_TYPE', 'error', 'question_text', "'question_text' is a list of lines; it must be one text value.", 'safe', () => undefined);
  } else if (typeof qt === 'number') {
    text = String(qt);
    emit('E_TEXT_TYPE', 'error', 'question_text', "'question_text' is a number; it must be text.", 'guess', () => undefined);
  }
  if (text === null || text.trim() === '') {
    emit('E_NO_TEXT', 'error', 'question_text', qt === undefined ? "'question_text' is missing." : "'question_text' must be a non-empty text.", 'none');
    text = null;
  }

  // ── options ──
  let rawOpts: Record<string, unknown> | null = null;
  const ro = q.options;
  if (Array.isArray(ro)) {
    const conv = optionsFromArray(ro);
    if (conv) {
      rawOpts = conv;
      emit('E_OPTIONS_ARRAY', 'error', 'options', "'options' is a list; it must be an object like {\"a\": \"…\", \"b\": \"…\"}.", 'safe', () => undefined);
    } else emit('E_OPTIONS_TYPE', 'error', 'options', "'options' must be an object like {\"a\": \"…\", \"b\": \"…\"}.", 'none');
  } else if (isObj(ro)) rawOpts = ro;
  else if (ro === undefined) emit('E_NO_OPTIONS', 'error', 'options', "'options' is missing.", 'none');
  else emit('E_OPTIONS_TYPE', 'error', 'options', "'options' must be an object like {\"a\": \"…\", \"b\": \"…\"}.", 'none');

  let opts: Record<string, string> | null = null;
  if (rawOpts) {
    let out: Record<string, string> = {};
    const keys0 = Object.keys(rawOpts);
    if (keys0.length < 2) emit('E_OPTIONS_MIN', 'error', 'options', "'options' needs at least two choices.", 'none');
    for (const k0 of keys0) {
      let k = k0;
      const v = rawOpts[k0];
      if (k0.trim() === '') { emit('E_OPTION_KEY_EMPTY', 'error', 'options', 'Option keys cannot be empty.', 'none'); continue; }
      if (k0 !== k0.trim()) emit('E_OPTION_KEY_SPACE', 'warning', `options.${k0}`, `Option key '${k0}' has spaces around it.`, 'safe', () => { k = k0.trim(); });
      let val: string;
      if (typeof v === 'string') val = v;
      else if (typeof v === 'number' || typeof v === 'boolean') {
        val = String(v);
        emit('E_OPTION_TYPE', 'error', `options.${k0}`, `Option '${k0}' must be text (it is ${describe(v)}).`, 'safe', () => undefined);
      } else { emit('E_OPTION_TYPE', 'error', `options.${k0}`, `Option '${k0}' must be non-empty text.`, 'none'); continue; }
      if (val.trim() === '') emit('E_OPTION_EMPTY', 'error', `options.${k0}`, `Option '${k0}' must be non-empty text.`, 'none');
      out[k] = val;
    }
    let ok = Object.keys(out);
    // canonical form: lowercase single-letter keys (repair only, not a problem in itself)
    if (ctx.repair && ok.length > 0 && ok.every((k) => /^[A-Z]$/.test(k)) && !ok.some((k) => hasOwn(out, k.toLowerCase()))) {
      const lower: Record<string, string> = {};
      for (const k of ok) lower[k.toLowerCase()] = out[k];
      out = lower;
      ok = Object.keys(out);
      ctx.book.add('O_LOWERCASE_KEYS', -1, 'safe');
    }
    if (new Set(ok.map((k) => k.toLowerCase())).size !== ok.length) emit('W_OPTION_KEY_CASE', 'warning', 'options', 'Two option keys differ only by upper/lower case, which makes the answer ambiguous.', 'none');
    if (ok.length >= 2) {
      const res = ok.filter((k) => /^[A-Za-z]$/.test(k)).map((k) => ({ k, re: new RegExp('^\\s*[(\\[]?' + k + '[)\\].:]\\s+', 'i') }));
      if (res.length === ok.length && res.every((r) => r.re.test(out[r.k]))) {
        const sample = out[ok[0]].slice(0, 14);
        emit('W_OPTION_PREFIX', 'warning', 'options', `Option texts start with their own letter (e.g. "${sample}…"); the app already shows the letter.`, 'guess', () => {
          for (const r of res) out[r.k] = out[r.k].replace(r.re, '');
        });
      }
      const seen = new Map<string, string>();
      const seenRaw = new Map<string, string>();
      for (const k of ok) {
        const raw = out[k].trim().replace(/\s+/g, ' ');
        const nt = raw.toLowerCase();
        const prev = seen.get(nt);
        if (nt !== '' && prev !== undefined) {
          const prevRaw = seenRaw.get(prev) || '';
          // If the strings are not strictly identical, check if case distinction is semantic
          // (e.g. genetics alleles like "c/c R/R" vs "C/c r/r", "Aa" vs "aa", chemical symbols, or math variables)
          const isCaseSensitive = prevRaw !== raw && (
            /[A-Za-z]\/[A-Za-z]/.test(raw) || // Allele fractions/pairs like C/c, c/c
            /\b[A-Z][a-z]\b/.test(raw) ||     // Heterozygous alleles like Aa, Bb
            /[$^_{}\\]/.test(raw) ||          // Math / LaTeX notation
            raw.split(/\s+/).every((w) => w.length <= 4) // Short symbol tokens (e.g. CO vs Co, pH, x vs X)
          );
          if (!isCaseSensitive) {
            emit('W_DUP_OPTION', 'warning', 'options', `Options '${prev}' and '${k}' have identical text.`, 'none');
            break;
          }
        }
        seen.set(nt, k);
        seenRaw.set(k, raw);
      }
    }
    opts = out;
  }

  // ── correct_answer ──
  let answer: string | null = null;
  const ca = q.correct_answer;
  if (opts) {
    const r = resolveAnswer(ca, opts);
    const shown = typeof ca === 'string' || typeof ca === 'number' ? String(ca) : JSON.stringify(ca);
    switch (r.how) {
      case 'exact': case 'case': answer = r.key; break;
      case 'decor':
        answer = r.key;
        emit('E_ANSWER_FORMAT', 'error', 'correct_answer', `'correct_answer' is "${shown}"; it must be exactly the option key "${r.key}".`, 'safe', () => undefined);
        break;
      case 'text': case 'index':
        answer = r.key;
        emit('E_ANSWER_FORMAT', 'error', 'correct_answer', `'correct_answer' is "${shown}"; it must be the option key (probably "${r.key}").`, 'guess', () => undefined);
        break;
      case 'multi': emit('E_ANSWER_MULTI', 'error', 'correct_answer', `'correct_answer' ("${shown}") lists several answers; exactly one option key is allowed.`, 'none'); break;
      case 'empty': emit('E_NO_ANSWER', 'error', 'correct_answer', ca === undefined ? "'correct_answer' is missing." : "'correct_answer' must be a non-empty text.", 'none'); break;
      default: emit('E_ANSWER_NO_MATCH', 'error', 'correct_answer', `'correct_answer' ("${shown}") must match an option key. Available: ${Object.keys(opts).join(', ')}.`, 'none');
    }
  } else if (ca === undefined || ca === null || (typeof ca === 'string' && ca.trim() === '')) {
    emit('E_NO_ANSWER', 'error', 'correct_answer', ca === undefined ? "'correct_answer' is missing." : "'correct_answer' must be a non-empty text.", 'none');
  }

  // ── optional fields ──
  const res: Record<string, unknown> = {};
  if (number !== null) res.question_number = number;
  if (text !== null) res.question_text = text;
  if (opts) res.options = opts;
  if (answer !== null) res.correct_answer = answer;

  for (const f of ['subject', 'topic'] as const) {
    if (!hasOwn(q, f)) continue;
    const v = q[f];
    if (v === null) res[f] = null;
    else if (typeof v === 'string') {
      res[f] = v;
      if (v.trim() === '') emit('W_EMPTY_FIELD', 'warning', f, `'${f}' is an empty text; use null or leave it out.`, 'safe', () => { res[f] = null; });
    } else if (typeof v === 'number') {
      res[f] = v;
      emit('W_FIELD_TYPE', 'warning', f, `'${f}' must be text, not a number.`, 'safe', () => { res[f] = String(v); });
    } else emit('W_FIELD_TYPE', 'warning', f, `'${f}' must be text or null.`, 'guess', () => undefined);
  }
  if (hasOwn(q, 'difficulty')) {
    const v = q.difficulty;
    if (v === null || v === '') res.difficulty = v;
    else {
      const t = typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
      const lt = t.toLowerCase();
      if (hasOwn(DIFF_CANON, lt)) {
        const canon = DIFF_CANON[lt];
        res.difficulty = typeof v === 'string' ? v : canon;
        if (v !== canon) emit('W_DIFFICULTY', 'warning', 'difficulty', `'difficulty' is "${String(v)}"; it must be exactly "${canon}".`, 'safe', () => { res.difficulty = canon; });
      } else if (t !== '' && hasOwn(DIFF_ALIAS, lt)) {
        const canon = DIFF_ALIAS[lt];
        res.difficulty = v;
        emit('W_DIFFICULTY', 'warning', 'difficulty', `'difficulty' is "${String(v)}"; it must be Easy, Medium or Hard (probably "${canon}").`, 'guess', () => { res.difficulty = canon; });
      } else {
        res.difficulty = v;
        emit('W_DIFFICULTY', 'warning', 'difficulty', `'difficulty' is "${String(v)}"; it must be Easy, Medium, Hard or empty.`, 'guess', () => { res.difficulty = null; });
      }
    }
  }
  if (hasOwn(q, 'explanation')) {
    const v = q.explanation;
    if (v === null || typeof v === 'string') res.explanation = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
      res.explanation = (v as string[]).join('\n');
      emit('W_FIELD_TYPE', 'warning', 'explanation', "'explanation' is a list of lines; it must be one text value.", 'safe', () => undefined);
    } else if (typeof v === 'number') {
      res.explanation = String(v);
      emit('W_FIELD_TYPE', 'warning', 'explanation', "'explanation' must be text.", 'guess', () => undefined);
    } else emit('W_FIELD_TYPE', 'warning', 'explanation', "'explanation' must be text or null.", 'guess', () => undefined);
  }
  if (hasOwn(q, 'section_id')) {
    const v = q.section_id;
    if (v === null) res.section_id = null;
    else if (typeof v === 'string') {
      res.section_id = v;
      if (v.trim() === '') emit('W_EMPTY_FIELD', 'warning', 'section_id', "'section_id' is an empty text; use null or leave it out.", 'safe', () => { res.section_id = null; });
    } else emit('W_FIELD_TYPE', 'warning', 'section_id', "'section_id' must be text or null.", 'guess', () => undefined);
  }
  if (hasOwn(q, 'images')) {
    const v = q.images;
    if (v === null || (Array.isArray(v) && v.every((x) => typeof x === 'string'))) res.images = v;
    else emit('W_IMAGES_TYPE', 'warning', 'images', "'images' must be a list of texts.", 'safe', () => undefined);
  }

  // ── content rules on every text field ──
  if (typeof res.question_text === 'string') res.question_text = applyTextRules(res.question_text, 'question_text', emit);
  if (typeof res.explanation === 'string') res.explanation = applyTextRules(res.explanation, 'explanation', emit);
  if (opts) {
    const o2: Record<string, string> = {};
    for (const k of Object.keys(opts)) o2[k] = applyTextRules(opts[k], `option '${k}'`, emit);
    res.options = o2;
  }
  for (const k of Object.keys(extras)) res[k] = extras[k];

  const complete = typeof res.question_text === 'string' && !!opts && answer !== null && number !== null;
  return { q: complete ? (res as ExamQuestion) : null, errors, number };
}

// ───────────────────────────────────────────────────────────── exam level

function summarise(qs: ExamQuestion[]): ExamSummary {
  const subj = new Map<string, string>();
  const top = new Map<string, string>();
  for (const q of qs) {
    if (typeof q.subject === 'string' && q.subject.trim()) { const k = normText(q.subject); if (!subj.has(k)) subj.set(k, q.subject.trim().replace(/\s+/g, ' ')); }
    if (typeof q.topic === 'string' && q.topic.trim()) { const k = normText(q.topic); if (!top.has(k)) top.set(k, q.topic.trim().replace(/\s+/g, ' ')); }
  }
  return { count: qs.length, subjects: Array.from(subj.values()), topics: Array.from(top.values()) };
}

const emptySummary: ExamSummary = { count: 0, subjects: [], topics: [] };

function resolveOpts(o: ProcessOptions): { repair: boolean; applyGuess: boolean; clientKeys: Set<string>; maxQuestions: number; maxBytes: number; budget: number } {
  return {
    repair: o.mode === 'repair',
    applyGuess: !!o.applyGuess,
    clientKeys: new Set(o.clientKeys ?? []),
    maxQuestions: o.maxQuestions ?? 5000,
    maxBytes: o.maxBytes ?? 8 * 1024 * 1024,
    budget: o.timeBudgetMs ?? 4000,
  };
}

function analyze(items: unknown[], ro: ReturnType<typeof resolveOpts>, book: Book, issues: Issue[]): { questions: ExamQuestion[]; skipped: SkippedItem[]; aligned: unknown[] } {
  const ctx: Ctx = { repair: ro.repair, applyGuess: ro.applyGuess, book, issues, clientKeys: ro.clientKeys };
  const questions: ExamQuestion[] = [];
  const skipped: SkippedItem[] = [];
  const aligned: unknown[] = [];
  const numbers: Array<number | null> = [];

  for (let i = 0; i < items.length; i++) {
    const before = issues.length;
    const r = processQuestion(items[i], i, ctx);
    numbers.push(r.number);
    if (ro.repair) {
      if (r.q && r.errors === 0) { questions.push(r.q); aligned.push(r.q); }
      else {
        aligned.push(items[i]);
        let reason = 'could not be repaired';
        for (let j = before; j < issues.length; j++) if (issues[j].severity === 'error') { reason = issues[j].message; break; }
        skipped.push({ index: i, reason });
      }
    }
  }

  // numbering
  if (!ro.repair) {
    const N = items.length;
    const seen = new Map<number, number>();
    for (const n of numbers) if (n !== null) seen.set(n, (seen.get(n) ?? 0) + 1);
    const dups: number[] = [];
    seen.forEach((c, n) => { if (c > 1) dups.push(n); });
    if (dups.length > 0) issues.push({ code: 'E_QNUM_DUP', severity: 'error', message: `Duplicate question numbers: ${dups.slice(0, 12).join(', ')}${dups.length > 12 ? ' …' : ''}. Each number must be used once.`, field: 'question_number' });
    const allValid = numbers.every((n) => n !== null);
    if (allValid && N > 0) {
      let seq = true;
      const sorted = (numbers as number[]).slice().sort((a, b) => a - b);
      for (let i = 0; i < sorted.length; i++) if (sorted[i] !== i + 1) { seq = false; break; }
      if (!seq && dups.length === 0) issues.push({ code: 'E_QNUM_SEQ', severity: 'error', message: `Question numbers must run 1, 2, 3 … ${N} with no gaps (found ${sorted[0]} … ${sorted[sorted.length - 1]}).`, field: 'question_number', fix: 'safe' });
      else if (!seq) issues.push({ code: 'E_QNUM_SEQ', severity: 'error', message: `Question numbers must run 1, 2, 3 … ${N} with no gaps.`, field: 'question_number', fix: 'safe' });
    }
    // duplicate questions (report only)
    const seenQ = new Map<string, number>();
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!isObj(it) || typeof it.question_text !== 'string' || !isObj(it.options)) continue;
      const key = normText(it.question_text) + '|' + JSON.stringify(it.options);
      const prev = seenQ.get(key);
      if (prev !== undefined) issues.push({ code: 'W_DUP_QUESTION', severity: 'warning', message: `Question ${i + 1} is an exact duplicate of question ${prev + 1}.`, index: i, questionNumber: numbers[i] ?? `(item ${i + 1})`, fix: 'guess' });
      else seenQ.set(key, i);
    }
  } else {
    let sequential = true;
    const sorted = questions.map((q) => q.question_number).sort((a, b) => a - b);
    for (let i = 0; i < sorted.length; i++) if (sorted[i] !== i + 1) { sequential = false; break; }
    if (!sequential) {
      questions.forEach((q, i) => { q.question_number = i + 1; });
      book.add('E_QNUM_SEQ', -1, 'safe');
    }
    if (ro.applyGuess) {
      const seenQ = new Set<string>();
      const kept: ExamQuestion[] = [];
      for (const q of questions) {
        const key = normText(q.question_text) + '|' + JSON.stringify(q.options);
        if (seenQ.has(key)) { book.add('W_DUP_QUESTION', -1, 'guess'); continue; }
        seenQ.add(key);
        kept.push(q);
      }
      if (kept.length !== questions.length) { questions.length = 0; kept.forEach((q, i) => { q.question_number = i + 1; questions.push(q); }); }
    }
  }
  return { questions, skipped, aligned: skipped.length === 0 ? questions : aligned };
}

function fixNotes(book: Book, skip?: (code: string) => boolean): FixNote[] {
  const out: FixNote[] = [];
  book.m.forEach((v, code) => {
    if (skip && skip(code)) return;
    const msg = CATALOG[code]?.fixed ?? code;
    if (code === 'O_LOWERCASE_KEYS') { out.push({ code, message: 'Converted option keys to lowercase (a, b, c, d)', count: v.count, tier: 'safe' }); return; }
    if (!msg) return;
    out.push({ code, message: msg, count: v.count, tier: v.tier === 'guess' ? 'guess' : 'safe' });
  });
  return out;
}

const SUGGEST: Record<string, string> = {
  EXPECTED_VALUE: 'A value is missing or there is stray text here. Look for a missing quote, an unexpected word, or text outside the question list.',
  EXPECTED_KEY: 'A field name (like "question_text") is expected here. Look for an extra or missing quote or brace.',
  EXPECTED_COLON: 'A colon (:) is missing after a field name.',
  EXPECTED_COMMA: 'A comma is missing between items, or a bracket is not closed.',
  TOO_DEEP: 'This is nested far too deeply to be an exam list.',
  NO_START: 'I could not find a list of questions. The exam must be a list that starts with [ and contains question objects { … }.',
};

function baseReport(t0: number, source: 'native' | 'repaired'): ExamReport {
  return {
    ok: false, fatal: null, items: [], questions: [], repairedItems: [], skipped: [], issues: [], groups: [], fixes: [], summary: emptySummary,
    info: { source, arrays: 0, truncated: false, ms: now() - t0 },
  };
}

function fatalReport(t0: number, raw: string, code: string, message: string, offset?: number, kind?: string): ExamReport {
  const r = baseReport(t0, 'repaired');
  const issue: Issue = { code, severity: 'error', message };
  if (offset !== undefined) {
    const lc = lineCol(raw, offset);
    issue.offset = offset;
    issue.line = lc.line;
    issue.column = lc.column;
    issue.message = `${message} (line ${lc.line}, column ${lc.column})`;
  }
  if (kind && SUGGEST[kind]) issue.suggestion = SUGGEST[kind];
  r.fatal = issue;
  r.issues = [issue];
  r.groups = groupIssues(r.issues);
  r.info.ms = now() - t0;
  return r;
}

/** Read, check (and optionally repair) an exam from pasted / file text. */
export function processExamText(raw: string, opts: ProcessOptions = {}): ExamReport {
  const t0 = now();
  const ro = resolveOpts(opts);
  const text = typeof raw === 'string' ? raw : String(raw ?? '');
  if (text.trim() === '') return fatalReport(t0, text, 'E_EMPTY', 'Nothing to check — the text is empty. Paste the exam JSON, which should start with [');
  if (text.length > ro.maxBytes) return fatalReport(t0, text, 'E_TOO_BIG', `The text is ${(text.length / 1048576).toFixed(1)} MB; the limit is ${(ro.maxBytes / 1048576).toFixed(0)} MB.`);

  const book = new Book();
  const syntaxBook = book;
  let items: unknown[] | null = null;
  let source: 'native' | 'repaired' = 'native';
  let arrays = 1;
  let truncated = false;
  let skippedParse: SkipRec[] = [];
  let failInfo: Extracted['fail'] = null;

  let parsed: unknown;
  let fast = false;
  try { parsed = JSON.parse(text); fast = true; } catch { fast = false; }
  if (fast && typeof parsed !== 'string') {
    items = shapeToItems(parsed, syntaxBook);
    if (items === null) return fatalReport(t0, text, 'E_NO_QUESTIONS', 'The JSON is valid but I could not find a list of questions in it. The exam must be a list that starts with [');
    if (syntaxBook.m.size > 0) source = 'repaired';
  } else {
    source = 'repaired';
    const ex = extractSlow(fast ? (parsed as string) : text, syntaxBook, now() + ro.budget);
    if (fast) syntaxBook.add('S_DOUBLE_ENCODED', 0);
    items = ex.items;
    arrays = ex.arrays;
    truncated = ex.truncated;
    skippedParse = ex.skipped;
    failInfo = ex.fail;
    if (items === null) {
      if (failInfo) return fatalReport(t0, text, 'E_SYNTAX', failInfo.message, failInfo.pos, failInfo.kind);
      return fatalReport(t0, text, 'E_SYNTAX', 'No exam found in the text', undefined, 'NO_START');
    }
  }
  if (items.length > ro.maxQuestions) return fatalReport(t0, text, 'E_TOO_MANY', `${items.length} questions found; the limit is ${ro.maxQuestions}.`);
  if (items.length === 0 && skippedParse.length === 0) return fatalReport(t0, text, 'E_NO_QUESTIONS', 'The list is empty — it contains no questions.');

  const issues: Issue[] = [];
  const contentBook = new Book();
  const { questions, skipped, aligned } = analyze(items, ro, contentBook, issues);

  // syntax-level findings
  const syntaxCodes = new Set<string>();
  syntaxBook.m.forEach((v, code) => {
    syntaxCodes.add(code);
    if (!ro.repair) {
      const lc = v.first >= 0 && source === 'repaired' && !fast ? lineCol(text, v.first) : undefined;
      let message = CATALOG[code]?.title ?? code;
      if (code === 'S_MULTI_ARRAY') message = `The paste contains ${arrays} separate question lists; they must be one list.`;
      else if (v.count > 1) message += ` (${v.count} places)`;
      issues.unshift({ code, severity: 'error', message, line: lc?.line, column: lc?.column, offset: v.first >= 0 ? v.first : undefined, fix: v.tier });
    }
  });
  for (const sk of skippedParse) {
    const lc = lineCol(text, sk.offset);
    const message = `A question near line ${lc.line}, column ${lc.column} could not be read and was skipped: ${sk.message}.`;
    issues.push({ code: 'E_UNREADABLE_ITEM', severity: 'error', message, line: lc.line, column: lc.column, offset: sk.offset });
    skipped.push({ line: lc.line, reason: message });
  }
  if (truncated) issues.push({ code: 'S_TRUNCATED', severity: 'warning', message: 'The text looks cut off — the end of the exam may be missing. Ask the AI to continue and paste the rest.' });

  const merged = new Book();
  merged.merge(syntaxBook);
  merged.merge(contentBook);
  const fixes = ro.repair ? fixNotes(merged) : [];
  const hasError = issues.some((x) => x.severity === 'error');
  const r = baseReport(t0, source);
  r.items = items;
  r.questions = questions;
  r.repairedItems = ro.repair ? aligned : [];
  r.skipped = skipped;
  r.issues = issues;
  r.groups = groupIssues(issues);
  r.fixes = fixes;
  r.summary = ro.repair ? summarise(questions) : { ...summarise(items.filter(isObj).map((x) => ({ subject: x.subject, topic: x.topic })) as unknown as ExamQuestion[]), count: items.length };
  r.ok = !hasError && (ro.repair ? questions.length > 0 : items.length > 0);
  r.info = { source, arrays, truncated, ms: now() - t0 };
  return r;
}

/** Check / repair already-parsed items (editor store, QuestionsData). */
export function processExamItems(items: unknown[], opts: ProcessOptions = {}): ExamReport {
  const t0 = now();
  const ro = resolveOpts(opts);
  const issues: Issue[] = [];
  const book = new Book();
  const { questions, skipped, aligned } = analyze(items, ro, book, issues);
  const r = baseReport(t0, 'native');
  r.items = items;
  r.questions = questions;
  r.repairedItems = ro.repair ? aligned : [];
  r.skipped = skipped;
  r.issues = issues;
  r.groups = groupIssues(issues);
  r.fixes = ro.repair ? fixNotes(book) : [];
  r.summary = ro.repair ? summarise(questions) : { count: items.length, subjects: [], topics: [] };
  r.ok = !issues.some((x) => x.severity === 'error') && items.length > 0;
  r.info.arrays = 1;
  r.info.ms = now() - t0;
  return r;
}

// ───────────────────────────────────────────────────────────── reporting helpers

const SEV_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Group issues so one root cause across 5,000 questions is ONE row. */
export function groupIssues(issues: Issue[]): IssueGroup[] {
  const map = new Map<string, IssueGroup>();
  const order: IssueGroup[] = [];
  const seenQ = new Map<IssueGroup, Set<string>>();
  for (const it of issues) {
    const fam = it.field ? it.field.replace(/^(options|option)[ .'].*$/, 'options') : '';
    const key = it.code + '|' + fam;
    let g = map.get(key);
    if (!g) {
      g = { code: it.code, severity: it.severity, title: CATALOG[it.code]?.title ?? it.code, field: it.field ? fam : undefined, count: 0, questions: [], example: it.message, line: it.line, fix: it.fix };
      map.set(key, g);
      order.push(g);
    }
    g.count++;
    if (it.questionNumber !== undefined && g.questions.length < 200) {
      let seen = seenQ.get(g);
      if (!seen) { seen = new Set<string>(); seenQ.set(g, seen); }
      const k = String(it.questionNumber);
      if (!seen.has(k)) { seen.add(k); g.questions.push(it.questionNumber); }
    }
  }
  return order.map((g, i) => ({ g, i })).sort((a, b) => SEV_ORDER[a.g.severity] - SEV_ORDER[b.g.severity] || a.i - b.i).map((x) => x.g);
}

export function describeWhere(g: IssueGroup): string {
  if (g.questions.length === 0) return g.line !== undefined ? `Line ${g.line}: ` : '';
  const shown = g.questions.slice(0, 6).map((q) => (typeof q === 'number' ? `Q#${q}` : q));
  const more = g.count - shown.length;
  return `${shown.join(', ')}${more > 0 ? ` (+${more} more)` : ''}: `;
}

const FORMAT_RULES =
  'Format rules: return ONE JSON array of question objects. Each question needs "question_number" (1, 2, 3 …), "question_text", ' +
  '"options" (an object with lowercase keys "a", "b", "c", "d" and non-empty text) and "correct_answer" (exactly one option key). ' +
  'Optional: "subject", "topic", "explanation", "difficulty" ("Easy", "Medium" or "Hard"). ' +
  'Write math between $ … $ and write every LaTeX backslash twice inside JSON strings (for example "$\\\\frac{1}{2}$"). ' +
  'Write a literal dollar sign as \\\\$ and a literal "<" as &lt;. Do not add comments, code fences or any text outside the JSON.';

/** A ready-to-paste prompt a non-technical user can give to their AI. */
export function buildLlmPrompt(report: ExamReport, rawText?: string): string {
  const lines: string[] = [];
  lines.push('My exam JSON failed to import. Fix ONLY the problems listed below and return the complete corrected JSON array — no explanations and no markdown code fences.');
  lines.push('');
  const errs = report.groups.filter((g) => g.severity === 'error');
  const list = (errs.length ? errs : report.groups).slice(0, 15);
  list.forEach((g, i) => {
    const where = describeWhere(g);
    lines.push(`${i + 1}. ${where}${g.example}`);
  });
  if (report.groups.length > list.length) lines.push(`… and ${report.groups.length - list.length} more kinds of problem.`);
  if (report.fatal && rawText !== undefined && report.fatal.offset !== undefined) {
    lines.push('');
    lines.push('Where the problem starts:');
    lines.push(snippetAt(rawText, report.fatal.offset));
  }
  lines.push('');
  lines.push(FORMAT_RULES);
  return lines.join('\n');
}

/** Character offset of every element of the question list in valid JSON text (for click-to-jump). */
export function locateQuestions(raw: string): number[] {
  const offsets: number[] = [];
  const n = raw.length;
  let depth = 0;
  let arrDepth = -1;
  let expect = false;
  let i = 0;
  while (i < n) {
    const c = raw.charCodeAt(i);
    if (c === 34) {
      if (arrDepth >= 0 && depth === arrDepth && expect) { offsets.push(i); expect = false; }
      i++;
      while (i < n) { const d = raw.charCodeAt(i); if (d === 92) { i += 2; continue; } if (d === 34) break; i++; }
      i++;
      continue;
    }
    if (c === 91 || c === 123) {
      if (arrDepth >= 0 && depth === arrDepth && expect) { offsets.push(i); expect = false; }
      depth++;
      if (c === 91 && arrDepth < 0) { arrDepth = depth; expect = true; }
    } else if (c === 93 || c === 125) {
      depth--;
      if (arrDepth >= 0 && depth < arrDepth) break;
    } else if (c === 44) {
      if (arrDepth >= 0 && depth === arrDepth) expect = true;
    } else if (arrDepth >= 0 && depth === arrDepth && expect && c !== 32 && c !== 10 && c !== 13 && c !== 9) {
      offsets.push(i);
      expect = false;
    }
    i++;
  }
  return offsets;
}