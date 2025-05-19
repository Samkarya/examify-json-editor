// src/components/layout/SidebarComponent.tsx
import React from 'react';
import { Nav, Tab, Button, Accordion } from 'react-bootstrap'; // Using Nav and Tab from react-bootstrap
import { useQuestionsStore } from '../../store/questionsStore';
import { TEMPLATES } from '../../constants'; // We'll use this for template rendering
import type { Question } from '../../types/Question'; // For type assertion
import { toast } from 'react-toastify'; // Ensure toast is imported

// Template loading action with toast feedback
const handleLoadTemplate = (templateData: Partial<Question>[], templateName: string) => {
  const questionsLength = useQuestionsStore.getState().questions.length; // Get current length
  const mode = questionsLength > 0 
    ? window.confirm(`Load template "${templateName}"?\n\nOK = Replace current questions\nCancel = Append to current questions`)
      ? 'replace' 
      : 'append'
    : 'replace';
  
  useQuestionsStore.getState().loadTemplateQuestions(templateData, mode);
  
  if (mode === 'replace') {
    toast.info(`Template "${templateName}" loaded, replacing current content.`);
  } else {
    toast.info(`Template "${templateName}" appended to existing questions.`);
  }
};

const SidebarComponent: React.FC = () => {
  const isSidebarCollapsed = useQuestionsStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useQuestionsStore((state) => state.toggleSidebar);
  const activeSidebarTab = useQuestionsStore((state) => state.activeSidebarTab);
  const setActiveSidebarTab = useQuestionsStore((state) => state.setActiveSidebarTab);
  const setHelpModalOpen = useQuestionsStore((state) => state.setHelpModalOpen); // Add this

  // For templates - simplistic category handling for now
  const [activeTemplateCategory, setActiveTemplateCategory] = React.useState<keyof typeof TEMPLATES>('basic');

  // Updated function to open full help guide modal
  const openFullHelpGuide = () => {
    setHelpModalOpen(true); // Call the store action
  };

  return (
    <>
      <div className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h5 className="mb-0">Tools & Templates</h5>
        </div>
        <div className="sidebar-content">
          <Nav variant="tabs" activeKey={activeSidebarTab} onSelect={(k) => setActiveSidebarTab(k as any)}>
            <Nav.Item>
              <Nav.Link eventKey="templates">Templates</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="quickHelp">Quick Help</Nav.Link>
            </Nav.Item>
          </Nav>

          <Tab.Content className="pt-3">
            <Tab.Pane eventKey="templates" active={activeSidebarTab === 'templates'}>
              <div className="mb-3">
                <label htmlFor="templateCategory" className="form-label">Select Template Category</label>
                <select 
                  className="form-select form-select-sm" 
                  id="templateCategory"
                  value={activeTemplateCategory}
                  onChange={(e) => setActiveTemplateCategory(e.target.value as keyof typeof TEMPLATES)}
                >
                  {Object.keys(TEMPLATES).map(categoryKey => (
                    <option key={categoryKey} value={categoryKey}>
                      {categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)} Templates
                    </option>
                  ))}
                </select>
              </div>
              <div className="json-templates-list">
                {TEMPLATES[activeTemplateCategory]?.map((template, index) => (
                  <Button
                    key={`${activeTemplateCategory}-${index}`}
                    variant="outline-secondary"
                    size="sm"
                    className="template-btn-item d-flex align-items-center w-100 mb-2"
                    onClick={() => handleLoadTemplate(template.data, template.name)}
                  >
                    <i className={`fa ${template.icon || 'fa-file-alt'} fa-fw me-2`}></i>
                    <span className="flex-grow-1 text-start">{template.name}</span>
                  </Button>
                ))}
                {(!TEMPLATES[activeTemplateCategory] || TEMPLATES[activeTemplateCategory].length === 0) && (
                    <p className="text-muted small text-center">No templates in this category.</p>
                )}
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="quickHelp" active={activeSidebarTab === 'quickHelp'}>
              <Accordion defaultActiveKey="0" flush>
                <Accordion.Item eventKey="0">
                  <Accordion.Header>Required Fields</Accordion.Header>
                  <Accordion.Body className="small">
                    <code>question_number</code>, <code>question_text</code>, <code>options</code>, <code>correct_answer</code>. Min 2 options.
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="1">
                  <Accordion.Header>Rich Content</Accordion.Header>
                  <Accordion.Body className="small">
                    <strong>Math/Simple Equations:</strong> <code>$...$</code> or <code>$$...$$</code> (LaTeX, e.g., <code>CH_4 + 2O_2 \rightarrow CO_2</code>)<br />
                    <strong>Images/Complex Diagrams:</strong> <code>![alt](URL or path)</code><br />
                    <strong>Code:</strong> <code>```lang ... ```</code><br />
                    <small>Paths like <code>NIMCET/assets/img.png</code> resolve from GitHub repo.</small>
                  </Accordion.Body>
                </Accordion.Item>
                <Accordion.Item eventKey="2">
                  <Accordion.Header>Raw JSON Escaping</Accordion.Header>
                  <Accordion.Body className="small">
                    When editing Raw JSON:<br />
                    LaTeX <code>\</code> → <code>\\</code> (e.g., <code>"$\\frac a b$"</code>)<br />
                    Code newlines → <code>\\n</code>
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
              <div className="text-center mt-3">
                <Button variant="outline-primary" size="sm" onClick={openFullHelpGuide}>
                  <i className="fa fa-book-open me-1"></i> Open Full Guide
                </Button>
              </div>
            </Tab.Pane>
          </Tab.Content>
        </div>
      </div>

      <div
        className={`sidebar-toggle-btn ${isSidebarCollapsed ? 'collapsed-state' : ''}`}
        onClick={toggleSidebar}
        title={isSidebarCollapsed ? 'Show Sidebar' : 'Hide Sidebar'}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleSidebar()}
      >
        <i className={`fa ${isSidebarCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`}></i>
      </div>
    </>
  );
};

export default SidebarComponent;