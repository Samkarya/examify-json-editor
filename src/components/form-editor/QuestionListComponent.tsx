// src/components/form-editor/QuestionListComponent.tsx
import React from 'react';
import { Accordion, Alert } from 'react-bootstrap';
import { useQuestionsStore } from '../../store/questionsStore';
import QuestionAccordionItem from './QuestionAccordionItem';

const QuestionListComponent: React.FC = () => {
  const questions = useQuestionsStore((state) => state.questions);
  // const openAddQuestionModal = useQuestionsStore((state) => state.openAddQuestionModal); // Assuming modal opening is handled by another component or a global state

  if (!questions || questions.length === 0) {
    return (
      <Alert variant="info" className="text-center m-0" id="noQuestionsAlert">
        <i className="fa fa-info-circle me-2"></i> No questions yet. Click "Add Question" to get started or import a JSON file.
      </Alert>
    );
  }

  return (
    <Accordion id="questionsAccordion">
      {questions.map((question) => (
        <QuestionAccordionItem
          key={question.id} // Use the unique client-side ID for React keys
          question={question}
          itemKey={question.id} // Accordion needs a unique eventKey
        />
      ))}
    </Accordion>
  );
};

export default QuestionListComponent;