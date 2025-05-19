// src/components/preview/PreviewView.tsx
import React from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { useQuestionsStore } from '../../store/questionsStore';
import QuestionPreviewCard from './QuestionPreviewCard';

// IMPORT THE VALIDATION SERVICE
import { validateQuestionsData, formatValidationErrors, type ValidationError } from '../../services/validationService';
import type { Question } from '../../types/Question'; // Import Question type

// MODIFIED: Use the validation service to check data validity
const checkDataValidityForPreview = (questions: Question[]): string[] | null => {
    if (!questions || questions.length === 0) {
        return ["No questions to preview. Load or create questions first."];
    }
    const errors: ValidationError[] = validateQuestionsData(questions); // Use the service
    if (errors.length > 0) {
        return formatValidationErrors(errors); // Return array of formatted error strings
    }
    return null; // No errors
};


const PreviewView: React.FC = () => {
  const questions = useQuestionsStore((state) => state.questions);
  const [refreshKey, setRefreshKey] = React.useState(0); 

  const handleRefreshPreview = () => {
    setRefreshKey(prev => prev + 1);
    console.log("Preview refreshed (manually triggered)");
  };
  
  // validationMessages will be an array of strings or null
  const validationMessages = checkDataValidityForPreview(questions);

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Live Preview</h5>
        <Button variant="primary" size="sm" onClick={handleRefreshPreview} title="Refresh the preview">
          <i className="fa fa-sync-alt me-1"></i> Refresh Preview
        </Button>
      </Card.Header>
      <Card.Body className="preview-render-area">
        {validationMessages && validationMessages.length > 0 && (
          <Alert variant="warning" className="preview-validation-errors">
            <div className="d-flex align-items-center mb-2">
                <i className="fa fa-exclamation-triangle fa-lg me-2"></i>
                <strong style={{fontSize: '1.1em'}}>Preview Unvailable or Inaccurate Due to Data Issues:</strong>
            </div>
            <ul className="mb-0 ps-4" style={{fontSize: '0.9em'}}>
              {validationMessages.map((message, index) => (
                <li key={index}>{message}</li>
              ))}
            </ul>
            <hr />
            <p className="mb-0 small">
                Please fix these issues in the Form Editor or JSON Editor and validate the data.
            </p>
          </Alert>
        )}
        
        {/* Only render questions if there are no validation messages */}
        {!validationMessages && questions.length > 0 && (
          <div key={refreshKey}>
            {questions.map((question) => (
              <QuestionPreviewCard key={question.id} question={question} />
            ))}
          </div>
        )}
        
        {/* Handle case where there are no questions and no validation errors (initial empty state) */}
        {!validationMessages && questions.length === 0 && (
            <Alert variant="info" className="text-center">
                No questions loaded to preview. Use the Form Editor or Import to add questions.
            </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default PreviewView;