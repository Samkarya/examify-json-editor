import React from 'react';
import { useQuestionsStore } from '../../store/questionsStore';
import QuestionPreviewCard from './QuestionPreviewCard';
import { validateQuestionsData, formatValidationErrors } from '../../services/validationService';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const PreviewView: React.FC = () => {
  const questions = useQuestionsStore((state) => state.questions);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleRefreshPreview = () => {
    setRefreshKey(prev => prev + 1);
  };

  const errors = validateQuestionsData(questions);
  const validationMessages = errors.length > 0 ? formatValidationErrors(errors) : null;

  return (
    <div className="h-100 overflow-auto p-4 bg-app">
      {validationMessages && (
        <div className="alert alert-warning shadow-sm border-0 mb-4">
          <div className="d-flex align-items-center mb-2">
            <AlertTriangle className="me-2 text-warning" />
            <strong>Validation Issues Detected</strong>
          </div>
          <ul className="mb-0 small ps-3 text-secondary">
            {validationMessages.slice(0, 3).map((msg, i) => <li key={i}>{msg}</li>)}
            {validationMessages.length > 3 && <li>...and {validationMessages.length - 3} more.</li>}
          </ul>
        </div>
      )}

      {questions.length === 0 ? (
        <div className="text-center text-muted mt-5">
          <p>No questions to preview.</p>
        </div>
      ) : (
        <div key={refreshKey} className="d-flex flex-column gap-4">
          {questions.map((question) => (
            <div key={question.id} className="preview-question-card">
              <QuestionPreviewCard question={question} />
            </div>
          ))}
        </div>
      )}

      {/* Floating Refresh Button (optional, as it updates real-time mostly) */}
      <button
        className="btn btn-light shadow-sm position-fixed rounded-circle d-flex align-items-center justify-content-center"
        style={{ bottom: '50px', right: '30px', width: '40px', height: '40px', zIndex: 100 }}
        onClick={handleRefreshPreview}
        title="Force Refresh Preview"
      >
        <RefreshCw size={20} className="text-secondary" />
      </button>
    </div>
  );
};

export default PreviewView;