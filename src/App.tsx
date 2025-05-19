// src/App.tsx
import React from 'react';
import { Container, Row, Col } from 'react-bootstrap'; // Using react-bootstrap for layout
import { ToastContainer } from 'react-toastify';
import { useQuestionsStore } from './store/questionsStore';
import { APP_NAME } from './constants';

// Placeholder components - we will create these next
import NavbarComponent from './components/layout/NavbarComponent';
import LoadingModal from './components/common/LoadingModal';
import SidebarComponent from './components/layout/SidebarComponent';
import QuestionModal from './components/form-editor/QuestionModal';
import FormEditorView from './components/form-editor/FormEditorView';
import JsonEditorView from './components/json-editor/JsonEditorView';
import PreviewView from './components/preview/PreviewView';
import ImportModal from './components/modals/ImportModal';
import ExportModal from './components/modals/ExportModal';
import HelpModal from './components/modals/HelpModal';


function App() {
  const activeMainView = useQuestionsStore((state) => state.activeMainView);
  const setActiveMainView = useQuestionsStore((state) => state.setActiveMainView);
  const isSidebarCollapsed = useQuestionsStore((state) => state.isSidebarCollapsed);
  const isLoading = useQuestionsStore((state) => state.isLoading);
  const loadingMessage = useQuestionsStore((state) => state.loadingMessage);

  return (
    <>
      <NavbarComponent />
      <SidebarComponent />
      
      <main className={`main-content-wrapper ${isSidebarCollapsed ? 'expanded' : ''}`}>
        
        <Container fluid>
          {/* Main Content Tabs */}
          <ul className="nav nav-tabs mb-4 main-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMainView === 'form' ? 'active' : ''}`} 
                onClick={() => setActiveMainView('form')}
              >
                <i className="fa fa-edit me-1"></i> Form Editor
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMainView === 'json' ? 'active' : ''}`} 
                onClick={() => setActiveMainView('json')}
              >
                <i className="fa fa-code me-1"></i> JSON Editor
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${activeMainView === 'preview' ? 'active' : ''}`} 
                onClick={() => setActiveMainView('preview')}
              >
                <i className="fa fa-eye me-1"></i> Preview
              </button>
            </li>
          </ul>

          {/* Tab Content */}
          <div className="tab-content">
            {activeMainView === 'form' && <FormEditorView />}
            {activeMainView === 'json' && <JsonEditorView />}
            {activeMainView === 'preview' && <PreviewView />}
          </div>
        </Container>
        <footer className="app-footer">
            <p>© {new Date().getFullYear()} Examify React Editor. Inspired by Examify Online Practice Platform.</p>
        </footer>
      </main>
      <QuestionModal />
      <ImportModal /> 
      <ExportModal />   
      <HelpModal /> 
      <LoadingModal /> 

      {/* Toast Container for notifications */}
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored" // Or "light", "dark"
      />
    </>
  );
}

export default App;