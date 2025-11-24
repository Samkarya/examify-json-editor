import React, { type ChangeEvent, useEffect, useRef } from 'react';
import { Form, Row, Col, InputGroup, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import type { Question, OptionMap } from '../../types/Question';
import { Info, Plus, Trash2, X } from 'lucide-react';

interface QuestionFormFieldsProps {
  formData: Partial<Question>;
  onFormChange: (field: keyof Question | `option_key_${string}` | `option_value_${string}` | `correct_answer_option`, value: any) => void;
  onAddOption: () => void;
  onRemoveOption: (optionKey: string) => void;
  isEditing: boolean;
}

const HelpTooltip: React.FC<{ message: string, children: React.ReactElement }> = ({ message, children }) => (
  <OverlayTrigger placement="top" overlay={<Tooltip id={`tooltip-${Math.random()}`}>{message}</Tooltip>}>
    {children}
  </OverlayTrigger>
);

const QuestionFormFields: React.FC<QuestionFormFieldsProps> = ({
  formData,
  onFormChange,
  onAddOption,
  onRemoveOption,
}) => {
  const {
    question_number,
    difficulty,
    subject,
    topic,
    section_id,
    question_text,
    options = { a: '', b: '' },
    correct_answer,
    explanation,
  } = formData;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }
    onFormChange(name as keyof Question, processedValue);
  };

  const handleOptionKeyChange = (oldKey: string, newKey: string) => {
    onFormChange(`option_key_${oldKey}` as any, newKey);
  };

  const handleOptionValueChange = (key: string, value: string) => {
    onFormChange(`option_value_${key}` as any, value);
  };

  const questionTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (questionTextareaRef.current) {
      questionTextareaRef.current.style.height = 'auto';
      questionTextareaRef.current.style.height = `${questionTextareaRef.current.scrollHeight}px`;
    }
  }, [question_text]);

  return (
    <Form className="p-3">
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group controlId="questionNumber">
            <Form.Label className="small fw-bold text-secondary">Question #</Form.Label>
            <InputGroup size="sm">
              <Form.Control
                type="number"
                name="question_number"
                value={question_number || ''}
                onChange={handleInputChange}
                min="1"
                className="bg-input border-0"
              />
            </InputGroup>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="difficulty">
            <Form.Label className="small fw-bold text-secondary">Difficulty</Form.Label>
            <Form.Select
              name="difficulty"
              value={difficulty || ''}
              onChange={handleInputChange}
              size="sm"
              className="bg-input border-0"
            >
              <option value="">Not specified</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group controlId="subject">
            <Form.Label className="small fw-bold text-secondary">Subject</Form.Label>
            <Form.Control
              type="text"
              name="subject"
              placeholder="Mathematics"
              value={subject || ''}
              onChange={handleInputChange}
              size="sm"
              className="bg-input border-0"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="topic">
            <Form.Label className="small fw-bold text-secondary">Topic</Form.Label>
            <Form.Control
              type="text"
              name="topic"
              placeholder="Calculus"
              value={topic || ''}
              onChange={handleInputChange}
              size="sm"
              className="bg-input border-0"
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-4" controlId="questionText">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <Form.Label className="small fw-bold text-secondary mb-0">Question Text</Form.Label>
          <HelpTooltip message="Supports LaTeX ($...$), Markdown, and Code Blocks.">
            <Info size={14} className="text-muted cursor-pointer" />
          </HelpTooltip>
        </div>
        <Form.Control
          as="textarea"
          name="question_text"
          rows={4}
          value={question_text || ''}
          onChange={handleInputChange}
          ref={questionTextareaRef}
          className="bg-input border-0 font-monospace"
          style={{ minHeight: '100px', fontSize: '0.9rem' }}
        />
      </Form.Group>

      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Form.Label className="small fw-bold text-secondary mb-0">Options</Form.Label>
          <Button variant="link" size="sm" className="p-0 text-primary text-decoration-none" onClick={onAddOption}>
            <Plus size={14} className="me-1" /> Add Option
          </Button>
        </div>

        <div className="d-flex flex-column gap-2">
          {Object.entries(options).map(([key, value]) => (
            <div key={key} className="d-flex align-items-start gap-2 bg-white p-2 rounded border border-light shadow-sm">
              <div className="pt-1">
                <Form.Check
                  type="radio"
                  name="correct_answer_option"
                  checked={correct_answer === key}
                  onChange={() => onFormChange('correct_answer', key)}
                  title="Mark as correct"
                />
              </div>
              <div style={{ width: '60px' }}>
                <Form.Control
                  type="text"
                  value={key}
                  onChange={(e) => handleOptionKeyChange(key, e.target.value)}
                  placeholder="Key"
                  size="sm"
                  className="text-center fw-bold border-0 bg-light"
                />
              </div>
              <div className="flex-grow-1">
                <Form.Control
                  as="textarea"
                  rows={1}
                  value={value}
                  onChange={(e) => handleOptionValueChange(key, e.target.value)}
                  placeholder="Option text..."
                  size="sm"
                  className="border-0 p-0"
                  style={{ resize: 'none', boxShadow: 'none' }}
                />
              </div>
              <Button
                variant="link"
                size="sm"
                className="text-danger p-0 opacity-50 hover-opacity-100"
                onClick={() => onRemoveOption(key)}
                disabled={Object.keys(options).length <= 2}
              >
                <X size={16} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Form.Group className="mb-3" controlId="explanation">
        <Form.Label className="small fw-bold text-secondary">Explanation</Form.Label>
        <Form.Control
          as="textarea"
          name="explanation"
          rows={3}
          placeholder="Explain the answer..."
          value={explanation || ''}
          onChange={handleInputChange}
          className="bg-input border-0"
          style={{ fontSize: '0.9rem' }}
        />
      </Form.Group>
    </Form>
  );
};

export default QuestionFormFields;