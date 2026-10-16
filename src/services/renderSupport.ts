/**
 * renderSupport.ts — SINGLE SOURCE OF TRUTH for the exam renderer's rules.
 * Pure data + three tiny pure helpers, no imports.  Used by:
 *   - MarkdownRenderer.tsx  (builds its rehype-sanitize schema from this)
 *   - examCore.ts           (lints content against exactly what the renderer will keep)
 *
 * Attribute names are HAST *property* names (what rehype-sanitize compares), not HTML names:
 *   stroke-dasharray -> strokeDashArray, stroke-linecap -> strokeLineCap, marker-end -> markerEnd ...
 * (The old schema used strokeDasharray / strokeLinecap / strokeLinejoin, which never matched anything.)
 */

/** Snapshot of rehype-sanitize defaultSchema.tagNames (v6). Only used for linting; the renderer still spreads the live defaultSchema. */
export const BASE_TAGS: string[] = [
  'a', 'b', 'blockquote', 'br', 'code', 'dd', 'del', 'details', 'div', 'dl', 'dt', 'em', 'h1', 'h2', 'h3',
  'h4', 'h5', 'h6', 'hr', 'i', 'img', 'input', 'ins', 'kbd', 'li', 'ol', 'p', 'picture', 'pre', 'q', 'rp',
  'rt', 'ruby', 's', 'samp', 'section', 'source', 'span', 'strike', 'strong', 'sub', 'summary', 'sup', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'tt', 'ul', 'var'
];

/** Snapshot of rehype-sanitize defaultSchema.attributes['*']. */
export const BASE_GLOBAL_ATTRS: string[] = [
  'abbr', 'accept', 'acceptCharset', 'accessKey', 'action', 'align', 'alt', 'axis', 'border', 'cellPadding',
  'cellSpacing', 'char', 'charOff', 'charSet', 'checked', 'clear', 'colSpan', 'color', 'cols', 'compact',
  'coords', 'dateTime', 'dir', 'encType', 'frame', 'hSpace', 'headers', 'height', 'hrefLang', 'htmlFor',
  'id', 'isMap', 'itemProp', 'label', 'lang', 'maxLength', 'media', 'method', 'multiple', 'name', 'noHref',
  'noShade', 'noWrap', 'open', 'prompt', 'readOnly', 'rev', 'rowSpan', 'rows', 'rules', 'scope', 'selected',
  'shape', 'size', 'span', 'start', 'summary', 'tabIndex', 'title', 'useMap', 'vAlign', 'value', 'width'
];

/** Extra tags the renderer allows on top of the default schema. */
export const EXTRA_TAGS: string[] = [
  // SVG
  'svg', 'path', 'g', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'text', 'tspan', 'defs', 'use', 'marker',
  // tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // MathML (KaTeX output)
  'math', 'semantics', 'mrow', 'msub', 'msup', 'msubsup', 'mover', 'munder', 'munderover', 'mfrac', 'msqrt', 'mroot', 'mi', 'mn', 'mo',
  'mtext', 'mspace', 'ms', 'maligngroup', 'malignmark', 'mpadded', 'mphantom', 'menclose', 'mstyle', 'annotation', 'annotation-xml',
  // layout / semantic
  'span', 'div', 'dfn', 'abbr', 'time', 'cite', 'mark', 'aside',
];

export const GLOBAL_ATTRS_EXTRA: string[] = ['className', 'aria-hidden'];

const SVG_PAINT = ['fill', 'stroke', 'strokeWidth', 'strokeDashArray', 'strokeDashOffset', 'strokeLineCap', 'strokeLineJoin', 'opacity', 'fillOpacity', 'strokeOpacity'];
const SVG_MARKERS = ['markerStart', 'markerMid', 'markerEnd'];

/** Per-tag attribute lists. A tag listed here REPLACES the default list for that tag (global attrs still apply). */
export const TAG_ATTRS: Record<string, string[]> = {
  span: ['className', 'style', 'aria-hidden'], // style only on span: KaTeX needs it
  math: ['xmlns', 'display', 'style'],
  div: ['className', 'aria-hidden'],
  svg: ['xmlns', 'viewBox', 'width', 'height', ...SVG_PAINT],
  path: ['d', 'fillRule', ...SVG_PAINT, ...SVG_MARKERS],
  g: ['transform', ...SVG_PAINT, ...SVG_MARKERS], // markers inherit through groups
  circle: ['cx', 'cy', 'r', ...SVG_PAINT],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry', ...SVG_PAINT],
  line: ['x1', 'y1', 'x2', 'y2', ...SVG_PAINT, ...SVG_MARKERS],
  polygon: ['points', ...SVG_PAINT, ...SVG_MARKERS],
  polyline: ['points', ...SVG_PAINT, ...SVG_MARKERS],
  ellipse: ['cx', 'cy', 'rx', 'ry', ...SVG_PAINT],
  text: ['x', 'y', 'fill', 'opacity', 'fontSize', 'fontFamily', 'fontWeight', 'fontStyle', 'textAnchor', 'dominantBaseline'],
  tspan: ['x', 'y', 'dx', 'dy', 'fill', 'fontSize', 'fontWeight', 'fontStyle', 'textAnchor', 'dominantBaseline'],
  marker: ['markerWidth', 'markerHeight', 'refX', 'refY', 'orient', 'markerUnits', 'viewBox', 'fill', 'stroke'],
  table: ['align', 'width', 'summary', 'cellpadding', 'cellspacing', 'border'],
  th: ['colspan', 'rowspan', 'scope', 'align'],
  td: ['colspan', 'rowspan', 'align'],
  col: ['span', 'width'],
  colgroup: ['span', 'width'],
  a: ['href', 'title', 'target', 'rel'],
  annotation: ['encoding'],
  abbr: ['title'],
  time: ['datetime'],
};

