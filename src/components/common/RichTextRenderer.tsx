// src/components/common/RichTextRenderer.tsx
import React, { useEffect, useRef } from 'react';
import { marked, Renderer } from 'marked'; // Import Renderer
import type { Tokens } from 'marked'; // Import Tokens type for Image
import DOMPurify from 'dompurify';
import katex from 'katex';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-json';
import 'prismjs/plugins/line-numbers/prism-line-numbers.js';

import { GITHUB_QUESTIONS_REPO_RAW_BASE_URL } from '../../constants';

interface RichTextRendererProps {
  rawText: string | null | undefined;
  className?: string;
}

const markedRenderer = new Renderer();

// Fix for TS2322: Use the structured argument type 'marked.Tokens.Image'
markedRenderer.image = (imageToken: Tokens.Image): string => {
    const { href, title, text } = imageToken; // Destructure the properties

    let resolvedSrc = href || '';
    if (href && !(href.startsWith('https://') || href.startsWith('http://') || href.startsWith('data:'))) {
        resolvedSrc = `${GITHUB_QUESTIONS_REPO_RAW_BASE_URL}${href.startsWith('/') ? href.substring(1) : href}`;
    }
    if (href && href.startsWith('http://')) {
        console.warn('Insecure HTTP image URL skipped in preview:', href);
        return `<span class="rendered-image-error" title="Original src: ${href || ''}">[Image: ${text || 'Load Error (HTTP)'}]</span>`;
    }

    const altText = text || title || 'Image';
    const sanitizedAlt = DOMPurify.sanitize(altText, { USE_PROFILES: { html: false, svg: false, mathMl: false } });
    const sanitizedTitle = title ? DOMPurify.sanitize(title, { USE_PROFILES: { html: false, svg: false, mathMl: false } }) : '';
  
    return `<img src="${resolvedSrc}" alt="${sanitizedAlt}" ${sanitizedTitle ? `title="${sanitizedTitle}"` : ''} style="max-width: 100%; height: auto; display: block; margin: 0.5em 0;" loading="lazy" />`;
};


marked.setOptions({
  renderer: markedRenderer,
  pedantic: false,
  gfm: true,
  breaks: true,
});

const renderMathInText = (text: string): string => {
  let renderedText = text;
  renderedText = renderedText.replace(/(\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/g, (match, _, p1Inner, p2Inner) => {
    const tex = p1Inner || p2Inner;
    try {
      return katex.renderToString(tex, { displayMode: true, throwOnError: false, trust: true });
    } catch (e: any) {
      console.error("KaTeX display render error:", e);
      return `<span class="katex-error" title="${e.message || String(e)}">${match} (KaTeX Error)</span>`;
    }
  });
  renderedText = renderedText.replace(/(\$(?!\$)([^\s$][\s\S]*?[^\s$])\$(?!\$)|\\\(([\s\S]+?)\\\))/g, (match, _, p1Inner, p2Inner) => {
    const tex = p1Inner || p2Inner;
    try {
      return katex.renderToString(tex, { displayMode: false, throwOnError: false, trust: true });
    } catch (e: any) {
      console.error("KaTeX inline render error:", e);
      return `<span class="katex-error" title="${e.message || String(e)}">${match} (KaTeX Error)</span>`;
    }
  });
  return renderedText;
};


const RichTextRenderer: React.FC<RichTextRendererProps> = ({ rawText, className }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && rawText) {
      const mathProcessedText = renderMathInText(rawText);
      const markdownOutput = marked.parse(mathProcessedText);

      const processOutput = (htmlOutput: string) => {
        if (contentRef.current) {
            const cleanHtml = DOMPurify.sanitize(htmlOutput, {
                USE_PROFILES: { html: true, svg: true, mathMl: true },
                ADD_TAGS: ['math', 'mstyle', 'mtable', 'mtr', 'mtd', 'msup', 'msub', 'mfrac', 'mi', 'mo', 'mn', 'mtext', 'semantics', 'annotation', 'merror', 'mrow', 'annotation-xml', 'figure', 'figcaption'],
                ADD_ATTR: ['encoding', 'definitionURL', 'mathvariant', 'mathsize', 'displaystyle', 'xmlns', 'accent', 'accentunder', 'src', 'alt', 'class', 'style', 'title', 'id', 'role', 'aria-hidden', 'data-mathml', 'loading'],
            });
            contentRef.current.innerHTML = cleanHtml;
            contentRef.current.querySelectorAll('pre code[class*="language-"]').forEach(codeBlock => {
                const pre = codeBlock.parentElement;
                if (pre && pre.tagName === 'PRE' && !pre.classList.contains('line-numbers')) {
                    pre.classList.add('line-numbers');
                }
            });
            Prism.highlightAllUnder(contentRef.current);
        }
      };

      if (typeof markdownOutput === 'string') {
        processOutput(markdownOutput);
      } else if (markdownOutput instanceof Promise) {
        markdownOutput.then(processOutput).catch(err => {
            console.error("Error parsing Markdown:", err);
            if (contentRef.current) contentRef.current.innerHTML = "<p>Error rendering content.</p>";
        });
      }

    } else if (contentRef.current) {
      contentRef.current.innerHTML = '';
    }
  }, [rawText]);

  return <div ref={contentRef} className={`preview-rich-text-content ${className || ''} katex-render-container`}></div>;
};

export default RichTextRenderer;