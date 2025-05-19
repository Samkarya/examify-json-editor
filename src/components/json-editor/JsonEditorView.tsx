// src/components/json-editor/JsonEditorView.tsx
import React, { useState } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from "@codemirror/lint";
import { dracula } from '@uiw/codemirror-theme-dracula';
import { useQuestionsStore } from '../../store/questionsStore';
import { toast } from 'react-toastify';

// IMPORT FROM THE SERVICE
import { validateRawJsonString, formatValidationErrors } from '../../services/validationService';

const JsonEditorView: React.FC = () => {
  const jsonEditorContent = useQuestionsStore((state) => state.jsonEditorContent);
  const setJsonEditorContent = useQuestionsStore((state) => state.setJsonEditorContent);
  // const setQuestions = useQuestionsStore((state) => state.setQuestions); // Not directly used here for validation button
  const setLoading = useQuestionsStore((state) => state.setLoading);
  const updateStateFromJsonEditor = useQuestionsStore((state) => state.updateStateFromJsonEditorContent);
  
  const [editorStatus, setEditorStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  const handleEditorChange = React.useCallback((value: string) => {
    setJsonEditorContent(value);
    if (editorStatus) setEditorStatus(null);
  }, [setJsonEditorContent, editorStatus]);

  const handleValidateJson = () => {
    setLoading(true, "Validating JSON...");
    setTimeout(() => {
        // USE THE IMPORTED VALIDATION SERVICE
        const { data, errors: validationServiceErrors } = validateRawJsonString(jsonEditorContent);
        
        if (validationServiceErrors.length === 0 && data) { // Also check if data is not null
            setEditorStatus({ type: 'success', message: 'JSON is valid!' });
            toast.success("JSON structure is valid!");
        } else {
            const formattedErrorMessages = formatValidationErrors(validationServiceErrors);
            setEditorStatus({ type: 'error', message: `Validation Issues:\n- ${formattedErrorMessages.join('\n- ')}` });
            toast.error(`JSON has ${validationServiceErrors.length} validation issue(s).`);
        }
        setLoading(false);
    }, 300);
  };

  const handleSyncToForm = () => {
    if (editorStatus && editorStatus.type === 'error') setEditorStatus(null); 
    updateStateFromJsonEditor(); 
  };
  

  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Raw JSON Editor</h5>
        <div>
          <Button variant="success" size="sm" className="me-2" onClick={handleValidateJson} title="Validate JSON in the editor">
            <i className="fa fa-check-circle me-1"></i> Validate JSON
          </Button>
          <Button variant="info" size="sm" onClick={handleSyncToForm} title="Update Form Editor with data from JSON (will overwrite form)">
            <i className="fa fa-sync me-1"></i> Sync to Form Editor
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        {editorStatus && (
          <Alert 
            variant={editorStatus.type === 'success' ? 'success' : 'danger'} 
            className="m-2 small mb-0 py-2"
            onClose={() => setEditorStatus(null)}
            dismissible={editorStatus.type === 'info'}
          >
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize:'0.85em' }}>{editorStatus.message}</pre>
          </Alert>
        )}
        <div className="json-editor-container-wrapper">
          <CodeMirror
            value={jsonEditorContent}
            height="100%"
            extensions={[
                jsonLang(),
                linter(jsonParseLinter() as any)
            ]}
            onChange={handleEditorChange}
            theme={dracula}
            basicSetup={{
                foldGutter: true,
                dropCursor: true,
                allowMultipleSelections: true,
                indentOnInput: true,
                highlightActiveLine: true,
                highlightSelectionMatches: true,
                autocompletion: true,
                lineNumbers: true, // Ensure this is enabled
            }}
          />
        </div>
      </Card.Body>
    </Card>
  );
};

export default JsonEditorView;