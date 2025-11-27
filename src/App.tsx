import IDEContainer from './components/layout/IDEContainer';
import Sidebar from './components/layout/Sidebar';
import Toolbar from './components/layout/Toolbar';
import SplitEditor from './components/layout/SplitEditor';
import StatusBar from './components/layout/StatusBar';

// Modals
import QuestionModal from './components/form-editor/QuestionModal';
import ImportModal from './components/modals/ImportModal';
import ExportModal from './components/modals/ExportModal';
import HelpModal from './components/modals/HelpModal';
import LoadingModal from './components/common/LoadingModal';

// Print View
import PrintView from './components/print/PrintView';

function App() {
  // Check for print mode
  const isPrintMode = new URLSearchParams(window.location.search).get('mode') === 'print';

  if (isPrintMode) {
    return <PrintView />;
  }

  return (
    <IDEContainer>
      <div className="d-flex flex-grow-1 overflow-hidden">
        <Sidebar />
        <div className="flex-grow-1 d-flex flex-column overflow-hidden bg-app">
          <Toolbar />
          <div className="flex-grow-1 overflow-hidden position-relative">
            <SplitEditor />
          </div>
        </div>
      </div>
      <StatusBar />

      {/* Global Modals */}
      <QuestionModal />
      <ImportModal />
      <ExportModal />
      <HelpModal />
      <LoadingModal />
    </IDEContainer>
  );
}

export default App;