import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { useQuestionsStore } from '../../store/questionsStore';
import { APP_NAME } from '../../constants';
import { toast } from 'react-toastify';

const NavbarComponent: React.FC = () => {
  const setImportModalOpen = useQuestionsStore((state) => state.setImportModalOpen);
  const setExportModalOpen = useQuestionsStore((state) => state.setExportModalOpen);
  const setHelpModalOpen = useQuestionsStore((state) => state.setHelpModalOpen);
  const activeMainView = useQuestionsStore((state) => state.activeMainView);
  const setActiveMainView = useQuestionsStore(state => state.setActiveMainView);
  const triggerFormValidationStore = useQuestionsStore((state) => state.triggerFormValidation);
  const triggerJsonEditorValidationStore = useQuestionsStore((state) => state.triggerJsonEditorValidation);

  const handleImportClick = () => setImportModalOpen(true);
  const handleExportClick = () => setExportModalOpen(true);
  const handleHelpClick = () => setHelpModalOpen(true);

  const handleValidateGlobalClick = () => {
    if (activeMainView === 'form') {
      const isValid = triggerFormValidationStore();
      if (isValid) {
        toast.success("Form Data is Valid!");
      } else {
        toast.error("Form Data has validation issues. Check the status panel.");
      }
    } else if (activeMainView === 'json') {
      const isValid = triggerJsonEditorValidationStore();
      // JsonEditorView handles its own status display based on this validation if needed.
      if (isValid) {
        toast.success("JSON Editor content structure is Valid!");
      } else {
        toast.error("JSON Editor content has structural issues. Check editor status or linter.");
      }
    } else {
      toast.info("Switch to 'Form Editor' or 'JSON Editor' tab to validate content.", {
        onClick: () => setActiveMainView('form') // Example: switch to form on click
      });
    }
  };

  return (
    <nav className="app-navbar navbar-dark fixed-top">
      <Container fluid>
        <span className="navbar-brand">
          <i className="fa fa-edit me-2"></i>{APP_NAME}
        </span>
        
        <div className="ms-auto d-flex align-items-center">
          <Button 
            variant="light" 
            size="sm" 
            className="ms-2" 
            onClick={handleImportClick}
            title="Import JSON from file or text"
          >
            <i className="fa fa-upload me-1"></i> Import
          </Button>
          <Button 
            variant="light" 
            size="sm" 
            className="ms-2" 
            onClick={handleExportClick}
            title="Export current JSON to a file"
          >
            <i className="fa fa-download me-1"></i> Export
          </Button>
          <Button 
            variant="light" 
            size="sm" 
            className="ms-2" 
            onClick={handleValidateGlobalClick}
            title="Validate the current JSON data"
          >
            <i className="fa fa-check-circle me-1"></i> Validate All
          </Button>
          <Button 
            variant="light" 
            size="sm" 
            className="ms-2" 
            onClick={handleHelpClick}
            title="Open detailed help guide"
          >
            <i className="fa fa-question-circle me-1"></i> Help
          </Button>
        </div>
      </Container>
    </nav>
  );
};

export default NavbarComponent;