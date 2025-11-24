import React from 'react';
import { useQuestionsStore } from '../../store/questionsStore';
import { AlertCircle, CheckCircle2, FileJson, AlertTriangle } from 'lucide-react';

const StatusBar: React.FC = () => {
    const questions = useQuestionsStore((state) => state.questions);
    const validationErrors = useQuestionsStore((state) => state.validationErrors);
    const activeMainView = useQuestionsStore((state) => state.activeMainView);

    const isValid = validationErrors.length === 0;

    return (
        <div
            className="d-flex align-items-center px-3 border-top bg-white text-secondary small"
            style={{ height: 'var(--status-bar-height)', fontSize: '0.8rem' }}
        >
            {/* Left Section: Status */}
            <div className="d-flex align-items-center me-4">
                {isValid ? (
                    <span className="text-success d-flex align-items-center">
                        <CheckCircle2 size={14} className="me-1" /> Ready
                    </span>
                ) : (
                    <span className="text-danger d-flex align-items-center" title={`${validationErrors.length} Errors`}>
                        <AlertCircle size={14} className="me-1" /> {validationErrors.length} Errors
                    </span>
                )}
            </div>

            {/* Center/Left Info */}
            <div className="d-flex align-items-center gap-3 border-start ps-3">
                <span title="Total Questions">
                    <FileJson size={14} className="me-1" /> {questions.length} Questions
                </span>
                {/* Add more stats here if needed */}
            </div>

            {/* Spacer */}
            <div className="flex-grow-1"></div>

            {/* Right Section: Context Info */}
            <div className="d-flex align-items-center gap-3">
                <span>{activeMainView === 'json' ? 'JSON Mode' : 'Form Mode'}</span>
                <span className="border-start ps-3">Examify Editor v1.0</span>
            </div>
        </div>
    );
};

export default StatusBar;
