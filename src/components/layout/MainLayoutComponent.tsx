// src/components/layout/MainLayoutComponent.tsx
import React from 'react';
import { Container, Tabs, Tab } from 'react-bootstrap';
import type { MainTabKey } from '../../App'; // Assuming MainTabKey is exported from App.tsx or a types file

interface MainLayoutComponentProps {
  isSidebarOpen: boolean;
  children: React.ReactNode; // Content of the active tab
  activeMainTabKey: MainTabKey;
  onSelectMainTab: (selectedTabKey: MainTabKey | null) => void;
}

const MainLayoutComponent: React.FC<MainLayoutComponentProps> = ({
  isSidebarOpen,
  children,
  activeMainTabKey,
  onSelectMainTab,
}) => {
  return (
    <main
      className={`main-content-examify ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}
      id="mainContent" // Matching ID from original prototype for potential CSS or direct selection
    >
      <Container fluid className="pt-3"> {/* Added some padding top */}
        <Tabs
          id="main-content-tabs"
          activeKey={activeMainTabKey}
          onSelect={(k) => onSelectMainTab(k as MainTabKey | null)} // k can be string | null
          className="nav-tabs-examify mb-4" // Use custom class for specific styling if needed
          // mountOnEnter // Optional: only mount tab content when tab is first selected
          // unmountOnExit // Optional: unmount tab content when tab is deselected
        >
          <Tab
            eventKey="form"
            title={
              <>
                <i className="fa fa-edit me-1"></i> Form Editor
              </>
            }
          >
            {activeMainTabKey === 'form' && children} 
            {/* Conditionally render children only if this tab is active 
                to ensure correct content is shown if not using mountOnEnter/unmountOnExit */}
          </Tab>
          <Tab
            eventKey="json"
            title={
              <>
                <i className="fa fa-code me-1"></i> JSON Editor
              </>
            }
          >
            {activeMainTabKey === 'json' && children}
          </Tab>
          <Tab
            eventKey="preview"
            title={
              <>
                <i className="fa fa-eye me-1"></i> Preview
              </>
            }
          >
            {activeMainTabKey === 'preview' && children}
          </Tab>
        </Tabs>
        
        {/* 
          If NOT conditionally rendering children inside <Tab>, 
          the children would be directly here, and react-bootstrap's Tabs
          would manage showing/hiding the <Tab.Pane>s that wrap the content.
          The current conditional rendering approach is more explicit for when
          children is a single dynamic block passed from App.tsx.

          An alternative structure if children were static per tab:
          <Tab eventKey="form" title="Form Editor"><FormEditorComponent /></Tab>
          <Tab eventKey="json" title="JSON Editor"><JsonEditorComponent /></Tab> 
        */}

      </Container>
      
      {/* Footer can be added here if it's part of the main scrollable area */}
      {/* <footer className="footer-examify">
        <p>© {new Date().getFullYear()} Examify JSON Editor. For Examify Online Practice Platform. MIT License.</p>
      </footer> */}
    </main>
  );
};

export default MainLayoutComponent;