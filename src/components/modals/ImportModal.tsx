// src/components/modals/ImportModal.tsx
import React, { useState, useCallback, type ChangeEvent, useEffect } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import AppModal from '../common/AppModal';
import { useQuestionsStore } from '../../store/questionsStore';
import { toast } from 'react-toastify';
import type { Question } from '../../types/Question'; // For type casting
import { v4 as uuidv4 } from 'uuid';
import { validateRawJsonString, formatValidationErrors } from '../../services/validationService';

const ImportModal: React.FC = () => {
  const isOpen = useQuestionsStore((state) => state.isImportModalOpen);
  const setOpen = useQuestionsStore((state) => state.setImportModalOpen);
  const setQuestions = useQuestionsStore((state) => state.setQuestions);
  const setLoading = useQuestionsStore((state) => state.setLoading);
  const setActiveMainView = useQuestionsStore((state) => state.setActiveMainView);

  const [importMethod, setImportMethod] = useState<'file' | 'paste'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [pasteJson, setPasteJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setPasteJson('');
    setError(null);
  };



  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/json" || selectedFile.name.endsWith(".json")) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Invalid file type. Please select a .json file.");
        setFile(null);
      }
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      const droppedFile = event.dataTransfer.files[0];
      if (droppedFile.type === "application/json" || droppedFile.name.endsWith(".json")) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Invalid file type. Please drop a .json file.");
        setFile(null);
      }
    }
  }, []);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
  };

  const processImport = (jsonString: string) => {
    setLoading(true, "Importing and validating JSON...");
    setTimeout(() => { // Simulate async
      const { data: parsedQuestions, errors: validationServiceErrors } = validateRawJsonString(jsonString);
      if (validationServiceErrors.length > 0 || !parsedQuestions) {
        setError(`Import Error: ${formatValidationErrors(validationServiceErrors).join('; ')}`);
        toast.error("Failed to import JSON. Please check the format and content.");
        setLoading(false);
        return;
      }
      const questionsWithClientIds: Question[] = parsedQuestions.map(q => ({
        ...q,
        id: uuidv4(),
        // Ensure all optional fields are present
        subject: q.subject !== undefined ? q.subject : null,
        topic: q.topic !== undefined ? q.topic : null,
        explanation: q.explanation !== undefined ? q.explanation : null,
        difficulty: q.difficulty !== undefined ? q.difficulty : '',
        section_id: q.section_id !== undefined ? q.section_id : null,
      }));
      setQuestions(questionsWithClientIds);
      toast.success("JSON imported and validated successfully!");
      setLoading(false);
      setActiveMainView('form'); // Switch to form view after import
      handleClose();
    }, 500);
  };

  const handleImport = () => {
    setError(null);
    if (importMethod === 'file') {
      if (!file) {
        setError("Please select a file to import.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          processImport(text);
        } catch (readError: any) {
          setError(`Error reading file: ${readError.message}`);
          toast.error("Error reading file content.");
        }
      };
      reader.onerror = () => {
        setError("Error occurred while reading the file.");
        toast.error("Error reading file.");
      }
      reader.readAsText(file);
    } else { // paste
      if (!pasteJson.trim()) {
        setError("Please paste JSON content to import.");
        return;
      }
      processImport(pasteJson);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Ensure the message is from the expected origin
      if (event.origin === ('https://examify.web.app')) {
        const { type, payload } = event.data;
        if (type === 'loadExamJson' && typeof payload === 'string') {
          try {
            processImport(payload);
            toast.success('JSON data received and loaded into editor!');
          } catch (error) {
            toast.error('Failed to process received JSON data.');
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);


  const footer = (
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleImport}>Import</Button>
    </>
  );

  return (
    <AppModal show={isOpen} onHide={handleClose} title="Import JSON" footerButtons={footer}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Select Import Method</Form.Label>
          <div>
            <Form.Check
              inline
              type="radio"
              label="Import from file"
              name="importMethod"
              id="importFileRadio"
              value="file"
              checked={importMethod === 'file'}
              onChange={() => setImportMethod('file')}
            />
            <Form.Check
              inline
              type="radio"
              label="Paste JSON"
              name="importMethod"
              id="importPasteRadio"
              value="paste"
              checked={importMethod === 'paste'}
              onChange={() => setImportMethod('paste')}
            />
          </div>
        </Form.Group>

        {importMethod === 'file' && (
          <Form.Group controlId="fileInputGroup">
            <div
              className="dropzone-area" // From global.css
              onClick={() => document.getElementById('fileInput')?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <i className="fa fa-file-upload fa-2x mb-2 text-secondary"></i>
              <p>Drag & drop a JSON file here or click to browse</p>
              <input type="file" id="fileInput" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFileChange} />
              {file && <small className="text-muted d-block mt-1">Selected: {file.name}</small>}
            </div>
          </Form.Group>
        )}

        {importMethod === 'paste' && (
          <Form.Group controlId="pasteJsonTextarea">
            <Form.Label>Paste JSON Content</Form.Label>
            <Form.Control
              as="textarea"
              rows={10}
              placeholder="Paste your JSON array here..."
              value={pasteJson}
              onChange={(e) => setPasteJson(e.target.value)}
            />
          </Form.Group>
        )}
      </Form>
    </AppModal>
  );
};

export default ImportModal;