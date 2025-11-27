import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useQuestionsStore } from '../../store/questionsStore';
import FormEditorView from '../form-editor/FormEditorView';
import JsonEditorView from '../json-editor/JsonEditorView';
import PreviewView from '../preview/PreviewView';

const SplitEditor: React.FC = () => {
  const activeMainView = useQuestionsStore((state) => state.activeMainView);
  // We might want to rethink 'activeMainView' since we now show both.
  // For now, let's assume the left pane toggles between Form and JSON,
  // and the right pane is ALWAYS Preview.

  return (
    <div className="h-100 w-100">
      <PanelGroup direction="horizontal" autoSaveId="examify-split-layout">
        {/* Left Pane: Editor (Form or JSON) */}
        <Panel defaultSize={50} minSize={30} className="bg-white">
          <div className="d-flex flex-column h-100">
            {/* Pane Header could go here if not inside the views */}
            <div className="flex-grow-1 overflow-hidden">
              {activeMainView === 'json' ? <JsonEditorView /> : <FormEditorView />}
            </div>
          </div>
        </Panel>

        {/* Resize Handle */}
        <PanelResizeHandle className="ResizeHandleOuter">
          <div className="ResizeHandleInner" />
        </PanelResizeHandle>

        {/* Right Pane: Live Preview */}
        <Panel defaultSize={50} minSize={30} className="bg-subtle">
          <div className="d-flex flex-column h-100">
            <div className="panel-header">
              <span><i className="fa fa-eye me-2"></i>Live Preview</span>
              {/* Optional: Device toggle buttons (Mobile/Desktop) could go here */}
            </div>
            <div className="flex-grow-1 overflow-hidden">
              <PreviewView />
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default SplitEditor;
