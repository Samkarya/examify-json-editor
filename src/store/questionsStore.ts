// src/store/questionsStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Question, QuestionsData } from '../types/Question';
import { INITIAL_QUESTION_DATA_EXAMPLE, type MainView, type SidebarTab, DEFAULT_FILENAME } from '../constants';
import { v4 as uuidv4 } from 'uuid'; // We'll need to install uuid
import { validateQuestionsData, validateRawJsonString, formatValidationErrors } from '../services/validationService';
// Import the toast library
import { toast } from 'react-toastify'; // Make sure to install react-toastify package

export interface QuestionsState {
  questions: QuestionsData;
  currentEditId: string | null;
  activeMainView: MainView;
  isSidebarCollapsed: boolean;
  activeSidebarTab: SidebarTab;
  isLoading: boolean;
  loadingMessage: string;
  jsonEditorContent: string;
  exportFileName: string;
  validationErrors: string[]; // For form editor status panel
  isQuestionModalOpen: boolean; // New state for modal visibility
  isImportModalOpen: boolean;
  isExportModalOpen: boolean;
  isHelpModalOpen: boolean;

  // Actions
  setQuestions: (questions: QuestionsData) => void;
  addQuestion: (questionData: Partial<Question>) => string; // Returns the new question's ID
  updateQuestion: (id: string, updatedQuestionData: Partial<Question>) => void;
  deleteQuestion: (id: string) => void;
  loadTemplateQuestions: (templateQuestions: Partial<Question>[], mode: 'replace' | 'append') => void;
  setCurrentEditId: (id: string | null) => void;
  setActiveMainView: (view: MainView) => void;
  toggleSidebar: () => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setJsonEditorContent: (content: string) => void;
  updateJsonEditorContentFromState: () => void; // Syncs questions to JSON editor
  updateStateFromJsonEditorContent: () => void; // Syncs JSON editor to questions (with validation)
  setExportFileName: (name: string) => void;
  clearValidationErrors: () => void;
  addValidationError: (error: string) => void;
  setValidationErrors: (errors: string[]) => void;
  getQuestionById: (id: string) => Question | undefined;
  getNextQuestionNumber: () => number;
  generateNewQuestionId: () => string;
  duplicateQuestion: (id: string) => void;
  sortQuestionsByNumber: () => void;
  setQuestionModalOpen: (isOpen: boolean) => void; // New action
  setImportModalOpen: (isOpen: boolean) => void;
  setExportModalOpen: (isOpen: boolean) => void;
  setHelpModalOpen: (isOpen: boolean) => void;
  triggerFormValidation: () => boolean; // Returns true if valid
  triggerJsonEditorValidation: () => boolean; // Returns true if valid
}

const initialJsonEditorContent = JSON.stringify(
  INITIAL_QUESTION_DATA_EXAMPLE.map(q => ({
    ...q,
    id: uuidv4(), // Add ID to initial example
  })),
  null,
  2
);


