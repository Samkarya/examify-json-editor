
# Examify JSON Editor (React Version)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A user-friendly, feature-rich JSON editor designed for creating and managing exam questions in the Examify JSON format. This React-based editor provides a form-based interface for easy question creation, a raw JSON editor for advanced users, live preview capabilities, and robust validation.

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
    *   Validates against the Examify question schema (required fields, data types, option consistency, unique question numbers, sequential numbering).
    *   Clear error messages to guide users in fixing issues.
    *   Case-insensitive checking for `correct_answer` against option keys for better usability.
*   **Templates:** Start quickly with pre-defined question structures for various types (basic MCQ, subject-specific, complex content with LaTeX/code/images).
*   **Import/Export:**
    *   Import existing Examify JSON files (via file upload or pasting raw JSON).
    *   Export questions to a `.json` file, with options for pretty-printing.
*   **Rich Text Support:** Question text, options, and explanations support rich content formatting.
*   **Responsive Design:** Adapts to different screen sizes for use on desktops, tablets, and mobile devices.
*   **Client-Side State Management:** Uses Zustand for efficient and predictable state management.
*   **Modern Tech Stack:** Built with React, TypeScript, Vite, and Bootstrap.

## Tech Stack

*   **Frontend Framework:** [React](https://reactjs.org/) (with Hooks)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool:** [Vite](https://vitejs.dev/)
*   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
*   **UI Components:** [React-Bootstrap](https://react-bootstrap.github.io/)
*   **JSON Editor:** [CodeMirror 6](https://codemirror.net/) (via `@uiw/react-codemirror`)
*   **Markdown Parsing:** [Marked.js](https://marked.js.org/)
*   **HTML Sanitization:** [DOMPurify](https://github.com/cure53/DOMPurify)
*   **LaTeX Rendering:** [KaTeX](https://katex.org/)
*   **Syntax Highlighting (Preview):** [Prism.js](https://prismjs.com/)
*   **Notifications:** [React Toastify](https://fkhadra.github.io/react-toastify/)
*   **Styling:** Global CSS (inspired by original project) & Bootstrap
*   **Unique IDs:** [UUID](https://github.com/uuidjs/uuid)
*   **Deployment:** [GitHub Pages](https://pages.github.com/) (via GitHub Actions)

## Project Structure

*(You can include the project structure tree you generated earlier here, or a simplified version)*

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

1.  **Clone the repository (or the specific subfolder):**
    ```bash
    # If cloning the entire 'examify-json-editor' repository
    git clone https://github.com/Samkarya/examify-json-editor.git
    cd examify-json-editor
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application will typically be available at `http://localhost:5173` (or another port if 5173 is in use).

### Building for Production

To create an optimized production build:

```bash
npm run build
# or
yarn build
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
    *   Utilize rich text formatting (LaTeX, Markdown images, code blocks) in text areas.
    *   Add/remove options as needed (minimum 2).
    *   Save the question.

3.  **Editing Raw JSON:**
    *   Switch to the "JSON Editor" tab.
    *   Edit the JSON directly. Be mindful of JSON syntax and the Examify schema (see Help Guide for escaping rules for LaTeX/newlines).
    *   Use "Validate JSON" to check your changes.
    *   Use "Sync to Form Editor" to reflect JSON changes in the form view (this will overwrite form data).

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
    *   The "Status & Actions" panel in the Form Editor view provides a summary and error details.
    *   The "Validate All" button in the navbar validates based on the currently active main tab.

7.  **Import/Export:**
    *   **Import:** Click "Import" in the navbar. Choose to import from a `.json` file or paste raw JSON text.
    *   **Export:** Click "Export" in the navbar. Name your file and choose formatting options.

8.  **Help Guide:**
    *   Access detailed instructions via the "Help" button in the navbar or the "Quick Help" in the sidebar.

## Contributing

Contributions are welcome! If you'd like to contribute, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/your-bug-fix-name
    ```
3.  **Make your changes.** Ensure your code adheres to the project's coding style (ESLint is configured).
4.  **Test your changes thoroughly.**
5.  **Commit your changes** with a clear and descriptive commit message:
    ```bash
    git commit -m "feat: Add new feature for X"
    # or
    git commit -m "fix: Resolve issue Y with Z"
    ```
6.  **Push your branch** to your forked repository:
    ```bash
    git push origin feature/your-feature-name
    ```
7.  **Open a Pull Request** against the `main` branch of the original `Samkarya/examify-json-editor` repository.
    *   Provide a clear title and description for your pull request, explaining the changes and why they are needed.
    *   Link to any relevant issues.

Please ensure that your contributions are well-tested and do not break existing functionality.

## Future Enhancements (Ideas)

*   Drag-and-drop reordering of questions in the Form Editor.
*   Auto-saving or "dirty" state indicators.
*   More advanced JSON editor features (e.g., schema-based autocompletion if feasible with CodeMirror 6).
*   Enhanced theming options.
*   Undo/Redo functionality.
*   More sophisticated template management.
*   Unit and integration tests.

## License

This project is licensed under the **MIT License**.
