// src/constants/index.ts
// src/constants/index.ts
import type { Question, TemplatesByCategory } from '../types/Question';

export const GITHUB_QUESTIONS_REPO_RAW_BASE_URL = 'https://raw.githubusercontent.com/Samkarya/online-exam-questions/main/';

export const APP_NAME = 'Examify React Editor';

// Using Partial<Question> for template data as 'id' will be generated dynamically
// and other fields might be pre-filled or left for the user.
export const TEMPLATES: TemplatesByCategory = {
  basic: [
    {
      name: 'Simple MCQ',
      icon: 'fa-list-ol',
      data: [
        {
          question_number: 1,
          question_text: 'What is 2+2?',
          options: { a: '3', b: '4', c: '5' },
          correct_answer: 'b',
          difficulty: 'Easy',
          subject: null,
          topic: null,
          section_id: null,
          explanation: null,
        },
      ],
    },
    {
      name: 'MCQ with Explanation',
      icon: 'fa-comment-alt',
      data: [
        {
          question_number: 1,
          question_text: 'Which planet is known as the Red Planet?',
          options: { a: 'Earth', b: 'Mars', c: 'Jupiter' },
          correct_answer: 'b',
          explanation:
            'Mars is known as the Red Planet due to iron oxide prevalent on its surface.',
          difficulty: 'Easy',
          subject: 'Science',
          topic: 'Astronomy',
          section_id: null,
        },
      ],
    },
  ],
  subjects: [
    {
      name: 'Math (Algebra)',
      icon: 'fa-calculator',
      data: [
        {
          question_number: 1,
          subject: 'Mathematics',
          topic: 'Algebra',
          difficulty: 'Medium',
          section_id: 'AlgebraBasics',
          question_text: 'If \\( 2x + 3 = 7 \\), what is \\( x \\)?',
          options: { a: '1', b: '2', c: '3', d: '4' },
          correct_answer: 'b',
          explanation:
            'To solve for \\( x \\):\n1. Subtract 3 from both sides: \\( 2x + 3 - 3 = 7 - 3 \\Rightarrow 2x = 4 \\).\n2. Divide by 2: \\( x = \\frac{4}{2} \\Rightarrow x = 2 \\).',
        },
      ],
    },  
    {
      name: 'Physics (Optics)',
      icon: 'fa-lightbulb',
      data: [
        {
          question_number: 1,
          subject: 'Physics',
          topic: 'Optics',
          difficulty: 'Medium',
          section_id: 'Optics-Fundamentals',
          question_text:
            'What phenomenon causes a rainbow, involving splitting of white light into its constituent colors?',
          options: {
            a: 'Reflection',
            b: 'Refraction',
            c: 'Dispersion',
            d: 'Diffraction',
          },
          correct_answer: 'c',
          explanation:
            'Rainbows are formed due to dispersion of sunlight by raindrops, which involves refraction and total internal reflection. Dispersion is the splitting of white light.',
        },
      ],
    },
  ],
  complex: [
    {
      name: 'LaTeX (Display Math)',
      icon: 'fa-square-root-alt',
      data: [
        {
          question_number: 1,
          difficulty: 'Hard',
          subject: 'Mathematics',
          topic: 'Calculus',
          section_id: null,
          question_text: 'What is the value of the integral $$\\int_0^1 x^2 dx$$ ?',
          options: { a: '1/3', b: '1/2', c: '1', d: '2/3' },
          correct_answer: 'a',
          explanation:
            'The integral is evaluated as: $$\\int_0^1 x^2 dx = \\left[ \\frac{x^3}{3} \\right]_0^1 = \\frac{1^3}{3} - \\frac{0^3}{3} = \\frac{1}{3}$$',
        },
      ],
    },
    {
      name: 'Code Block (Python)',
      icon: 'fa-code',
      data: [
        {
          question_number: 1,
          difficulty: 'Medium',
          subject: 'Programming',
          topic: 'Python',
          section_id: null,
          question_text:
            'What is the output of the following Python code?\n\n```python\ndef greet(name):\n  return f"Hello, {name}!"\n\nmessage = greet("Examify")\nprint(message)\n```',
          options: {
            a: 'Hello, name!',
            b: 'Hello, Examify!',
            c: 'Syntax Error',
            d: 'None',
          },
          correct_answer: 'b',
          explanation:
            'The function `greet` formats a string with the provided name. When called with "Examify", it returns "Hello, Examify!", which is then printed.',
        },
      ],
    },
    {
      name: 'Image Question (Relative Path)',
      icon: 'fa-image',
      data: [
        {
          question_number: 1,
          subject: 'General Knowledge',
          topic: 'Diagrams',
          difficulty: 'Easy',
          section_id: 'Visuals',
          question_text:
            "The following diagram shows a basic electric circuit. Identify component 'X'.\n\n![Circuit Diagram Example](assets/placeholder_circuit.png)",
          options: {
            a: 'Resistor',
            b: 'Capacitor',
            c: 'Battery',
            d: 'Switch',
          },
          correct_answer: 'd',
          explanation:
            "Component 'X' in a typical simple circuit diagram could be a switch. (Note: `assets/placeholder_circuit.png` should exist in the GitHub repo for this to render).",
        },
      ],
    },
    {
      name: 'Chemistry (LaTeX Equations)', // Renamed for clarity
      icon: 'fa-flask',
      data: [
        {
          question_number: 1,
          subject: 'Chemistry',
          topic: 'Reactions',
          difficulty: 'Medium',
          section_id: 'ChemEq',
          question_text:
            'What is the balanced chemical equation for the reaction of methane with oxygen to produce carbon dioxide and water?\nRepresent formulas and reactions using standard LaTeX math mode (e.g., $$CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O$$).',
          options: {
            a: '$$CH_4 + O_2 \\rightarrow CO_2 + H_2O$$', // Use \rightarrow for LaTeX
            b: '$$CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O$$',
            c: '$$2CH_4 + O_2 \\rightarrow 2CO_2 + H_2O$$',
            d: '$$CH_4 + O_2 \\rightarrow CO + 2H_2O$$',
          },
          correct_answer: 'b',
          explanation:
            'The balanced equation is $$CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O$$. This ensures the same number of atoms of each element on both sides of the reaction.',
        },
      ],
    },
  ],
};

export const INITIAL_QUESTION_DATA_EXAMPLE: Partial<Question>[] = [
  {
    question_number: 1,
    question_text: "Welcome to Examify! What is the capital of France?",
    options: { "a": "Berlin", "b": "Madrid", "c": "Paris", "d": "Rome" },
    correct_answer: "c",
    subject: "Geography",
    topic: "Capitals",
    difficulty: "Easy",
    explanation: "Paris is the capital and most populous city of France."
  }
];

export type MainView = 'form' | 'json' | 'preview';
export type SidebarTab = 'templates' | 'quickHelp';

export const DEFAULT_FILENAME = 'examify_questions.json';