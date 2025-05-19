// src/components/form-editor/QuestionAccordionItem.tsx
import React from 'react';
import { Accordion, Button, Badge } from 'react-bootstrap';
import type { Question } from '../../types/Question';
import { useQuestionsStore } from '../../store/questionsStore';

// A simple function to get a text preview from question_text (without full Markdown rendering for performance)
const getQuestionTextPreview = (text: string, maxLength = 80): string => {
  // Remove Markdown images, LaTeX, and code blocks for a cleaner text preview
  let preview = text
    .replace(/!\[.*?\]\(.*?\)/g, '[Image]') // Replace Markdown images
    .replace(/\$\$[\s\S]*?\$\$/g, '[Math Display]') // Replace display LaTeX
    .replace(/\$[\s\S]*?\$/g, '[Math Inline]')   // Replace inline LaTeX
    .replace(/```[\s\S]*?```/g, '[Code Block]'); // Replace code blocks
  
  preview = preview.replace(/\s+/g, ' ').trim(); // Normalize whitespace
  
  if (preview.length > maxLength) {
    return preview.substring(0, maxLength) + '...';
  }
  return preview;
};

interface QuestionAccordionItemProps {
  question: Question;
  itemKey: string; // EventKey for accordion
}

const QuestionAccordionItem: React.FC<QuestionAccordionItemProps> = ({ question, itemKey }) => {
  const setCurrentEditId = useQuestionsStore((state) => state.setCurrentEditId);
  const deleteQuestion = useQuestionsStore((state) => state.deleteQuestion);
  const duplicateQuestion = useQuestionsStore((state) => state.duplicateQuestion);

  const handleEdit = () => {
    setCurrentEditId(question.id); // setCurrentEditId is already from store
    useQuestionsStore.getState().setQuestionModalOpen(true); // Open the modal
};

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete Question ${question.question_number}? This action cannot be undone.`)) {
      deleteQuestion(question.id);
      // Toast notification can be added here
    }
  };

  const handleDuplicate = () => {
    duplicateQuestion(question.id);
    // Toast notification can be added here
  }

  const questionTitlePreview = getQuestionTextPreview(question.question_text);

  return (
    <Accordion.Item eventKey={itemKey}>
      <Accordion.Header>
        <strong className="me-2">Q {question.question_number}:</strong>
        <span className="flex-grow-1 text-truncate" style={{ maxWidth: 'calc(100% - 150px)' }}>
          {questionTitlePreview}
        </span>
      </Accordion.Header>
      <Accordion.Body className="small">
        <p className="mb-1">
          <strong>Subject:</strong> {question.subject || <Badge bg="light" text="muted">N/A</Badge>}
        </p>
        <p className="mb-1">
          <strong>Topic:</strong> {question.topic || <Badge bg="light" text="muted">N/A</Badge>}
        </p>
        <p className="mb-1">
          <strong>Section ID:</strong> {question.section_id || <Badge bg="light" text="muted">N/A</Badge>}
        </p>
        <p className="mb-2">
          <strong>Difficulty:</strong> {question.difficulty || <Badge bg="light" text="muted">N/A</Badge>}
        </p>
        <p>
          <strong className="text-success">Correct Answer:</strong> {question.correct_answer || <Badge bg="light" text="muted">N/A</Badge>}
        </p>
        <div className="mt-3">
          <Button variant="outline-primary" size="sm" onClick={handleEdit} title="Edit Question">
            <i className="fa fa-pencil-alt me-1"></i> Edit
          </Button>
          <Button variant="outline-danger" size="sm" className="ms-2" onClick={handleDelete} title="Delete Question">
            <i className="fa fa-trash-alt me-1"></i> Delete
          </Button>
          <Button variant="outline-info" size="sm" className="ms-2" onClick={handleDuplicate} title="Duplicate Question">
            <i className="fa fa-copy me-1"></i> Duplicate
          </Button>
        </div>
      </Accordion.Body>
    </Accordion.Item>
  );
};

export default QuestionAccordionItem;