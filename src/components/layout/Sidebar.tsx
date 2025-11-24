import React, { useState } from 'react';
import { useQuestionsStore } from '../../store/questionsStore';
import { TEMPLATES } from '../../constants';
import type { Question } from '../../types/Question';
import { toast } from 'react-toastify';
import {
    LayoutTemplate,
    HelpCircle,
    List,
    ChevronLeft,
    ChevronRight,
    FileJson,
    Plus,
    Trash2,
    Copy
} from 'lucide-react';
import classNames from 'classnames';

type SidebarView = 'explorer' | 'templates' | 'help';

const Sidebar: React.FC = () => {
    const isSidebarCollapsed = useQuestionsStore((state) => state.isSidebarCollapsed);
    const toggleSidebar = useQuestionsStore((state) => state.toggleSidebar);
    const questions = useQuestionsStore((state) => state.questions);
    const currentEditId = useQuestionsStore((state) => state.currentEditId);
    const setCurrentEditId = useQuestionsStore((state) => state.setCurrentEditId);
    const deleteQuestion = useQuestionsStore((state) => state.deleteQuestion);
    const duplicateQuestion = useQuestionsStore((state) => state.duplicateQuestion);
    const setHelpModalOpen = useQuestionsStore((state) => state.setHelpModalOpen);
    const loadTemplateQuestions = useQuestionsStore((state) => state.loadTemplateQuestions);

    const [activeView, setActiveView] = useState<SidebarView>('explorer');
    const [activeTemplateCategory, setActiveTemplateCategory] = useState<keyof typeof TEMPLATES>('basic');

    const handleLoadTemplate = (templateData: Partial<Question>[], templateName: string) => {
        const mode = questions.length > 0
            ? window.confirm(`Load template "${templateName}"?\n\nOK = Replace all\nCancel = Append`) ? 'replace' : 'append'
            : 'replace';

        loadTemplateQuestions(templateData, mode);
        toast.success(mode === 'replace' ? 'Template loaded (replaced).' : 'Template appended.');
    };

    const handleQuestionClick = (id: string) => {
        setCurrentEditId(id);
        // If we were in JSON mode, maybe we should switch to Form? 
        // For now, let's assume the user stays in their preferred view.
    };

    if (isSidebarCollapsed) {
        return (
            <div className="d-flex flex-column align-items-center py-3 border-end bg-sidebar" style={{ width: '60px', height: '100%' }}>
                <button className="btn btn-link text-secondary mb-4" onClick={toggleSidebar} title="Expand Sidebar">
                    <ChevronRight size={20} />
                </button>
                <button
                    className={classNames("btn btn-link mb-3", { "text-primary": activeView === 'explorer', "text-secondary": activeView !== 'explorer' })}
                    onClick={() => { setActiveView('explorer'); toggleSidebar(); }}
                    title="Explorer"
                >
                    <List size={24} />
                </button>
                <button
                    className={classNames("btn btn-link mb-3", { "text-primary": activeView === 'templates', "text-secondary": activeView !== 'templates' })}
                    onClick={() => { setActiveView('templates'); toggleSidebar(); }}
                    title="Templates"
                >
                    <LayoutTemplate size={24} />
                </button>
                <button
                    className={classNames("btn btn-link mt-auto", { "text-primary": activeView === 'help', "text-secondary": activeView !== 'help' })}
                    onClick={() => { setActiveView('help'); toggleSidebar(); }}
                    title="Help"
                >
                    <HelpCircle size={24} />
                </button>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column border-end bg-sidebar h-100" style={{ width: 'var(--sidebar-width)' }}>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom" style={{ height: 'var(--header-height)' }}>
                <span className="fw-bold text-secondary small text-uppercase tracking-wide">
                    {activeView === 'explorer' ? 'Explorer' : activeView === 'templates' ? 'Templates' : 'Help'}
                </span>
                <button className="btn btn-link btn-sm text-secondary p-0" onClick={toggleSidebar}>
                    <ChevronLeft size={18} />
                </button>
            </div>

            {/* Activity Bar (Tabs) */}
            <div className="d-flex border-bottom bg-white">
                <button
                    className={classNames("btn btn-sm flex-grow-1 rounded-0 py-2 border-bottom-2", { "border-primary text-primary fw-bold": activeView === 'explorer', "border-transparent text-secondary": activeView !== 'explorer' })}
                    onClick={() => setActiveView('explorer')}
                >
                    Explorer
                </button>
                <button
                    className={classNames("btn btn-sm flex-grow-1 rounded-0 py-2 border-bottom-2", { "border-primary text-primary fw-bold": activeView === 'templates', "border-transparent text-secondary": activeView !== 'templates' })}
                    onClick={() => setActiveView('templates')}
                >
                    Templates
                </button>
                <button
                    className={classNames("btn btn-sm flex-grow-1 rounded-0 py-2 border-bottom-2", { "border-primary text-primary fw-bold": activeView === 'help', "border-transparent text-secondary": activeView !== 'help' })}
                    onClick={() => setActiveView('help')}
                >
                    Help
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow-1 overflow-auto p-0">

                {/* EXPLORER VIEW */}
                {activeView === 'explorer' && (
                    <div className="list-group list-group-flush">
                        {questions.length === 0 && (
                            <div className="p-4 text-center text-muted small">
                                <FileJson size={32} className="mb-2 opacity-50" />
                                <p>No questions yet.</p>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => setActiveView('templates')}>
                                    Load a Template
                                </button>
                            </div>
                        )}
                        {questions.map((q, idx) => (
                            <div
                                key={q.id}
                                className={classNames("list-group-item list-group-item-action border-0 py-2 px-3 d-flex align-items-center group-hover-container", { "bg-primary-subtle text-primary border-start border-3 border-primary": currentEditId === q.id })}
                                style={{ cursor: 'pointer', borderLeft: currentEditId === q.id ? '3px solid var(--primary)' : '3px solid transparent' }}
                                onClick={() => handleQuestionClick(q.id)}
                            >
                                <span className="fw-bold me-2 small text-muted">#{q.question_number}</span>
                                <span className="text-truncate small flex-grow-1" title={q.question_text}>
                                    {q.question_text || <span className="fst-italic text-muted">Empty Question</span>}
                                </span>

                                {/* Hover Actions */}
                                <div className="d-flex gap-1 ms-2 opacity-0 group-hover-visible" style={{ transition: 'opacity 0.2s' }}>
                                    <button
                                        className="btn btn-link p-0 text-secondary hover-text-primary"
                                        title="Duplicate"
                                        onClick={(e) => { e.stopPropagation(); duplicateQuestion(q.id); }}
                                    >
                                        <Copy size={14} />
                                    </button>
                                    <button
                                        className="btn btn-link p-0 text-danger hover-text-danger"
                                        title="Delete"
                                        onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete this question?')) deleteQuestion(q.id); }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div className="p-3">
                            <button
                                className="btn btn-sm btn-light w-100 text-primary border-dashed"
                                onClick={() => useQuestionsStore.getState().addQuestion({})}
                            >
                                <Plus size={16} className="me-1" /> Add Question
                            </button>
                        </div>
                    </div>
                )}

                {/* TEMPLATES VIEW */}
                {activeView === 'templates' && (
                    <div className="p-3">
                        <select
                            className="form-select form-select-sm mb-3"
                            value={activeTemplateCategory}
                            onChange={(e) => setActiveTemplateCategory(e.target.value as keyof typeof TEMPLATES)}
                        >
                            {Object.keys(TEMPLATES).map(key => (
                                <option key={key} value={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                            ))}
                        </select>

                        <div className="d-flex flex-column gap-2">
                            {TEMPLATES[activeTemplateCategory]?.map((t, i) => (
                                <button
                                    key={i}
                                    className="btn btn-white border text-start shadow-sm p-2 d-flex align-items-center hover-lift"
                                    onClick={() => handleLoadTemplate(t.data, t.name)}
                                >
                                    <div className="bg-light rounded p-2 me-3 text-secondary">
                                        <LayoutTemplate size={18} />
                                    </div>
                                    <div>
                                        <div className="fw-bold small">{t.name}</div>
                                        <div className="text-muted x-small">{t.data.length} Question(s)</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* HELP VIEW */}
                {activeView === 'help' && (
                    <div className="p-3">
                        <div className="alert alert-info small mb-3">
                            <HelpCircle size={16} className="me-2 inline-block" />
                            <strong>Quick Tips</strong>
                        </div>
                        <ul className="list-unstyled small text-secondary space-y-2">
                            <li className="mb-2"><strong>Math:</strong> Use <code>$$...$$</code> for block equations.</li>
                            <li className="mb-2"><strong>Images:</strong> Use standard Markdown <code>![alt](path)</code>.</li>
                            <li className="mb-2"><strong>Validation:</strong> Check the status bar for errors.</li>
                        </ul>
                        <button className="btn btn-sm btn-outline-secondary w-100 mt-2" onClick={() => setHelpModalOpen(true)}>
                            Open Full Guide
                        </button>
                    </div>
                )}
            </div>

            <style>{`
        .group-hover-container:hover .group-hover-visible { opacity: 1 !important; }
        .x-small { font-size: 0.75rem; }
        .hover-lift:hover { transform: translateY(-1px); box-shadow: var(--shadow-md) !important; }
        .border-dashed { border: 1px dashed var(--border-color); }
      `}</style>
        </div>
    );
};

export default Sidebar;
