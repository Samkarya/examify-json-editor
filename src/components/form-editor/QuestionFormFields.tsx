// src/components/form-editor/QuestionFormFields.tsx
import React, { type ChangeEvent, useEffect, useRef } from 'react';
import { Form, Row, Col, InputGroup, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import type { Question, OptionMap } from '../../types/Question';

interface QuestionFormFieldsProps {
  formData: Partial<Question>; // Using Partial as it's for both new (empty) and existing questions
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
  isEditing,
}) => {
  const {
    question_number,
    difficulty,
    subject,
    topic,
    section_id,
    question_text,
    options = { a: '', b: ''}, // Default to ensure options is always an object
    correct_answer,
    explanation,
  } = formData;

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value); // Allow empty string for clearing
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
    <Form id="questionFormInternal"> {/* Added id for potential form reset outside React */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group controlId="questionNumber">
            <Form.Label className="required-field-label">Question Number</Form.Label>
            <InputGroup>
              <Form.Control
                type="number"
                name="question_number"
                value={question_number || ''}
                onChange={handleInputChange}
                min="1"
                required
                isInvalid={!question_number || question_number <= 0}
              />
              <HelpTooltip message="Must be a positive integer. Should be sequential (auto-suggested for new questions) and unique.">
                <InputGroup.Text><i className="fa fa-info-circle help-tooltip-icon"></i></InputGroup.Text>
              </HelpTooltip>
            </InputGroup>
            <Form.Control.Feedback type="invalid">
                Please provide a valid, positive question number.
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="difficulty">
            <Form.Label>Difficulty</Form.Label>
            <Form.Select
              name="difficulty"
              value={difficulty || ''}
              onChange={handleInputChange}
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
            <Form.Label>Subject</Form.Label>
            <Form.Control
              type="text"
              name="subject"
              placeholder="e.g., Mathematics"
              value={subject || ''}
              onChange={handleInputChange}
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group controlId="topic">
            <Form.Label>Topic</Form.Label>
            <Form.Control
              type="text"
              name="topic"
              placeholder="e.g., Calculus"
              value={topic || ''}
              onChange={handleInputChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3" controlId="sectionId">
        <Form.Label>Section ID</Form.Label>
        <Form.Control
          type="text"
          name="section_id"
          placeholder="e.g., Section A, Quant"
          value={section_id || ''}
          onChange={handleInputChange}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="questionText">
        <Form.Label className="required-field-label">Question Text</Form.Label>
        <InputGroup>
            <Form.Control
                as="textarea"
                name="question_text"
                rows={3} // Initial rows, will auto-expand
                value={question_text || ''}
                onChange={handleInputChange}
                required
                isInvalid={!question_text || question_text.trim() === ''}
                ref={questionTextareaRef}
                style={{overflowY: 'hidden'}} // To prevent scrollbar during auto-height
            />
            <HelpTooltip message="Supports LaTeX (e.g., $\alpha$), Markdown images (![alt](url or path like 'ExamName/assets/image.png')), and code blocks (```lang ... ```).">
                <InputGroup.Text className="align-items-start pt-2"><i className="fa fa-info-circle help-tooltip-icon"></i></InputGroup.Text>
            </HelpTooltip>
        </InputGroup>
         <Form.Control.Feedback type="invalid">
            Question text cannot be empty.
        </Form.Control.Feedback>
        <div className="input-help-text small mt-1">
          <strong>Format Tips:</strong> Inline math: <code>$...$</code>, Display math: <code>$$...$$</code>. Images: <code>![Alt](URL)</code> or <code>![Alt](RelativePath/image.png)</code>. Code: <code>```language ... ```</code>
        </div>
      </Form.Group>

      <div className="mb-3">
        <Form.Label className="required-field-label">Options</Form.Label>
        <span className="input-help-text ms-2">(Minimum 2 options required)</span>
        <div className="options-modal-container mt-2"> {/* Class from global.css */}
          {Object.entries(options).map(([key, value]) => (
            <Row key={key} className="option-row mb-2 gx-2 align-items-center"> {/* gx-2 for gutter */}
              <Col xs="auto" className="d-flex align-items-center">
                <Form.Check
                  type="radio"
                  name="correct_answer_option"
                  id={`correct_answer_${key}`}
                  value={key}
                  checked={correct_answer === key}
                  onChange={() => onFormChange('correct_answer', key)}
                  className="option-radio-input me-1" 
                  aria-label={`Mark option ${key} as correct`}
                />
              </Col>
              <Col style={{maxWidth: '100px'}}>
                <Form.Control
                  type="text"
                  className="option-key-input"
                  value={key}
                  onChange={(e) => handleOptionKeyChange(key, e.target.value)}
                  placeholder="Key"
                  size="sm"
                  required
                  isInvalid={!key || key.trim() === ''}
                />
              </Col>
              <Col>
                <Form.Control
                  as="textarea"
                  rows={1} // Will auto-expand slightly
                  className="option-value-textarea"
                  value={value}
                  onChange={(e) => handleOptionValueChange(key, e.target.value)}
                  placeholder="Option text (supports rich content)"
                  size="sm"
                  required
                  isInvalid={!value || value.trim() === ''}
                />
              </Col>
              <Col xs="auto">
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onRemoveOption(key)}
                  disabled={Object.keys(options).length <= 2}
                  title="Remove this option"
                >
                  <i className="fa fa-times"></i>
                </Button>
              </Col>
            </Row>
          ))}
        </div>
        <Button variant="outline-primary" size="sm" onClick={onAddOption} className="mt-1">
          <i className="fa fa-plus me-1"></i> Add Option
        </Button>
      </div>

      <Form.Group className="mb-3" controlId="explanation">
        <Form.Label>Explanation</Form.Label>
        <Form.Control
          as="textarea"
          name="explanation"
          rows={3}
          placeholder="Provide detailed explanation (recommended). Supports same formatting as question text."
          value={explanation || ''}
          onChange={handleInputChange}
        />
        <div className="input-help-text small mt-1">
          (Highly Recommended) Add a detailed explanation. Supports the same rich content.
        </div>
      </Form.Group>
    </Form>
  );
};

export default QuestionFormFields;