export const useQuestionsStore = create<QuestionsState>()(
  devtools(
    persist(
      (set, get) => ({
        questions: INITIAL_QUESTION_DATA_EXAMPLE.map(q => ({
            id: uuidv4(), // Ensure each initial question has a unique ID
            question_number: q.question_number || 1,
            question_text: q.question_text || '',
            options: q.options || { a: '', b: '' },
            correct_answer: q.correct_answer || 'a',
            subject: q.subject,
            topic: q.topic,
            explanation: q.explanation,
            difficulty: q.difficulty,
            section_id: q.section_id,
        })),
        currentEditId: null,
        activeMainView: 'form',
        isSidebarCollapsed: false,
        activeSidebarTab: 'templates',
        isLoading: false,
        loadingMessage: 'Loading...',
        jsonEditorContent: initialJsonEditorContent,
        exportFileName: DEFAULT_FILENAME,
        validationErrors: [],
        isQuestionModalOpen: false, // Add initial state
        isImportModalOpen: false,
        isExportModalOpen: false,
        isHelpModalOpen: false,

        setQuestions: (newQuestions) => {
          // Ensure all incoming questions have an ID
          const questionsWithIds = newQuestions.map(q => ({
            ...q,
            id: q.id || uuidv4(),
          }));
          set({ questions: questionsWithIds }, false, 'setQuestions');
          get().updateJsonEditorContentFromState(); // Keep editor in sync
        },
        addQuestion: (questionData) => {
          const newId = questionData.id || get().generateNewQuestionId();
          const nextQNum = get().getNextQuestionNumber();
          const newQuestion: Question = {
            id: newId,
            question_number: questionData.question_number || nextQNum,
            question_text: questionData.question_text || '',
            options: questionData.options || { a: 'Option A', b: 'Option B' },
            correct_answer: questionData.correct_answer || Object.keys(questionData.options || {a:''})[0] || 'a',
            subject: questionData.subject || null,
            topic: questionData.topic || null,
            explanation: questionData.explanation || null,
            difficulty: questionData.difficulty || null,
            section_id: questionData.section_id || null,
          };
          set(
            (state) => ({ questions: [...state.questions, newQuestion] }),
            false,
            'addQuestion'
          );
          get().sortQuestionsByNumber();
          get().updateJsonEditorContentFromState();
          return newId;
        },
        updateQuestion: (id, updatedQuestionData) => {
          set(
            (state) => ({
              questions: state.questions.map((q) =>
                q.id === id ? { ...q, ...updatedQuestionData, id } : q
              ),
            }),
            false,
            'updateQuestion'
          );
          get().sortQuestionsByNumber();
          get().updateJsonEditorContentFromState();
        },
        deleteQuestion: (id) => {
          set(
            (state) => ({
              questions: state.questions.filter((q) => q.id !== id),
            }),
            false,
            'deleteQuestion'
          );
          get().updateJsonEditorContentFromState();
        },
        loadTemplateQuestions: (templateQuestions, mode) => {
          const newQuestionsFromTemplate = templateQuestions.map((tq, index) => {
            const baseId = get().generateNewQuestionId();
            let newQuestionNumber: number;

            if (mode === 'append') {
              newQuestionNumber = get().getNextQuestionNumber() + index;
            } else {
              newQuestionNumber = tq.question_number || (index + 1);
            }

            return {
              id: baseId,
              question_number: newQuestionNumber, // Use the calculated newQuestionNumber
              question_text: tq.question_text || '',
              options: tq.options || { a: 'Opt A', b: 'Opt B' },
              correct_answer: tq.correct_answer || 'a', // Default correct answer if not in template
              subject: tq.subject || null,
              topic: tq.topic || null,
              explanation: tq.explanation || null,
              difficulty: tq.difficulty || null,
              section_id: tq.section_id || null,
            } as Question;
          });

          if (mode === 'replace') {
            set({ questions: newQuestionsFromTemplate }, false, 'loadTemplateQuestions_replace');
          } else {
            set(
              (state) => ({
                questions: [...state.questions, ...newQuestionsFromTemplate],
              }),
              false,
              'loadTemplateQuestions_append'
            );
          }
          get().sortQuestionsByNumber();
          get().updateJsonEditorContentFromState();
        },
        setCurrentEditId: (id) => set({ currentEditId: id }, false, 'setCurrentEditId'),
        setActiveMainView: (view) => set({ activeMainView: view }, false, 'setActiveMainView'),
        toggleSidebar: () =>
          set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }), false, 'toggleSidebar'),
        setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }, false, 'setActiveSidebarTab'),
        setLoading: (isLoading, message = 'Loading...') =>
          set({ isLoading, loadingMessage: message }, false, 'setLoading'),
        setJsonEditorContent: (content) => set({ jsonEditorContent: content }, false, 'setJsonEditorContent'),
        updateJsonEditorContentFromState: () => {
          try {
            // Omit client-side 'id' for export/JSON editor view
            const questionsForJson = get().questions.map(({ id, ...rest }) => rest);
            const content = JSON.stringify(questionsForJson, null, 2);
            set({ jsonEditorContent: content }, false, 'updateJsonEditorContentFromState');
          } catch (error) {
            console.error("Failed to stringify questions for JSON editor:", error);
            // Potentially set an error state or log to UI
          }
        },
        updateStateFromJsonEditorContent: () => {
          const { jsonEditorContent, setLoading, setQuestions: setStoreQuestions } = get();
          setLoading(true, "Parsing and validating JSON from editor...");

          // Using a timeout to allow UI to update with loading state before heavy processing
          setTimeout(() => {
            const { data: parsedQuestions, errors: validationServiceErrors } = validateRawJsonString(jsonEditorContent);

            if (validationServiceErrors.length > 0 || !parsedQuestions) {
              // Instead of using JSX in store, create a formatted message string
              toast.error(
                `JSON from editor is invalid. Cannot sync to Form. Issues: ${formatValidationErrors(validationServiceErrors).join(', ')}`, 
                { autoClose: 10000 }
              );
              setLoading(false);
              return; 
            }

            const questionsWithClientIds: Question[] = parsedQuestions.map(q => ({
              ...q,
              id: uuidv4(), // Assign new client IDs
              subject: q.subject !== undefined ? q.subject : null,
              topic: q.topic !== undefined ? q.topic : null,
              explanation: q.explanation !== undefined ? q.explanation : null,
              difficulty: q.difficulty !== undefined ? q.difficulty : '',
              section_id: q.section_id !== undefined ? q.section_id : null,
            }));
            
            setStoreQuestions(questionsWithClientIds); // This also updates jsonEditorContent via its own internal sync
            toast.success("JSON content successfully synced to Form Editor!");
            setLoading(false);
          }, 50); // Short timeout
        },
        setExportFileName: (name) => set({ exportFileName: name}, false, 'setExportFileName'),
        clearValidationErrors: () => set({ validationErrors: [] }, false, 'clearValidationErrors'),
        addValidationError: (error) => set(state => ({ validationErrors: [...state.validationErrors, error]}), false, 'addValidationError'),
        setValidationErrors: (errors) => set({ validationErrors: errors}, false, 'setValidationErrors'),
        getQuestionById: (id: string) => {
          return get().questions.find(q => q.id === id);
        },
        getNextQuestionNumber: () => {
          const questions = get().questions;
          if (questions.length === 0) return 1;
          return Math.max(0, ...questions.map(q => q.question_number)) + 1;
        },
        generateNewQuestionId: () => uuidv4(),
        duplicateQuestion: (idToDuplicate: string) => {
            const originalQuestion = get().getQuestionById(idToDuplicate);
            if (!originalQuestion) return;

            const duplicatedQuestionData: Partial<Question> = {
                ...originalQuestion, // Spread all properties
                id: get().generateNewQuestionId(), // New unique ID
                question_number: get().getNextQuestionNumber(), // New question number
                question_text: `(Copy of Q#${originalQuestion.question_number}) ${originalQuestion.question_text}`,
            };
            delete duplicatedQuestionData._isDirty; // Remove internal flags if any

            get().addQuestion(duplicatedQuestionData); // addQuestion handles sorting and editor update
        },
        sortQuestionsByNumber: () => {
            set(state => {
                const sortedQuestions = [...state.questions].sort((a,b) => a.question_number - b.question_number);
                return { questions: sortedQuestions };
            }, false, 'sortQuestionsByNumber');
            // No need to call updateJsonEditorContentFromState here as individual actions (add, update, loadTemplate) already do.
        },
        setQuestionModalOpen: (isOpen) => set({ isQuestionModalOpen: isOpen, currentEditId: isOpen ? get().currentEditId : null }, false, 'setQuestionModalOpen'),
        setImportModalOpen: (isOpen) => set({ isImportModalOpen: isOpen }, false, 'setImportModalOpen'),
        setExportModalOpen: (isOpen) => set({ isExportModalOpen: isOpen }, false, 'setExportModalOpen'),
        setHelpModalOpen: (isOpen) => set({ isHelpModalOpen: isOpen }, false, 'setHelpModalOpen'),
        triggerFormValidation: () => {
            const { questions, setValidationErrors } = get();
            const errors = validateQuestionsData(questions);
            setValidationErrors(formatValidationErrors(errors));
            return errors.length === 0;
        },
        triggerJsonEditorValidation: () => {
            const { jsonEditorContent } = get();
            // This validation only checks structure. The JsonEditorView handles displaying editor-specific status.
            const { errors } = validateRawJsonString(jsonEditorContent);
            // We might want a global error display or rely on JsonEditorView's status.
            // For now, just return validity.
            return errors.length === 0;
        },
      }),
      {
        name: 'examify-questions-storage', // name of the item in the storage (must be unique)
        // partialize: (state) => ({ questions: state.questions }), // Optionally persist only parts of the store
      }
    )
  )
);