// src/components/form-editor/FormEditorView.tsx
import React from 'react';
import { Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useQuestionsStore } from '../../store/questionsStore';

import QuestionListComponent from './QuestionListComponent';

import StatusActionsPanelComponent from './StatusActionsPanelComponent';


const FormEditorView: React.FC = () => {
    const openAddQuestionModal = () => {
        useQuestionsStore.getState().setCurrentEditId(null); // Clear edit ID for new question
        useQuestionsStore.getState().setQuestionModalOpen(true); // Open the modal
    };

  return (
    <Row>
      <Col lg={8} md={12}>
        {/* Question List */}
        <Card className="mb-4">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Question List</h5>
            <Button variant="primary" size="sm" onClick={openAddQuestionModal} title="Add a new question">
              <i className="fa fa-plus me-1"></i> Add Question
            </Button>
          </Card.Header>
          <Card.Body>
            <QuestionListComponent />
          </Card.Body>
        </Card>
      </Col>
      <Col lg={4} md={12}>
        {/* JSON Status & Actions */}
        <StatusActionsPanelComponent />
      </Col>
    </Row>
  );
};

export default FormEditorView;