export const CLOBBER_PREFIX = 'user-content-';

/** Presentation attributes whose value can be url(#id) and therefore must follow the id clobber prefix. */
export const URL_REF_ATTRS: string[] = ['markerStart', 'markerMid', 'markerEnd', 'fill', 'stroke'];

/** Every real HTML / SVG / MathML element name. A "<word ...>" in prose that is NOT in this list is almost certainly text, not markup. */
export const KNOWN_ELEMENTS: string[] = [
  'a', 'abbr', 'acronym', 'address', 'applet', 'area', 'article', 'aside', 'audio', 'b', 'base', 'basefont', 'bdi', 'bdo', 'big', 'blockquote', 'body',
  'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'dir',
  'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'frame', 'frameset', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'head', 'header', 'hgroup', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'marquee',
  'menu', 'meta', 'meter', 'nav', 'nobr', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'picture', 'pre', 'progress', 'q',
  'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'slot', 'small', 'source', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr',
  // SVG
  'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'text', 'tspan', 'textpath', 'defs', 'use', 'symbol', 'marker', 'mask',
  'clippath', 'pattern', 'lineargradient', 'radialgradient', 'stop', 'filter', 'image', 'foreignobject', 'desc', 'metadata', 'switch', 'view',
  'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix', 'fecomposite', 'feflood', 'femerge', 'femergenode', 'feturbulence',
  // MathML
  'math', 'semantics', 'mrow', 'msub', 'msup', 'msubsup', 'mover', 'munder', 'munderover', 'mfrac', 'msqrt', 'mroot', 'mi', 'mn', 'mo', 'mtext', 'mspace',
  'ms', 'mpadded', 'mphantom', 'menclose', 'mstyle', 'mtable', 'mtr', 'mtd', 'annotation', 'annotation-xml',
];

/** Prism / refractor names for the language labels people actually write after ```. */
export const LANG_ALIASES: Record<string, string> = {
  'c++': 'cpp', 'c#': 'csharp', 'f#': 'fsharp', 'objective-c': 'objectivec', 'shell-session': 'shell',
  js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', yml: 'yaml',
};

/**
 * Language of a fenced block from react-markdown's className ("language-html-execute", "language-c++" …).
 * The old regex /language-(\w+)/ stopped at "-", "+" and "#": "html-execute" became "html" (so the sandbox never ran) and "c++" became "c".
 * Returns the raw label ("html-execute") or the alias target ("cpp"), or null for a plain block.
 */
export function parseCodeLanguage(className?: string): string | null {
  const m = /language-(\S+)/.exec(className || '');
  if (!m) return null;
  const raw = m[1];
  return Object.prototype.hasOwnProperty.call(LANG_ALIASES, raw.toLowerCase()) ? LANG_ALIASES[raw.toLowerCase()] : raw;
}

/**
 * rehype-sanitize prefixes every id ("arrow" -> "user-content-arrow") but leaves url(#arrow) references inside SVG
 * attributes alone, so arrowheads (marker-end) and gradient fills would point at nothing.
 * Run this AFTER sanitising: it rewrites those references to the prefixed id. Mutates the hast tree.
 */
export function prefixSvgUrlRefs(tree: unknown): void {
  const visit = (node: any): void => {
    if (node && node.type === 'element' && node.properties) {
      for (const key of URL_REF_ATTRS) {
        const v = node.properties[key];
        if (typeof v === 'string') {
          const m = /^url\(\s*#([^)\s]+)\s*\)$/.exec(v.trim());
          if (m && m[1].indexOf(CLOBBER_PREFIX) !== 0) node.properties[key] = 'url(#' + CLOBBER_PREFIX + m[1] + ')';
        }
      }
    }
    if (node && Array.isArray(node.children)) for (const c of node.children) visit(c);
  };
  visit(tree);
}

/**
 * Content-Security-Policy for ```html-execute blocks. Scripts may run, but the frame cannot touch the network:
 * no external scripts, no fetch/XHR/WebSocket, no external images (tracking pixels), no form posts.
 */
export const HTML_EXECUTE_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";