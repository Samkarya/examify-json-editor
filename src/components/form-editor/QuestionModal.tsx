// src/components/form-editor/QuestionModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useQuestionsStore } from '../../store/questionsStore';
import type { Question, OptionMap } from '../../types/Question';
import QuestionFormFields from './QuestionFormFields';
import { toast } from 'react-toastify';

const DEFAULT_NEW_QUESTION: Partial<Question> = {
  question_number: 1,
  question_text: '',
  options: { a: '', b: '' }, // Start with two default empty options
  correct_answer: 'a', // Default to first option being correct
  difficulty: '',
  subject: '',
  topic: '',
  explanation: '',
  section_id: '',
};

const QuestionModal: React.FC = () => {
  const isOpen = useQuestionsStore((state) => state.isQuestionModalOpen);
  const setOpen = useQuestionsStore((state) => state.setQuestionModalOpen);
  const currentEditId = useQuestionsStore((state) => state.currentEditId);
  const getQuestionById = useQuestionsStore((state) => state.getQuestionById);
  const addQuestion = useQuestionsStore((state) => state.addQuestion);
  const updateQuestion = useQuestionsStore((state) => state.updateQuestion);
  const getNextQuestionNumber = useQuestionsStore((state) => state.getNextQuestionNumber);
  const questions = useQuestionsStore((state) => state.questions); // For checking duplicate q_number

  const [formData, setFormData] = useState<Partial<Question>>(DEFAULT_NEW_QUESTION);
  const [isEditing, setIsEditing] = useState(false);
  const [formValidated, setFormValidated] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (currentEditId) {
        const questionToEdit = getQuestionById(currentEditId);
        if (questionToEdit) {
          setFormData({ ...questionToEdit });
          setIsEditing(true);
        } else {
          // Should not happen if currentEditId is valid
          console.error("Question to edit not found, resetting form.");
          setFormData({ ...DEFAULT_NEW_QUESTION, question_number: getNextQuestionNumber() });
          setIsEditing(false);
        }
      } else {
        // Adding new question
        setFormData({ ...DEFAULT_NEW_QUESTION, question_number: getNextQuestionNumber() });
        setIsEditing(false);
      }
      setFormValidated(false); // Reset validation state on open
    }
  }, [isOpen, currentEditId, getQuestionById, getNextQuestionNumber]);

  const handleClose = () => {
    setOpen(false);
    // currentEditId is reset by the store action when modal closes
  };

  const handleFormChange = useCallback((field: keyof Question | `option_key_${string}` | `option_value_${string}` | `correct_answer_option`, value: any) => {
    setFormData(prev => {
      const newFormData = { ...prev };
      if (typeof field === 'string' && field.startsWith('option_key_')) {
        const oldKey = field.substring('option_key_'.length);
        const newOptions = { ...newFormData.options } as OptionMap;
        if (oldKey !== value && value.trim() !== '') { // Prevent duplicate keys by changing
            const optionValue = newOptions[oldKey];
            delete newOptions[oldKey];
            newOptions[value.trim()] = optionValue;
            newFormData.options = newOptions;
            if (newFormData.correct_answer === oldKey) {
                newFormData.correct_answer = value.trim();
            }
        } else if (value.trim() === '' && newOptions.hasOwnProperty(oldKey)){
            // Allow key to be temporarily empty during typing but don't process if it results in empty
        }
      } else if (typeof field === 'string' && field.startsWith('option_value_')) {
        const key = field.substring('option_value_'.length);
        const newOptions = { ...newFormData.options } as OptionMap;
        newOptions[key] = value;
        newFormData.options = newOptions;
      } else if (field === 'correct_answer') { // This is when a radio button is clicked for option
        newFormData.correct_answer = value;
      } else {
        (newFormData as any)[field] = value;
      }
      return newFormData;
    });
  }, []);

  const handleAddOption = () => {
    setFormData(prev => {
      const newOptions = { ...prev.options } as OptionMap;
      let nextChar = 'a';
      // Find next available character key (simple approach)
      while(newOptions.hasOwnProperty(nextChar)) {
        nextChar = String.fromCharCode(nextChar.charCodeAt(0) + 1);
        if (nextChar.charCodeAt(0) > 'z'.charCodeAt(0)) { // fallback if > z
            nextChar = `opt${Object.keys(newOptions).length + 1}`;
            break;
        }
      }
      newOptions[nextChar] = '';
      return { ...prev, options: newOptions };
    });
  };

  const handleRemoveOption = (optionKeyToRemove: string) => {
    setFormData(prev => {
      const newOptions = { ...prev.options } as OptionMap;
      if (Object.keys(newOptions).length <= 2) {
        toast.warn("Minimum 2 options required.");
        return prev;
      }
      delete newOptions[optionKeyToRemove];
      let newCorrectAnswer = prev.correct_answer;
      if (prev.correct_answer === optionKeyToRemove) {
        // If deleted option was correct, set first available option as correct
        newCorrectAnswer = Object.keys(newOptions)[0] || '';
      }
      return { ...prev, options: newOptions, correct_answer: newCorrectAnswer };
    });
  };

  const validateForm = (): boolean => {
    const currentData = formData; // Use current formData from state
    const errors: string[] = [];

    if (!currentData.question_number || currentData.question_number <= 0) {
      errors.push("Question Number must be a positive integer.");
    } else {
        // Check for duplicate question_number, excluding the current question if editing
        const otherQuestions = questions.filter(q => isEditing ? q.id !== currentEditId : true);
        if (otherQuestions.some(q => q.question_number === currentData.question_number)) {
            errors.push(`Question Number ${currentData.question_number} is already in use.`);
        }
    }

    if (!currentData.question_text || currentData.question_text.trim() === '') {
      errors.push("Question Text is required.");
    }
    if (!currentData.options || Object.keys(currentData.options).length < 2) {
      errors.push("At least two options are required.");
    } else {
      for (const key in currentData.options) {
        if (!key.trim()) errors.push("Option key cannot be empty.");
        if (!currentData.options[key].trim()) errors.push(`Value for option "${key}" cannot be empty.`);
      }
      const optionKeys = Object.keys(currentData.options);
      if (new Set(optionKeys).size !== optionKeys.length) {
          errors.push("Option keys must be unique.");
      }
    }
    if (!currentData.correct_answer || !currentData.options || !currentData.options.hasOwnProperty(currentData.correct_answer)) {
      errors.push("A valid correct answer must be selected from the options.");
    }
    // Add other field specific validations if needed (e.g. subject format if not just string)

    if (errors.length > 0) {
      toast.error(<div>Validation Errors:<ul>{errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>, { autoClose: 7000 });
      return false;
    }
    setFormValidated(true);
    return true;
  };


  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!validateForm()) {
        setFormValidated(true); // To show bootstrap validation states if logic is tied to it
        return;
    }
    
    // Ensure optional fields are null if empty string, for cleaner JSON
    const processedData = { ...formData };
    (Object.keys(processedData) as Array<keyof Question>).forEach(key => {
        if (['subject', 'topic', 'explanation', 'difficulty', 'section_id'].includes(key)) {
            if (processedData[key] === '') {
                (processedData as any)[key] = null;
            }
        }
    });


    if (isEditing && currentEditId) {
      updateQuestion(currentEditId, processedData);
      toast.success(`Question ${processedData.question_number} updated successfully!`);
    } else {
      addQuestion(processedData);
      toast.success(`Question ${processedData.question_number} added successfully!`);
    }
    handleClose();
  };

  return (
    <Modal show={isOpen} onHide={handleClose} size="lg" backdrop="static" scrollable>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? `Edit Question (Q# ${formData.question_number || ''})` : 'Add New Question'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* The Form element is needed for Bootstrap's validation styling and submit handling */}
        <Form noValidate validated={formValidated} onSubmit={handleSubmit} id="questionModalForm">
            <QuestionFormFields
                formData={formData}
                onFormChange={handleFormChange}
                onAddOption={handleAddOption}
                onRemoveOption={handleRemoveOption}
                isEditing={isEditing}
            />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" form="questionModalForm"> {/* Trigger submit on the inner form */}
          {isEditing ? 'Save Changes' : 'Save Question'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuestionModal;