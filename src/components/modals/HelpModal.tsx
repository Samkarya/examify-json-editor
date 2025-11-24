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
                    <li><strong>Split-View IDE:</strong> Edit questions on the left and see a real-time <strong>Live Preview</strong> on the right.</li>
                    <li><strong>Form-based Editor:</strong> Create questions using a simple form interface - no JSON knowledge required.</li>
                    <li><strong>Advanced JSON Editor:</strong> Direct JSON editing with syntax highlighting and error detection.</li>
                    <li><strong>Comprehensive Validation:</strong> Instantly catch and fix formatting and structural errors.</li>
                    <li><strong>Templates:</strong> Start quickly with pre-made question structures from the Sidebar.</li>
                </ul>

                <h5>Getting Started</h5>
                <ol>
                    <li><strong>Create a Question:</strong> Click "Add Question" in the <strong>Sidebar Explorer</strong> or the empty state area.</li>
                    <li><strong>Edit Content:</strong> Fill in the fields. Use the <strong>Form | JSON</strong> toggle in the top Toolbar to switch views if needed.</li>
                    <li><strong>Rich Content:</strong> For math, type LaTeX like <code>$\alpha + \beta$</code>. For images, use <code>![alt text](image_url)</code>. The editor handles escaping automatically in Form mode.</li>
                    <li><strong>Live Preview:</strong> Watch the right-hand panel to see exactly how your question will look.</li>
                    <li><strong>Validate:</strong> Check the <strong>Status Bar</strong> at the bottom for errors. Use the "Validate" button in the Toolbar for a full check.</li>
                    <li><strong>Export:</strong> When finished, use the "Export" button in the Toolbar to download your JSON file.</li>
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
    "explanation": "Subtract 5 from both sides...", // Optional
    "difficulty": "Easy",        // Optional
    "section_id": "SectionA"     // Optional
  }
]`}</code></pre>
                </div>

                <h5>Field Details</h5>
                <ul>
                    <li><strong><code>question_number</code> (Required):</strong> Unique positive integer.</li>
                    <li><strong><code>question_text</code> (Required):</strong> The main question text. Supports rich content.</li>
                    <li><strong><code>options</code> (Required):</strong> Key-value pairs (min 2). Keys (e.g., "a", "b") are used for the correct answer.</li>
                    <li><strong><code>correct_answer</code> (Required):</strong> Must match one of the option keys.</li>
                    <li><strong>Optional Fields:</strong> <code>subject</code>, <code>topic</code>, <code>explanation</code>, <code>difficulty</code>, <code>section_id</code>.</li>
                </ul>
            </>
        ),
        formEditor: (
            <>
                <h4>Using the Form Editor</h4>
                <p>The Form Editor provides an intuitive way to create and manage questions without writing JSON code directly.</p>

                <h5>Managing Questions</h5>
                <ul>
                    <li><strong>Add:</strong> Use the "Add Question" button in the Sidebar Explorer.</li>
                    <li><strong>Edit:</strong> Click any question in the Sidebar Explorer to load it into the form.</li>
                    <li><strong>Delete/Duplicate:</strong> Hover over a question in the Sidebar to reveal the Delete (Trash) and Duplicate (Copy) icons.</li>
                </ul>

                <h5>Editing Fields</h5>
                <ul>
                    <li><strong>Question Text:</strong> Supports LaTeX (<code>$...$</code>), Markdown images, and code blocks.</li>
                    <li><strong>Options:</strong> Click "Add Option" to add more choices. Mark the correct answer using the radio button.</li>
                    <li><strong>View Switching:</strong> If you need to see the underlying code, toggle to "JSON" mode in the Toolbar.</li>
                </ul>
            </>
        ),
        jsonEditorGuide: (
            <>
                <h4>Using the JSON Editor</h4>
                <p>The JSON Editor allows direct manipulation of raw JSON. Useful for technical users or bulk edits.</p>

                <h5>Accessing JSON Mode</h5>
                <p>Click the <strong>JSON</strong> toggle in the top Toolbar. This switches the left panel to a code editor.</p>

                <h5>Editing Rules</h5>
                <ul>
                    <li>Ensure the structure is a valid JSON array <code>[ ... ]</code>.</li>
                    <li><strong>Escaping:</strong> When writing raw JSON strings, you must escape backslashes (e.g., <code>\\frac</code> for LaTeX) and newlines (<code>\\n</code> for code).</li>
                </ul>

                <h5>Actions</h5>
                <ul>
                    <li><strong>Validate:</strong> Click "Validate" in the panel header to check for syntax errors.</li>
                    <li><strong>Sync:</strong> Click "Sync to Form" to parse the JSON and update the Form view.</li>
                </ul>
            </>
        ),
        formattingGuide: (
            <>
                <h4>Rich Content Formatting Guide</h4>
                <p>Examify supports rich content in <code>question_text</code>, option values, and <code>explanation</code>.</p>

                <h5>1. Mathematical Notation (LaTeX)</h5>
                <ul>
                    <li><strong>Inline Math:</strong> <code>$ E = mc^2 $</code></li>
                    <li><strong>Display Math:</strong> <code>$$ \int_0^\infty ... $$</code></li>
                    <li><strong>Note:</strong> In Form Mode, type naturally (<code>\frac</code>). In JSON Mode, escape backslashes (<code>\\frac</code>).</li>
                </ul>

                <h5>2. Images (Markdown)</h5>
                <ul>
                    <li><strong>Syntax:</strong> <code>![Alt Text](URL or Relative Path)</code></li>
                    <li><strong>Relative Paths:</strong> Paths like <code>NIMCET/assets/img.png</code> are resolved from the <code>online-exam-questions</code> GitHub repo.</li>
                </ul>

                <h5>3. Code Snippets</h5>
                <ul>
                    <li><strong>Syntax:</strong> Fenced code blocks: <br /><code>```python<br />print("Hello")<br />```</code></li>
                </ul>
            </>
        ),
        commonErrorsGuide: (
            <>
                <h4>Common Errors & Solutions</h4>
                <div>
                    <h5>Invalid JSON Syntax</h5>
                    <p><strong>Problem:</strong> Red error indicators in JSON mode.</p>
                    <p><strong>Solution:</strong> Check for missing commas, unquoted keys, or unescaped characters. Use the "Validate" button.</p>
                </div>
                <div className="mt-3">
                    <h5>Duplicate Question Numbers</h5>
                    <p><strong>Problem:</strong> Validation error "Question Number X is already in use".</p>
                    <p><strong>Solution:</strong> Ensure every question has a unique <code>question_number</code>.</p>
                </div>
            </>
        ),
        aiGenerationGuide: (
            <>
                <h4>Using AI to Generate Questions</h4>
                <p>You can use AI tools to generate JSON. Ensure you prompt the AI to follow the <strong>Examify JSON Schema</strong>.</p>

                <h5>Crucial Prompting Tips:</h5>
                <ul>
                    <li>Ask for a <strong>JSON Array</strong> of objects.</li>
                    <li>Specify required fields: <code>question_number</code>, <code>question_text</code>, <code>options</code>, <code>correct_answer</code>.</li>
                    <li><strong>Escaping:</strong> Tell the AI to "Escape all LaTeX backslashes as <code>\\</code> and code newlines as <code>\\n</code> in the JSON strings."</li>
                </ul>

                <p className="mt-2"><strong>Workflow:</strong> Generate JSON &rarr; Import into Editor &rarr; Validate &rarr; Fix Issues.</p>
            </>
        ),
        templatesGuide: (
            <>
                <h4>Using Templates</h4>
                <p>Templates provide pre-filled question structures to help you get started quickly.</p>

                <h5>How to Use</h5>
                <ol>
                    <li>Go to the <strong>Templates</strong> tab in the Sidebar.</li>
                    <li>Select a category (e.g., Basic, Math).</li>
                    <li>Click a template to load it. You can choose to <strong>Replace</strong> existing questions or <strong>Append</strong> to them.</li>
                </ol>
            </>
        ),
        importExportGuide: (
            <>
                <h4>Importing and Exporting</h4>

                <h5>Importing</h5>
                <p>Click <strong>Import</strong> in the Toolbar. You can drag & drop a <code>.json</code> file or paste raw text.</p>

                <h5>Exporting</h5>
                <p>Click <strong>Export</strong> in the Toolbar. This downloads your work as a <code>.json</code> file ready for the Examify platform.</p>
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
            title={"Examify Editor Guide"}
            size="xl"
            scrollable
        >
            <Tab.Container id="help-tabs-main" defaultActiveKey="overview">
                <Row className="h-100">
                    <Col sm={3} className="pe-0 border-end bg-light">
                        <ListGroup variant="flush" className="help-modal-sticky-nav pt-2">
                            {helpSections.map(section => (
                                <ListGroup.Item
                                    action
                                    eventKey={section.key}
                                    href={`#help-${section.key}`}
                                    key={section.key}
                                    className="border-0 bg-transparent py-2 px-3"
                                    style={{ fontSize: '0.95rem' }}
                                >
                                    {section.title}
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Col>
                    <Col sm={9} className="bg-white">
                        <Tab.Content className="p-4">
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