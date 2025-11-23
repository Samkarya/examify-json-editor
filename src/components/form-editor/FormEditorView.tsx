import React, { useCallback } from 'react';
import { useQuestionsStore } from '../../store/questionsStore';
import QuestionFormFields from './QuestionFormFields';
import type { Question, OptionMap } from '../../types/Question';
import { FileQuestion } from 'lucide-react';

const FormEditorView: React.FC = () => {
  const currentEditId = useQuestionsStore((state) => state.currentEditId);
  const getQuestionById = useQuestionsStore((state) => state.getQuestionById);
  const updateQuestion = useQuestionsStore((state) => state.updateQuestion);
  const addQuestion = useQuestionsStore((state) => state.addQuestion); // For adding options logic if needed, but here we update

  const question = currentEditId ? getQuestionById(currentEditId) : undefined;

  const handleFormChange = useCallback((field: keyof Question | `option_key_${string}` | `option_value_${string}` | `correct_answer_option`, value: any) => {
    if (!currentEditId || !question) return;

    const updatedData: Partial<Question> = {};

    if (typeof field === 'string' && field.startsWith('option_key_')) {
      const oldKey = field.substring('option_key_'.length);
      const newOptions = { ...question.options } as OptionMap;
      if (oldKey !== value && value.trim() !== '') {
        const optionValue = newOptions[oldKey];
        delete newOptions[oldKey];
        newOptions[value.trim()] = optionValue;
        updatedData.options = newOptions;
        if (question.correct_answer === oldKey) {
          updatedData.correct_answer = value.trim();
        }
      }
    } else if (typeof field === 'string' && field.startsWith('option_value_')) {
      const key = field.substring('option_value_'.length);
      const newOptions = { ...question.options } as OptionMap;
      newOptions[key] = value;
      updatedData.options = newOptions;
    } else if (field === 'correct_answer') {
      updatedData.correct_answer = value;
    } else {
      (updatedData as any)[field] = value;
    }

    // Direct update to store (triggers re-render of Preview)
    updateQuestion(currentEditId, updatedData);
  }, [currentEditId, question, updateQuestion]);

  const handleAddOption = useCallback(() => {
    if (!currentEditId || !question) return;
    const newOptions = { ...question.options } as OptionMap;
    let nextChar = 'a';
    while (newOptions.hasOwnProperty(nextChar)) {
      nextChar = String.fromCharCode(nextChar.charCodeAt(0) + 1);
      if (nextChar.charCodeAt(0) > 'z'.charCodeAt(0)) {
        nextChar = `opt${Object.keys(newOptions).length + 1}`;
        break;
      }
    }
    newOptions[nextChar] = '';
    updateQuestion(currentEditId, { options: newOptions });
  }, [currentEditId, question, updateQuestion]);

  const handleRemoveOption = useCallback((keyToRemove: string) => {
    if (!currentEditId || !question) return;
    const newOptions = { ...question.options } as OptionMap;
    delete newOptions[keyToRemove];

    let newCorrect = question.correct_answer;
    if (question.correct_answer === keyToRemove) {
      newCorrect = Object.keys(newOptions)[0] || '';
    }
    updateQuestion(currentEditId, { options: newOptions, correct_answer: newCorrect });
  }, [currentEditId, question, updateQuestion]);

  if (!currentEditId || !question) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
        <div className="bg-light rounded-circle p-4 mb-3">
          <FileQuestion size={48} className="opacity-50" />
        </div>
        <h5>No Question Selected</h5>
        <p className="small">Select a question from the Explorer or create a new one.</p>
        <button
          className="btn btn-primary btn-sm mt-2"
          onClick={() => useQuestionsStore.getState().addQuestion({})}
        >
          Create New Question
        </button>
      </div>
    );
  }

  return (
    <div className="h-100 overflow-auto bg-white">
      <QuestionFormFields
        formData={question}
        onFormChange={handleFormChange}
        onAddOption={handleAddOption}
        onRemoveOption={handleRemoveOption}
        isEditing={true}
      />
    </div>
  );
};

export default FormEditorView;