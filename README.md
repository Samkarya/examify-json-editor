
# ExamOven JSON Editor (React Version)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A user-friendly, feature-rich JSON editor designed for creating and managing exam questions in the ExamOven JSON format. This React-based editor provides a form-based interface for easy question creation, a raw JSON editor for advanced users, live preview capabilities, and robust validation.

**Live Demo:** [https://samkarya.github.io/examify-json-editor/](https://samkarya.github.io/examify-json-editor/)

This project is an evolution of an earlier vanilla HTML, CSS, and JavaScript version, now rebuilt with modern web technologies for improved robustness, maintainability, and user experience.

## Features

*   **Intuitive Form Editor:** Easily create and edit questions using a structured form, with fields for question text, options, correct answers, subject, topic, difficulty, and explanations. No direct JSON knowledge required for basic use.
*   **Advanced Raw JSON Editor:** For power users, a CodeMirror-based editor provides direct access to the JSON with syntax highlighting, line numbers, and JSON linting.
*   **Live Preview:** Instantly see how questions will render, including:
    *   Mathematical notation (LaTeX via KaTeX)
    *   Markdown for images (with support for relative paths from a designated GitHub repository)
    *   Syntax-highlighted code blocks (via Prism.js)
    *   Chemical equations
*   **Comprehensive Validation:**
    *   Validates against the ExamOven question schema (required fields, data types, option consistency, unique question numbers, sequential numbering).
    *   Clear error messages to guide users in fixing issues.
    *   Case-insensitive checking for `correct_answer` against option keys for better usability.
*   **Templates:** Start quickly with pre-defined question structures for various types (basic MCQ, subject-specific, complex content with LaTeX/code/images).
*   **Import/Export:**
    *   Import existing ExamOven JSON files (via file upload or pasting raw JSON).
    *   Export questions to a `.json` file, with options for pretty-printing.
*   **Rich Text Support:** Question text, options, and explanations support rich content formatting.
*   **Responsive Design:** Adapts to different screen sizes for use on desktops, tablets, and mobile devices.
*   **Client-Side State Management:** Uses Zustand for efficient and predictable state management.
*   **Resizable Layout:** Customizable workspace with resizable panels for Form Editor, JSON Editor, and Preview.
*   **Modern Tech Stack:** Built with React, TypeScript, Vite, and Bootstrap.

## Tech Stack

*   **Frontend Framework:** [React](https://reactjs.org/) (with Hooks)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
*   **UI Components:** [React-Bootstrap](https://react-bootstrap.github.io/)
*   **Icons:** [Lucide React](https://lucide.dev/)
*   **Animations:** [Framer Motion](https://www.framer.com/motion/)
*   **Layout:** [React Resizable Panels](https://github.com/bvaughn/react-resizable-panels)
*   **JSON Editor:** [CodeMirror 6](https://codemirror.net/) (via `@uiw/react-codemirror`)
*   **Markdown Parsing:** [React Markdown](https://github.com/remarkjs/react-markdown)
*   **HTML Sanitization:** [Rehype Sanitize](https://github.com/rehypejs/rehype-sanitize)
*   **LaTeX Rendering:** [KaTeX](https://katex.org/)
*   **Syntax Highlighting (Preview):** [Prism.js](https://prismjs.com/)
*   **Notifications:** [React Toastify](https://fkhadra.github.io/react-toastify/)
*   **Styling:** Global CSS (inspired by original project) & Bootstrap
*   **Unique IDs:** [UUID](https://github.com/uuidjs/uuid)
*   **Deployment:** [GitHub Pages](https://pages.github.com/) (via GitHub Actions)

## Project Structure

```
 examify-json-editor/
    ├── public/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── common/
    │   │   ├── form-editor/
    │   │   ├── json-editor/
    │   │   ├── layout/
    │   │   ├── modals/
    │   │   └── preview/
    │   ├── constants/
    │   ├── services/      (e.g., validationService.ts)
    │   ├── store/         (e.g., questionsStore.ts for Zustand)
    │   ├── styles/        (e.g., global.css)
    │   ├── types/         (e.g., Question.ts)
    │   ├── App.tsx
    │   └── main.tsx
    ├── .eslintrc.cjs
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── vite.config.ts
```

## Getting Started

### Prerequisites

*   Node.js (v18.x or v20.x recommended)
*   npm or yarn

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    # If cloning the entire 'examify-json-editor' repository
    git clone https://github.com/Samkarya/examify-json-editor.git
    cd examify-json-editor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:5173` (or another port if 5173 is in use).

### Building for Production

To create an optimized production build:

```bash
npm run build
```
The built files will be located in the `dist` directory.

### Deployment

This project is configured for deployment to GitHub Pages.

## Usage Guide

1.  **Interface Overview:**
    *   **Navbar:** Provides global actions like Import, Export, Validate All, and Help.
    *   **Sidebar:** Contains Tools & Templates (for quickly adding pre-structured questions) and a Quick Help section. Can be toggled.
    *   **Main Content Area:** Features three tabs:
        *   **Form Editor:** For creating/editing questions with a user-friendly form.
        *   **JSON Editor:** For direct manipulation of the raw JSON.
        *   **Preview:** To see how the questions will look when rendered.

2.  **Creating Questions (Form Editor):**
    *   Click "Add Question".
    *   Fill in the required fields (Question Number, Question Text, Options, Correct Answer).
    *   Utilize rich text formatting (LaTeX, Markdown images, code blocks, alerts) in text areas.
    *   Add/remove options as needed (minimum 2).
    *   Save the question.

3.  **Editing Raw JSON:**
    *   Switch to the "JSON Editor" tab.
    *   Edit the JSON directly. Be mindful of JSON syntax and the ExamOven schema.
    *   Use "Validate JSON" to check your changes.
    *   Use "Auto-Fix" to repair numbering or formatting issues.

4.  **Using Templates:**
    *   Open the sidebar and go to the "Templates" tab.
    *   Select a category and click on a template.
    *   Choose to "Replace" current questions or "Append" the template.

5.  **Previewing:**
    *   Switch to the "Preview" tab.
    *   If data is valid, questions will be rendered with formatting.
    *   If data is invalid, an error message will guide you.

6.  **Validation:**
    *   Use "Validate Form Data" (in Form Editor) or "Validate JSON" (in JSON Editor) regularly.

7.  **Import/Export:**
    *   **Import:** Click "Import" in the navbar. Choice to import from a `.json` file, paste raw JSON, or receive data from main ExamOven app.
    *   **Export:** Click "Export" in the navbar. Name your file and choose formatting options.

8.  **Help Guide:**
    *   Access detailed instructions via the "Help" button in the navbar.

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix.
3.  **Make your changes.** Ensure your code adheres to the project's coding style.
4.  **Test your changes thoroughly.**
5.  **Commit your changes** with a clear and descriptive commit message.
6.  **Push your branch** to your forked repository.
7.  **Open a Pull Request** against the `main` branch of the original repository.

## Future Enhancements (Ideas)

*   Drag-and-drop reordering of questions.
*   Auto-saving to indexedDB.
*   Undo/Redo functionality.
*   More sophisticated template management.
*   Unit and integration tests.

## License

This project is licensed under the **MIT License**.
