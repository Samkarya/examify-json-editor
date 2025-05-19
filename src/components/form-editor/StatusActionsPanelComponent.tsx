// src/components/form-editor/StatusActionsPanelComponent.tsx
import React from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { useQuestionsStore } from '../../store/questionsStore';
import { toast } from 'react-toastify'; // For notifications
import { validateQuestionsData, formatValidationErrors, type ValidationError } from '../../services/validationService';

const StatusActionsPanelComponent: React.FC = () => {
  const questions = useQuestionsStore((state) => state.questions);
  const validationErrors = useQuestionsStore((state) => state.validationErrors);
  const setStoreValidationErrors = useQuestionsStore((state) => state.setValidationErrors); // Renamed for clarity
  const updateJsonEditorContentFromState = useQuestionsStore((state) => state.updateJsonEditorContentFromState);
  const setHelpModalOpen = useQuestionsStore((state) => state.setHelpModalOpen);

  const isValid = validationErrors.length === 0;

  const handleValidateForm = () => {
    const errors: ValidationError[] = validateQuestionsData(questions); // Use service
    setStoreValidationErrors(formatValidationErrors(errors)); // Store formatted string errors
    if (errors.length === 0) {
      toast.success("Form data is valid!");
    } else {
      toast.error(`Found ${errors.length} validation issue(s).`);
    }
  };

  const handleSyncToJson = () => {
    const errors: ValidationError[] = validateQuestionsData(questions);
    if (errors.length > 0) {
        setStoreValidationErrors(formatValidationErrors(errors));
        toast.error("Form data has errors. Please fix them before syncing to JSON editor.", { autoClose: 7000 });
        return;
    }
    setStoreValidationErrors([]); // Clear errors if valid before sync
    updateJsonEditorContentFromState();
    toast.success("Form data synced to JSON Editor!");
  };

  const openFullHelpGuide = () => {
    setHelpModalOpen(true); // Call the store action
  };

  return (
    <>
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Status & Actions</h5>
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center mb-3">
            <div className={`status-badge me-2 ${isValid ? 'status-valid' : 'status-invalid'}`}>
              <i className={`fa ${isValid ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
              {isValid ? ' Valid' : ' Invalid'}
            </div>
            <div className="flex-grow-1">
              <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {!isValid && (
            <Alert variant="danger" className="validation-error-panel small mb-3 py-2">
              <div className="mb-1"><strong>Validation Issues:</strong></div>
              <ul className="mb-0 ps-3">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="d-grid gap-2">
            <Button variant="success" size="sm" onClick={handleValidateForm} title="Validate data from Form Editor">
              <i className="fa fa-check-circle me-1"></i> Validate Form Data
            </Button>
            <Button variant="info" size="sm" onClick={handleSyncToJson} title="Update JSON Editor with current Form data">
              <i className="fa fa-sync me-1"></i> Sync to JSON Editor
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header>
          <h5 className="mb-0"><i className="fa fa-lightbulb text-warning me-2"></i>Quick Tips</h5>
        </Card.Header>
        <Card.Body>
          <ul className="list-unstyled small">
            <li><i className="fa fa-check text-success me-2"></i>Use Form Editor for easy creation.</li>
            <li><i className="fa fa-check text-success me-2"></i>Switch to JSON Editor for advanced edits.</li>
            <li><i className="fa fa-check text-success me-2"></i>Validate regularly to catch errors.</li>
            <li><i className="fa fa-check text-success me-2"></i>See Preview tab for how questions look.</li>
            <li><i className="fa fa-check text-success me-2"></i>Use sidebar Templates for quick starts.</li>
          </ul>
          <div className="d-grid">
            <Button variant="outline-primary" size="sm" onClick={openFullHelpGuide}>
              <i className="fa fa-book-open me-1"></i> Open Full Help Guide
            </Button>
          </div>
        </Card.Body>
      </Card>
    </>
  );
};

export default StatusActionsPanelComponent;