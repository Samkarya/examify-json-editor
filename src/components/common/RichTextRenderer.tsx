import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeExternalLinks from 'rehype-external-links';
import type { Schema } from 'hast-util-sanitize';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coy } from 'react-syntax-highlighter/dist/esm/styles/prism';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown';
import { GITHUB_QUESTIONS_REPO_RAW_BASE_URL } from '../../constants';
import { FaCopy, FaCheck, FaInfoCircle, FaLightbulb, FaExclamationTriangle, FaExclamationCircle, FaShieldAlt } from 'react-icons/fa';

import 'katex/dist/katex.min.css';

SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('markdown', markdown);

interface RichTextRendererProps {
    rawText: string | null | undefined;
    className?: string;
}

const customSanitizeSchema: Schema = {
    ...defaultSchema,
    tagNames: [
        ...(defaultSchema.tagNames || []),
        'svg', 'path', 'g', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse', 'text', 'defs', 'use', 
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col'
    ],
    attributes: {
        ...defaultSchema.attributes,
        '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'style', 'id'],
        svg: ['xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'strokeWidth', 'strokeDasharray', 'strokeLinecap', 'strokeLinejoin'],
        path: ['d', 'fill', 'stroke', 'strokeWidth', 'strokeDasharray', 'strokeLinecap', 'strokeLinejoin', 'fillRule'],
        g: ['fill', 'stroke', 'transform', 'strokeWidth'],
        circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'strokeWidth'],
        rect: ['x', 'y', 'width', 'height', 'fill', 'stroke', 'strokeWidth', 'rx', 'ry'],
        line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'strokeWidth'],
        polygon: ['points', 'fill', 'stroke', 'strokeWidth'],
        polyline: ['points', 'fill', 'stroke', 'strokeWidth'],
        ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'strokeWidth'],
        text: ['x', 'y', 'fill', 'fontSize', 'fontFamily', 'textAnchor'],
        table: ['align', 'width', 'summary', 'cellpadding', 'cellspacing', 'border'],
        th: ['colspan', 'rowspan', 'scope', 'align'],
        td: ['colspan', 'rowspan', 'align'],
        col: ['span', 'width'],
        colgroup: ['span', 'width'],
        a: ['href', 'title', 'target', 'rel']
    },
};

const resolveMarkdownImageUrl = (uri: string): string => {
    if (!uri) return '';
    if (uri.startsWith('https://')) return uri;
    if (uri.startsWith('http://')) {
        console.warn('Insecure HTTP image URL blocked:', uri);
        return '';
    }
    if (!uri.includes(':')) {
        const cleanPath = uri.startsWith('/') ? uri.slice(1) : uri;
        return `${GITHUB_QUESTIONS_REPO_RAW_BASE_URL}${cleanPath}`;
    }
    return '';
};

const RenderedImage: React.FC<{ src: string; alt?: string; [key: string]: any }> = ({ src, alt, ...props }) => {
    const [imageError, setImageError] = useState(false);
    useEffect(() => setImageError(false), [src]);

    if (imageError || !src) {
        return <span className="text-danger small">[Image: {alt || 'not found'}]</span>;
    }
    return <img src={src} alt={alt || ''} onError={() => setImageError(true)} className="img-fluid my-2" loading="lazy" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} {...props} />;
};

const CopyButton = ({ text }: { text: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [text]);

    return (
        <button
            className={`btn btn-sm ${copied ? 'btn-success' : 'btn-outline-secondary'} position-absolute top-0 end-0 m-1`}
            style={{ zIndex: 10, padding: '2px 6px', fontSize: '10px' }}
            onClick={handleCopy}
            title="Copy to clipboard"
        >
            {copied ? <><FaCheck size={10} /> Copied</> : <><FaCopy size={10} /> Copy</>}
        </button>
    );
};

const RichTextRenderer: React.FC<RichTextRendererProps> = React.memo(({ rawText, className }) => {
    if (!rawText) return null;

    return (
        <div className={`preview-rich-text-content ${className || ''}`}>
            <ReactMarkdown
                children={rawText}
                remarkPlugins={[remarkMath, remarkGfm]}
                rehypePlugins={[
                    rehypeRaw,
                    rehypeSlug,
                    [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
                    [rehypeSanitize, customSanitizeSchema],
                    [rehypeKatex, { strict: 'ignore' }]
                ]}
                components={{
                    img: ({ src, alt, ...props }) => {
                        const resolvedSrc = src ? resolveMarkdownImageUrl(src) : '';
                        return <RenderedImage src={resolvedSrc} alt={alt} {...props} />;
                    },
                    code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const codeText = String(children).replace(/\n$/, '');

                        return match ? (
                            <div className="position-relative my-3 border rounded shadow-sm">
                                <CopyButton text={codeText} />
                                <SyntaxHighlighter
                                    children={codeText}
                                    style={coy as any}
                                    language={match[1]}
                                    PreTag="div"
                                    customStyle={{ margin: 0, borderRadius: 'var(--bs-border-radius)' }}
                                />
                            </div>
                        ) : (
                            <code className={className} style={{ backgroundColor: 'var(--bs-gray-200)', padding: '2px 4px', borderRadius: '4px' }} {...props}>
                                {children}
                            </code>
                        );
                    },
                    table: ({ ...props }) => <div className="table-responsive"><table className="table table-bordered table-striped table-sm my-3" {...props} /></div>,
                    blockquote: ({ children }) => {
                        const findAlert = (nodes: any): { type: string; content: any } | null => {
                            if (!nodes) return null;
                            const childrenArray = React.Children.toArray(nodes);

                            for (let i = 0; i < childrenArray.length; i++) {
                                const child = childrenArray[i];
                                if (!React.isValidElement(child)) continue;

                                const props = child.props as any;
                                if (!props || !props.children) continue;

                                const grandChildren = React.Children.toArray(props.children);
                                const firstText = grandChildren[0];

                                if (typeof firstText === 'string') {
                                    const match = firstText.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
                                    if (match) {
                                        const type = match[1].toUpperCase();
                                        const newGrandChildren = [...grandChildren];
                                        newGrandChildren[0] = firstText.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trimStart();
                                        const newChild = React.cloneElement(child, { children: newGrandChildren } as any);
                                        const newContent = [...childrenArray];
                                        newContent[i] = newChild;
                                        return { type, content: newContent };
                                    }
                                }
                            }
                            return null;
                        };

                        const alert = findAlert(children);

                        if (alert) {
                            const alertTypeMapping: Record<string, { icon: any, color: string }> = {
                                NOTE: { icon: FaInfoCircle, color: 'info' },
                                TIP: { icon: FaLightbulb, color: 'success' },
                                IMPORTANT: { icon: FaExclamationCircle, color: 'primary' },
                                WARNING: { icon: FaExclamationTriangle, color: 'warning' },
                                CAUTION: { icon: FaShieldAlt, color: 'danger' }
                            };
                            
                            const mapping = alertTypeMapping[alert.type] || alertTypeMapping['NOTE'];
                            const Icon = mapping.icon;

                            return (
                                <div className={`alert alert-${mapping.color} shadow-sm my-3 border-start border-${mapping.color} border-4`} role="alert">
                                    <h6 className="alert-heading d-flex align-items-center mb-2">
                                        <Icon className="me-2" /> {alert.type}
                                    </h6>
                                    <div className="mb-0 small">{alert.content}</div>
                                </div>
                            );
                        }

                        return <blockquote className="blockquote border-start border-3 ps-3 text-muted my-3" style={{ fontSize: '1rem' }}>{children}</blockquote>;
                    },
                }}
            />
        </div>
    );
});

export default RichTextRenderer;