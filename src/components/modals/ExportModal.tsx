// src/components/modals/ExportModal.tsx
import React, { useState, useEffect } from 'react';
import { Form, Button } from 'react-bootstrap';
import AppModal from '../common/AppModal';
import { useQuestionsStore } from '../../store/questionsStore';
import { toast } from 'react-toastify';
import { DEFAULT_FILENAME } from '../../constants';

const ExportModal: React.FC = () => {
  const isOpen = useQuestionsStore((state) => state.isExportModalOpen);
  const setOpen = useQuestionsStore((state) => state.setExportModalOpen);
  const questions = useQuestionsStore((state) => state.questions);
  const currentExportFileName = useQuestionsStore((state) => state.exportFileName);
  const setStoreExportFileName = useQuestionsStore((state) => state.setExportFileName);

  const [fileName, setFileName] = useState(DEFAULT_FILENAME);
  const [prettyFormat, setPrettyFormat] = useState(true);

  useEffect(() => {
    if (isOpen) {
        // Suggest filename based on content (e.g., if only one subject)
        const subjects = new Set(questions.map(q => q.subject).filter(s => s));
        if (subjects.size === 1) {
            const subjectName = Array.from(subjects)[0]!.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
            setFileName(`${subjectName}_questions.json`);
        } else {
            setFileName(currentExportFileName || DEFAULT_FILENAME);
        }
    }
  }, [isOpen, questions, currentExportFileName]);


  const handleClose = () => {
    setOpen(false);
  };

  const handleExport = () => {
    if (questions.length === 0) {
      toast.warn("No questions to export.");
      handleClose();
      return;
    }

    // Omit client-side 'id' and other internal fields like '_isDirty' for export
    const questionsForExport = questions.map(({ id, _isDirty, ...rest }) => rest);
    
    const jsonString = JSON.stringify(questionsForExport, null, prettyFormat ? 2 : undefined);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStoreExportFileName(fileName); // Save last used filename
    toast.success("JSON data exported successfully!");
    handleClose();
  };

  const footer = (
    <>
      <Button variant="secondary" onClick={handleClose}>Cancel</Button>
      <Button variant="primary" onClick={handleExport}>Export</Button>
    </>
  );

  return (
    <AppModal show={isOpen} onHide={handleClose} title="Export JSON" footerButtons={footer}>
      <Form>
        <Form.Group className="mb-3" controlId="fileNameInput">
          <Form.Label>File Name</Form.Label>
          <Form.Control
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
        </Form.Group>
        <Form.Group className="mb-3" controlId="formatJsonCheckbox">
          <Form.Check
            type="checkbox"
            label="Pretty format (indented) JSON"
            checked={prettyFormat}
            onChange={(e) => setPrettyFormat(e.target.checked)}
          />
        </Form.Group>
      </Form>
    </AppModal>
  );
};

export default ExportModal;