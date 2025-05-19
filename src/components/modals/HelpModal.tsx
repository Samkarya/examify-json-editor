// src/components/modals/HelpModal.tsx
import React from 'react';
import { Row, Col, ListGroup, Tab } from 'react-bootstrap';
import AppModal from '../common/AppModal';
import { useQuestionsStore } from '../../store/questionsStore';

const HelpModal: React.FC = () => {
  const isOpen = useQuestionsStore((state) => state.isHelpModalOpen);
  const setOpen = useQuestionsStore((state) => state.setHelpModalOpen);

  const handleClose = () => {
    setOpen(false);
  };

  const helpContent = {
    overview: (
        <>
            <h4>Welcome to Examify React Editor</h4>
            <p>This tool helps you create, edit, and validate JSON files for the Examify platform with ease - whether you're a technical expert or completely new to JSON.</p>
            
            <h5>Key Features</h5>
            <ul>
                <li><strong>Form-based Editor:</strong> Create questions using a simple form interface - no JSON knowledge required.</li>
                <li><strong>Advanced JSON Editor:</strong> Direct JSON editing with syntax highlighting and error detection via CodeMirror.</li>
                <li><strong>Comprehensive Validation:</strong> Instantly catch and fix formatting and structural errors based on Examify's schema.</li>
                <li><strong>Live Preview:</strong> See how your questions will look, including LaTeX math, Markdown images (relative paths supported), and syntax-highlighted code blocks.</li>
                <li><strong>Templates:</strong> Start quickly with pre-made question structures.</li>
                <li><strong>Import/Export:</strong> Load existing JSON files or save your work.</li>
            </ul>
            
            <h5>Getting Started</h5>
            <ol>
                <li><strong>Use the Form Editor:</strong> Click "Add Question" to create your first question. Fill in the fields (required fields are marked with *).</li>
                <li><strong>Rich Content:</strong> For math, type LaTeX like <code>$\alpha + \beta$</code> or <code>$$\sum_{'{i=0}'}^n x_i$$</code>. For images, use <code>![alt text](image_url)</code> or relative paths like <code>![My Diagram](NIMCET/assets/diagram.png)</code>. For code, use Markdown code fences: <code>```python ... ```</code>. The editor handles the necessary JSON escaping automatically when using the Form editor.</li>
                <li><strong>Options:</strong> Add at least two options. Choose an "Option Key" (e.g., "a", "b", "1"). This key will be used for <code>correct_answer</code>. Enter the "Option Value" (text of the option). Rich content is supported. Select one as the correct answer.</li>
                <li><strong>Save & Validate:</strong> Save your question. Use the "Validate" buttons regularly to check for errors.</li>
                <li><strong>Preview:</strong> Switch to the "Preview" tab to see how your questions will be rendered.</li>
                <li><strong>Export:</strong> When finished, use the "Export" button to download your JSON file.</li>
            </ol>
        </>
    ),
    jsonFormat: (
        <>
            <h4>Examify Question JSON Format</h4>
            <p>The Examify platform expects exam questions as a JSON array of question objects. Each object must follow this structure:</p>
            
            <div className="help-code-block">
<pre><code>{`[
  {
    "question_number": 1,
    "question_text": "If $x + 5 = 12$, what is the value of $x$?",
    "options": {
      "a": "5",
      "b": "7",
      "c": "12",
      "d": "17"
    },
    "correct_answer": "b",
    
    "subject": "Mathematics",    // Optional
    "topic": "Algebra",          // Optional
    "explanation": "Subtract 5 from both sides: $x + 5 - 5 = 12 - 5 \\\\implies x = 7$.", // Optional
    "difficulty": "Easy",        // Optional: "Easy", "Medium", or "Hard"
    "section_id": "SectionA"     // Optional
  }
  // ... more question objects
]`}</code></pre>
            </div>
            
            <h5>Field Details</h5>
            <ul>
                <li><strong><code>question_number</code> (Required, Number):</strong> Unique positive integer, should be sequential starting from 1.</li>
                <li><strong><code>question_text</code> (Required, String):</strong> The main question text. Supports rich content.</li>
                <li><strong><code>options</code> (Required, Object):</strong> Key-value pairs.
                    <ul>
                        <li>Keys (String, e.g., "a", "1"): Option identifiers.</li>
                        <li>Values (String): Option text. Supports rich content.</li>
                        <li>Must have at least two options.</li>
                    </ul>
                </li>
                <li><strong><code>correct_answer</code> (Required, String):</strong> The key from the <code>options</code> object that is the correct answer (e.g., "b").</li>
                <li><strong><code>subject</code> (Optional, String | null):</strong> Subject area (e.g., "Mathematics", "Physics"). If present and not null, must be non-empty.</li>
                <li><strong><code>topic</code> (Optional, String | null):</strong> Specific topic (e.g., "Calculus", "Optics"). If present and not null, must be non-empty.</li>
                <li><strong><code>explanation</code> (Optional, String | null):</strong> Detailed explanation. Supports rich content. Highly encouraged! If present and not null, must be a string (can be empty).</li>
                <li><strong><code>difficulty</code> (Optional, String | null):</strong> Difficulty level ("Easy", "Medium", "Hard"). If present and not null, must be one of these, or an empty string (representing "Not specified" from form).</li>
                <li><strong><code>section_id</code> (Optional, String | null):</strong> Identifier for exams with sections (e.g., "Section A"). If present and not null, must be non-empty.</li>
            </ul>
            <p className="mt-3"><strong>Important for JSON strings (<code>question_text</code>, option values, <code>explanation</code>) when editing Raw JSON:</strong>
                <ul>
                    <li>For LaTeX: A command like <code>\\frac</code> should appear as <code>\\\\frac</code> in the JSON string. Example: <code>"$\\\\frac{1}{2}$"</code>. (This results in the JS string <code>$\\frac{1}{2}$</code> after parsing).</li>
                    <li>For Newlines in Code: A newline character in a code block should appear as <code>\\\\n</code> in the JSON string. Example: <code>"Code line 1\\\\nCode line 2"</code>.</li>
                </ul>
            The Form Editor in this tool handles these conversions for you automatically.
            </p>
        </>
    ),
    formEditor: (
        <>
            <h4>Using the Form Editor</h4>
            <p>The Form Editor provides an intuitive way to create and manage questions without writing JSON code directly.</p>
            
            <h5>Adding a New Question</h5>
            <ol>
                <li>Click the "Add Question" button. This opens the question modal.</li>
                <li><strong>Question Number:</strong> Auto-suggested. Ensure it's unique and positive.</li>
                <li><strong>Difficulty:</strong> Select from "Easy", "Medium", "Hard", or leave as "Not specified".</li>
                <li><strong>Subject, Topic, Section ID:</strong> Fill these optional fields as needed.</li>
                <li><strong>Question Text:</strong> Type your question. Use LaTeX for math (e.g., <code>$\alpha$</code>), Markdown for images (<code>![alt](url)</code> or <code>![alt](path/to/image.png)</code>), and code blocks (<code>```lang ... ```</code>).</li>
                <li><strong>Options:</strong>
                    <ul>
                        <li>Click "Add Option".</li>
                        <li>Enter an "Option Key" (e.g., "a", "b"). This key is used for <code>correct_answer</code>.</li>
                        <li>Enter the "Option Value" (text of the option). Rich content is supported.</li>
                        <li>Select the radio button next to the correct option. At least two options are needed.</li>
                    </ul>
                </li>
                <li><strong>Explanation:</strong> Provide a detailed explanation (recommended). Rich content supported.</li>
                <li>Click "Save Question".</li>
            </ol>
            
            <h5>Editing an Existing Question</h5>
            <p>In the "Question List", click the "Edit <i className='fa fa-pencil-alt fa-xs'></i>" button on a question. Modify and save.</p>

            <h5>Deleting a Question</h5>
            <p>Click the "Delete <i className='fa fa-trash-alt fa-xs'></i>" button on a question. Confirm deletion.</p>
            
            <h5>Duplicating a Question</h5>
            <p>Click the "Duplicate <i className='fa fa-copy fa-xs'></i>" button on a question. A copy with a new question number will be added.</p>

            <h5>Status & Actions (Right Panel in Form Tab)</h5>
            <ul>
                <li><strong>Status:</strong> Shows "Valid" or "Invalid" based on the current form data.</li>
                <li><strong>Question Count:</strong> Number of questions.</li>
                <li><strong>Validation Issues:</strong> Displays errors if validation fails.</li>
                <li><strong>Validate Form Data:</strong> Validates all questions from the forms.</li>
                <li><strong>Sync to JSON Editor:</strong> Updates the "JSON Editor" tab with current form data.</li>
            </ul>
        </>
    ),
    jsonEditorGuide: (
        <>
            <h4>Using the JSON Editor</h4>
            <p>The JSON Editor (CodeMirror) allows direct manipulation of raw JSON. Useful for technical users, bulk edits, or pasting JSON.</p>
            
            <h5>Features</h5>
            <ul>
                <li>Syntax Highlighting & Line Numbers.</li>
                <li>Basic Linting for JSON syntax errors (missing commas, quotes).</li>
            </ul>
            
            <h5>Editing JSON</h5>
            <ul>
                <li>Ensure the overall structure is an array <code>[ ... ]</code> of question objects <code>{'{ ... }'}</code>.</li>
                <li>Follow "JSON Format" rules.</li>
                <li><strong>Escaping for Rich Content (Crucial for Raw JSON Editing):</strong>
                    <ul>
                       <li><strong>LaTeX:</strong> Literal backslashes in LaTeX (e.g., in `\frac`) must be escaped with another backslash: `\\frac`. So, to get {"$\\frac{a}{b}$"} in the application's memory, the JSON string must be {`"$\\\\frac{a}{b}$"`}.</li>
                       <li><strong>Code Block Newlines:</strong> Literal newlines within code strings must be escaped as `\\n`. Example: `"First line\\\\nSecond line"`.</li>
                       <li><strong>Double Quotes in Strings:</strong> If your text needs a literal double quote, it must be escaped as `\\"`. Example: `"He said, \\\\"Hello\\\\""`.</li>
                    </ul>
                </li>
            </ul>
            
            <h5>Actions</h5>
            <ul>
                <li><strong>Validate JSON:</strong> Validates editor content against the Examify schema.</li>
                <li><strong>Sync to Form Editor:</strong> Parses editor JSON. If valid, updates Form Editor. <strong>Caution: Overwrites unsynced Form Editor changes.</strong></li>
            </ul>
        </>
    ),
    formattingGuide: (
        <>
              <h4>Rich Content Formatting Guide</h4>
            <p>Examify supports rich content in <code>question_text</code>, option values, and <code>explanation</code>.
            When using the <strong>Form Editor</strong>, type rich content naturally. The tool handles JSON string escaping.
            When editing <strong>Raw JSON</strong>, you must manually ensure correct escaping for JSON strings.</p>

            <h5>1. Mathematical Notation (LaTeX via KaTeX)</h5>
            <ul>
                <li><strong>Syntax:</strong> Standard LaTeX.</li>
                <li>
                    <strong>Inline Math:</strong> Use single dollar signs: <code>$ E = mc^2 $</code>
                    <br /><em>Example: Renders as $ E = mc^2 $</em>
                </li>
                <li>
                    <strong>Display Math:</strong> Use double dollar signs: <code>$$ \int_0^\infty e^{'{ -x^2 }'} dx = \frac{'{ \sqrt{\pi} }'}{2} $$</code>
                    <br /><em>{"Example: Renders as $$ \int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2} $$"}</em>
                </li>
                <li>
                    <strong className="text-danger">⚠️ JSON ESCAPING (Crucial for Raw JSON Editor / .json files):</strong>
                    <br />You MUST escape LaTeX backslashes (<code>\</code>) with another backslash (<code>\\</code>) when writing the string directly into a JSON structure.
                    <ul>
                        <li>LaTeX input like <code>\frac{'{1}'}{'{2}'}</code> (in Form Editor or for mental model)
                            <br />becomes <code>"$\\frac{'{1}'}{'{2}'}$"</code> in the actual JSON string.
                        </li>
                        <li>LaTeX input like <code>\sin(x)</code>
                            <br />becomes <code>"$\\sin(x)$"</code> in the actual JSON string.
                        </li>
                         <li>A formula like <code>{"$\Delta x \cdot \Delta p \ge \frac{\hbar}{2}$"}</code> (what you want to see)
                            <br />must be written in the JSON string as <code>{"$\\Delta x \\cdot \\Delta p \\ge \\frac{\\hbar}{2}$"}</code>.
                        </li>
                    </ul>
                    The <strong>Form Editor</strong> in this tool handles this escaping for you automatically when you type naturally. The "Raw JSON Escaping" note above applies if you are directly editing the JSON in the "JSON Editor" tab or preparing a <code>.json</code> file manually.
                </li>
                 <li><strong>Preview:</strong> Renders using KaTeX.</li>
            </ul>
            <h5>2. Images (Markdown)</h5>
            <ul>
                <li><strong>Syntax:</strong> <code>![Alt Text](Image URL or Relative Path)</code></li>
                <li><strong>Supported URLs:</strong>
                    <ul>
                        <li>Absolute HTTPS URLs: <code>https://example.com/image.png</code></li>
                        <li>Relative paths (resolved from <a href="https://github.com/Samkarya/online-exam-questions/tree/main/" target="_blank" rel="noopener noreferrer">online-exam-questions GitHub repo</a> `main` branch):
                            e.g., <code>NIMCET/assets/some_image.jpg</code> or <code>assets/another_image.gif</code>
                        </li>
                    </ul>
                </li>
                <li>HTTP URLs are blocked for security. Local file paths (<code>file:///</code>) won't work in the web preview.</li>
                <li><strong>Raw JSON String Value:</strong> <code>"![Alt Text](https://example.com/image.png)"</code> or <code>"![Diagram](NIMCET/assets/circuit.png)"</code>.</li>
                <li><strong>Preview:</strong> Renders images. If a path is relative, it's prefixed with <code>https://raw.githubusercontent.com/Samkarya/online-exam-questions/main/</code>.</li>
            </ul>

            <h5>3. Code Snippets (Markdown Fenced Code Blocks)</h5>
             <ul>
                <li><strong>Form Editor Input (with actual newlines):</strong><br />
                    <code>```python</code><br />
                    <code>def greet():</code><br />
                    <code>  print("Hi")</code><br />
                    <code>```</code>
                </li>
                <li><strong>Raw JSON String Value (newlines escaped as `\\n`):</strong>
                <br /><code>"```python\\\\ndef greet():\\\\n  print(\\\\"Hi\\\\")\\\\n```"</code>
                <br />(Note: If the code itself contains double quotes, those also need to be escaped as `\\"` within the JSON string value. If the code has backslashes, they'd be `\\\\`).
                </li>
                <li><strong>Preview:</strong> Renders with syntax highlighting using Prism.js.</li>
            </ul>

            <h5>4. Chemical Content</h5>
            <ul>
                <li>
                    <strong>Complex Structures:</strong> For complex chemical diagrams (e.g., organic molecules, detailed reaction mechanisms), it's best to use **Images (Markdown)**.
                    <br />Example: <code>![Benzene Ring](assets/chemistry/benzene.png)</code>
                </li>
                <li>
                    <strong>Simple Chemical Equations:</strong>
                    <br />Prefer using standard LaTeX math mode. Ensure backslashes and symbols like `-&gt;` (right arrow) are correctly represented in LaTeX.
                    <br />
                    <strong>Form Editor Input:</strong> <code>$$CH_4 + 2O_2 \rightarrow CO_2 + 2H_2O$$</code>
                    <br />
                    <strong>Raw JSON String Value:</strong> <code>"$$CH_4 + 2O_2 \\rightarrow CO_2 + 2H_2O$$"</code>
                    <br />(Note: In raw JSON, `\` in `\rightarrow` becomes `\\rightarrow`.)
                    <br />
                    The KaTeX renderer will interpret `\rightarrow` as a reaction arrow.
                </li>
                <li>
                    If you were previously using the `mhchem` extension (e.g., <code>$\ce{"H2O"}$</code>), this is still supported by the KaTeX version included, but standard LaTeX is preferred for wider compatibility and control for simple equations. For complex structures, images remain the best choice.
                </li>
            </ul>
        </>
    ),
    commonErrorsGuide: ( // Example: common errors. Copy other sections similarly.
        <>
            <h4>Common Errors & Solutions (Primarily for Raw JSON Editing)</h4>
            {/* Here you would use react-bootstrap Accordion if desired */}
            <div> {/* Or simple divs for sections */}
                <h5>Invalid JSON Syntax / Parse Error</h5>
                <p><strong>Problem:</strong> JSON structure is broken.</p>
                <p><strong>Causes:</strong> Missing/extra commas, mismatched brackets/braces, unquoted keys (must be double-quoted), unquoted/single-quoted strings (must be double-quoted), unescaped special characters in strings (<code>"</code>, <code>\</code>, newlines).</p>
                <p><strong>Tool Tip:</strong> "Validate JSON" in the JSON Editor tab often points to the error line. The linter in CodeMirror will also show red marks.</p>
            </div>
            {/* ... More error sections ... */}
        </>
    ),
    aiGenerationGuide: (
        <>
            <h4>Using AI to Generate Question JSON</h4>
            <p>AI models can assist in drafting questions, but their output requires careful review and validation. Use a precise prompt to guide the AI.</p>
            <h5>Example AI Prompt:</h5>
            <p>Modify <code>[Number]</code> and <code>[Exam Name/Subject]</code> as needed. <strong>Emphasize the image path format for relative images.</strong></p>
            <div className="help-code-block">
<pre><code>{`Generate a valid JSON array containing [Number] practice questions for the [Exam Name/Subject] exam.

Each question object in the array must strictly follow this structure:
{
  "question_number": Number, // REQUIRED: Unique, sequential integer starting from 1
  "question_text": String,   // REQUIRED: Question text
  "options": Object,         // REQUIRED: e.g., {"a": "Option A", "b": "Option B"}
  "correct_answer": String,  // REQUIRED: Key matching the correct option (e.g., "b")
  "subject": String | null,    // Optional: e.g., "Physics" or null
  "topic": String | null,      // Optional: e.g., "Kinematics" or null
  "explanation": String | null, // Optional but preferred: Detailed explanation or null
  "difficulty": String | null, // Optional: "Easy", "Medium", or "Hard", or null/empty string
  "section_id": String | null  // Optional: e.g., "SectionA" or null
}

Formatting Rules for ALL String Values (This is for the raw JSON string value):
1.  Use LaTeX for Math: Inline \`$ ... $\`, Display \`$$ ... $$\`. IMPORTANT: Escape all LaTeX backslashes as \`\\\\\` (e.g., for \`\\frac\`, use \`\\\\\\\\frac\` in the JSON string. For \`\\alpha\`, use \`\\\\\\\\alpha\`).
2.  Use Markdown Code Blocks: Fenced \`\`\`language ... \`\`\`. IMPORTANT: Escape all newlines within the code portion of the string as \`\\\\n\`. Escape double quotes within the code as \`\\\\"\`.
3.  Use Markdown Images: \`![Alt Text](URL_or_RELATIVE_PATH)\`.
    - For HTTPS URLs: \`![Diagram](https://example.com/image.png)\`
    - For relative paths (for images in the 'Samkarya/online-exam-questions' GitHub repo): \`![Chart](NIMCET/assets/my_chart.png)\` (The tool will resolve this). Use a placeholder like \`assets/image_placeholder.png\` if the actual path isn't known yet.

Generate [Number] question objects in a single valid JSON array, applying all rules, especially escaping for raw JSON string values. Ensure the final output is ONLY the JSON array itself, starting with '[' and ending with ']'.`}
</code></pre>
            </div>
            <h5 className="mt-3">Post-AI Steps (Crucial):</h5>
            <ol>
                <li><strong>Import & Validate JSON:</strong> Use the "Import" feature and then "Validate JSON" / "Validate Form Data" button in this editor.</li>
                <li><strong>Verify Content:</strong> Check accuracy of questions, options, answers, and explanations.</li>
                <li><strong>Check Escaping (in Raw JSON view):</strong> Ensure LaTeX backslashes are <code>\\\\</code>, code newlines are <code>\\\\n</code>, and internal quotes are <code>\\\\"</code>.</li>
                <li><strong>Add/Verify Images:</strong> If using image placeholders or relative paths, ensure images are uploaded to the correct location in the <code>Samkarya/online-exam-questions</code> GitHub repository and update paths if needed. Test in the Preview tab.</li>
            </ol>
        </>
    ),
    templatesGuide: (
        <>
             <h4>Using Templates</h4>
            <p>Templates provide pre-filled question structures to help you get started quickly and ensure correct formatting.</p>
            
            <h5>How to Use Templates</h5>
            <ol>
                <li>Go to the "Templates" tab in the sidebar.</li>
                <li>Select a category.</li>
                <li>Click on a template button (e.g., "Simple MCQ").</li>
                <li>Confirm if you want to "Replace" current content or "Append" the template to existing questions.</li>
                <li>The editor will update with the template data. Modify the content as needed using the Form Editor.</li>
            </ol>
            
            <h5>Available Template Categories</h5>
            <ul>
                <li><strong>Basic Templates:</strong> Simple MCQs, with/without explanations.</li>
                <li><strong>Subject-specific Templates:</strong> Examples for subjects like Mathematics or Physics.</li>
                <li><strong>Complex Content Templates:</strong> Demonstrates LaTeX, Markdown images (with relative paths), and code blocks.</li>
            </ul>
             <div className="alert alert-info mt-3">
                <i className="fa fa-lightbulb me-2"></i>
                <strong>Tip:</strong> Templates are excellent for learning the correct JSON structure and rich content formatting.
            </div>
        </>
    ),
    importExportGuide: (
         <>
            <h4>Importing and Exporting JSON</h4>
            <p>Easily load existing Examify JSON files or save your work.</p>

            <h5>Importing JSON</h5>
            <ol>
                <li>Click the "Import" button in the top navbar.</li>
                <li>A modal will appear. Choose your import method:
                    <ul>
                        <li><strong>Import from file:</strong> Drag & drop a <code>.json</code> file or click to browse.</li>
                        <li><strong>Paste JSON:</strong> Select this option and paste your raw JSON text.</li>
                    </ul>
                </li>
                <li>Click "Import" in the modal.</li>
                <li>The editor will parse and validate. If successful, data populates. Errors will be shown.</li>
            </ol>

            <h5>Exporting JSON</h5>
            <ol>
                <li>Ensure questions are complete and validated.</li>
                <li>Click the "Export" button in the top navbar.</li>
                <li>(Optional) Change the <strong>File Name</strong>.</li>
                <li>(Optional) Uncheck "Pretty format" for minified JSON.</li>
                <li>Click "Export" in the modal to download.</li>
            </ol>
            <div className="alert alert-warning mt-3">
                <i className="fa fa-exclamation-triangle me-2"></i>
                <strong>Important:</strong> Always double-check critical exams. Invalid JSON or content may cause issues on the Examify platform.
            </div>
        </>
    )
  };

  const helpSections = [
    { key: 'overview', title: 'Overview', content: helpContent.overview },
    { key: 'jsonFormat', title: 'JSON Format', content: helpContent.jsonFormat },
    { key: 'formEditor', title: 'Form Editor', content: helpContent.formEditor },
    { key: 'jsonEditorGuide', title: 'JSON Editor', content: helpContent.jsonEditorGuide },
    { key: 'formattingGuide', title: 'Rich Content', content: helpContent.formattingGuide },
    { key: 'commonErrorsGuide', title: 'Common Errors', content: helpContent.commonErrorsGuide },
    { key: 'aiGenerationGuide', title: 'AI Generation', content: helpContent.aiGenerationGuide },
    { key: 'templatesGuide', title: 'Templates', content: helpContent.templatesGuide },
    { key: 'importExportGuide', title: 'Import/Export', content: helpContent.importExportGuide },
  ];

  return (
    <AppModal 
        show={isOpen} 
        onHide={handleClose} 
        title={"Examify React Editor Help Guide"} 
        size="xl" 
        scrollable
    >
      <Tab.Container id="help-tabs-main" defaultActiveKey="overview">
        <Row>
          <Col sm={3} className="pe-0"> {/* pe-0 to remove padding if list group touches edge */}
            <ListGroup className="help-modal-sticky-nav list-group-flush"> {/* list-group-flush for edge-to-edge */}
              {helpSections.map(section => (
                <ListGroup.Item 
                    action 
                    eventKey={section.key} 
                    href={`#help-${section.key}`} // Ensure href matches eventKey for accessibility if needed by Tab.Container
                    key={section.key}
                >
                    {section.title}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>
          <Col sm={9} className="border-start"> {/* border-start for visual separation */}
            <Tab.Content className="p-3"> {/* Added padding to tab content area */}
              {helpSections.map(section => (
                <Tab.Pane eventKey={section.key} key={section.key} title={section.title} id={`help-${section.key}`}>
                    {section.content}
                </Tab.Pane>
              ))}
            </Tab.Content>
          </Col>
        </Row>
      </Tab.Container>
    </AppModal>
  );
};

export default HelpModal;