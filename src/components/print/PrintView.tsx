import React, { useEffect, useState, useMemo } from 'react';
import type { Question } from '../../types/Question';
import '../../styles/print.css';
import RichTextRenderer from '../common/RichTextRenderer';

const PrintView: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [showAnswers, setShowAnswers] = useState(false);
    const [examTitle, setExamTitle] = useState('Exam');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setShowAnswers(params.get('showAnswers') === 'true');

        const storedData = localStorage.getItem('examoven-print-data');
        if (storedData) {
            try {
                setQuestions(JSON.parse(storedData));
            } catch (error) {
                console.error("Failed to parse print data", error);
            }
        }

        const storedTitle = localStorage.getItem('examoven-print-title');
        if (storedTitle) setExamTitle(storedTitle);

        const timer = setTimeout(() => window.print(), 1200);
        return () => clearTimeout(timer);
    }, []);

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    const stats = useMemo(() => {
        return { totalMarks: questions.length };
    }, [questions]);

    /* ─────────────────────────────────────────────
       We use a <table> with <thead> / <tfoot> so
       the browser natively repeats header & footer
       on every printed page. This is the only
       cross-browser reliable technique.
       ───────────────────────────────────────────── */
    return (
        <div className="print-page">
            <table className="print-layout-table">
                {/* ═══ HEADER — repeated on every page ═══ */}
                <thead>
                    <tr>
                        <th>
                            <div className="print-header">
                                <div className="print-header__brand">
                                    <div className="print-header__logo-wrap">
                                        <img
                                            src="https://examoven.com/web-app-manifest-192x192.png"
                                            alt="ExamOven"
                                            className="print-header__logo"
                                        />
                                    </div>
                                    <div className="print-header__title-block">
                                        <div className="print-header__title">{examTitle}</div>
                                        <div className="print-header__subtitle">
                                            Practice Paper · <strong>ExamOven</strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="print-header__meta">
                                    <div className="print-header__meta-row">
                                        <span className="print-header__meta-label">Date</span>
                                        <span className="print-header__meta-value">{currentDate}</span>
                                    </div>
                                    <div className="print-header__meta-row">
                                        <span className="print-header__meta-label">Questions</span>
                                        <span className="print-header__meta-value">{questions.length}</span>
                                    </div>
                                </div>
                            </div>
                        </th>
                    </tr>
                </thead>

                {/* ═══ FOOTER — repeated on every page ═══ */}
                <tfoot>
                    <tr>
                        <td>
                            <div className="print-footer">
                                <div className="print-footer__left">
                                    <strong>{examTitle}</strong>
                                </div>
                                <div className="print-footer__center">
                                    <a href="https://examoven.com" target="_blank" rel="noopener noreferrer">
                                        examoven.com
                                    </a>
                                </div>
                                <div className="print-footer__right">
                                    {currentDate}
                                </div>
                            </div>
                        </td>
                    </tr>
                </tfoot>

                {/* ═══ BODY — question content ═══ */}
                <tbody>
                    <tr>
                        <td className="print-body-cell">
                            <div className="print-questions">
                                {questions.map((q, idx) => (
                                    <div key={q.id} className="print-q">
                                        {/* Question Header Row */}
                                        <div className="print-q__header">
                                            <div className="print-q__number">{q.question_number}</div>
                                            <div className="print-q__body">
                                                <div className="print-q__text">
                                                    <RichTextRenderer rawText={q.question_text || ''} />
                                                </div>
                                                {(q.subject || q.topic || q.difficulty) && (
                                                    <div className="print-q__tags">
                                                        {q.subject && <span className="print-tag print-tag--subject">{q.subject}</span>}
                                                        {q.topic && <span className="print-tag print-tag--topic">{q.topic}</span>}
                                                        {q.difficulty && <span className={`print-tag print-tag--${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Options Grid */}
                                        <div className="print-q__options">
                                            {Object.entries(q.options).map(([key, value]) => {
                                                const isCorrect = showAnswers && key.toLowerCase() === q.correct_answer?.toLowerCase();
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`print-option ${isCorrect ? 'print-option--correct' : ''}`}
                                                    >
                                                        <span className={`print-option__key ${isCorrect ? 'print-option__key--correct' : ''}`}>
                                                            {key.toUpperCase()}
                                                        </span>
                                                        <div className="print-option__value">
                                                            <RichTextRenderer rawText={value} />
                                                        </div>
                                                        {isCorrect && <span className="print-option__check">✓</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Answer + Explanation */}
                                        {showAnswers && (
                                            <div className="print-q__answer">
                                                <div className="print-q__answer-badge">
                                                    <span className="print-q__answer-label">Answer</span>
                                                    <span className="print-q__answer-value">{q.correct_answer?.toUpperCase()}</span>
                                                </div>
                                                {q.explanation && (
                                                    <div className="print-q__explanation">
                                                        <div className="print-q__explanation-title">Explanation</div>
                                                        <div className="print-q__explanation-body">
                                                            <RichTextRenderer rawText={q.explanation} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Separator */}
                                        {idx < questions.length - 1 && <div className="print-q__divider" />}
                                    </div>
                                ))}
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

export default PrintView;
