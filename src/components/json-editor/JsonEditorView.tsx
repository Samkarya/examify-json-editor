import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang, jsonParseLinter } from '@codemirror/lang-json';
import { linter } from "@codemirror/lint";
import { dracula } from '@uiw/codemirror-theme-dracula';
import { useQuestionsStore } from '../../store/questionsStore';
import { toast } from 'react-toastify';
import { validateRawJsonString, formatValidationErrors } from '../../services/validationService';
import { CheckCircle, RefreshCw } from 'lucide-react';

const JsonEditorView: React.FC = () => {
  const jsonEditorContent = useQuestionsStore((state) => state.jsonEditorContent);
  const setJsonEditorContent = useQuestionsStore((state) => state.setJsonEditorContent);
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
      const { data, errors } = validateRawJsonString(jsonEditorContent);
      if (errors.length === 0 && data) {
        setEditorStatus({ type: 'success', message: 'JSON is valid!' });
        toast.success("JSON structure is valid!");
      } else {
        const formatted = formatValidationErrors(errors);
        setEditorStatus({ type: 'error', message: formatted.join('\n') });
        toast.error(`JSON has ${errors.length} validation issue(s).`);
      }
      setLoading(false);
    }, 300);
  };

  const handleSyncToForm = () => {
    if (editorStatus && editorStatus.type === 'error') setEditorStatus(null);
    updateStateFromJsonEditor();
  };

  return (
    <div className="d-flex flex-column h-100">
      <div className="panel-header">
        <span>Raw JSON</span>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-light border d-flex align-items-center" onClick={handleValidateJson}>
            <CheckCircle size={14} className="me-1" /> Validate
          </button>
          <button className="btn btn-sm btn-primary-custom text-white d-flex align-items-center" onClick={handleSyncToForm}>
            <RefreshCw size={14} className="me-1" /> Sync to Form
          </button>
        </div>
      </div>

      {editorStatus && (
        <div className={`p-2 small border-bottom ${editorStatus.type === 'error' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}`}>
          <pre className="m-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>{editorStatus.message}</pre>
        </div>
      )}

      <div className="flex-grow-1 overflow-hidden">
        <CodeMirror
          value={jsonEditorContent}
          height="100%"
          extensions={[jsonLang(), linter(jsonParseLinter() as any)]}
          onChange={handleEditorChange}
          theme={dracula}
          basicSetup={{
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            lineNumbers: true,
          }}
        />
      </div>
    </div>
  );
};

export default JsonEditorView;