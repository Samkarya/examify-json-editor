// src/components/preview/QuestionPreviewCard.tsx
import React from 'react';
import { Badge } from 'react-bootstrap';
import type { Question } from '../../types/Question';
import RichTextRenderer from '../common/RichTextRenderer';

interface QuestionPreviewCardProps {
  question: Question;
}

const QuestionPreviewCard: React.FC<QuestionPreviewCardProps> = ({ question }) => {
  return (
    <div className="preview-question-item">
      <div className="preview-question-header">
        <span className="preview-question-number">Question {question.question_number}</span>
        <div className="preview-header-details">
          {question.subject && <Badge bg="info-subtle" text="info-emphasis" className="me-1">{question.subject}</Badge>}
          {question.topic && <Badge bg="secondary-subtle" text="secondary-emphasis" className="me-1">{question.topic}</Badge>}
          {question.section_id && <Badge bg="primary-subtle" text="primary-emphasis" className="me-1">{question.section_id}</Badge>}
          {question.difficulty ? (
            <Badge bg="warning-subtle" text="warning-emphasis">{question.difficulty}</Badge>
           ) : (
            <Badge bg="light" text="muted">Difficulty: N/A</Badge>
           )}
        </div>
      </div>

      <RichTextRenderer rawText={question.question_text} className="mb-3" />

      {question.options && typeof question.options === 'object' && (
        <div className="preview-options-list mb-3">
          {Object.entries(question.options).map(([key, value]) => {
            // Case-insensitive check for correct answer highlighting
            const isCorrect = question.correct_answer && key.toLowerCase() === question.correct_answer.toLowerCase();
            return (
              <div
                key={key}
                className={`preview-option-item ${isCorrect ? 'correct' : ''}`}
              >
                <span className="preview-option-key">{key.toUpperCase()})</span>
                <div className="preview-option-value">
                  <RichTextRenderer rawText={value} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {question.explanation && question.explanation.trim() !== "" && (
        <div className="preview-explanation-section">
          <p className="mb-1"><strong>Explanation:</strong></p>
          <RichTextRenderer rawText={question.explanation} />
        </div>
      )}
    </div>
  );
};

export default QuestionPreviewCard;