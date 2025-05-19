// src/components/common/LoadingModal.tsx
import React from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { useQuestionsStore } from '../../store/questionsStore';

const LoadingModal: React.FC = () => {
  const isLoading = useQuestionsStore((state) => state.isLoading);
  const loadingMessage = useQuestionsStore((state) => state.loadingMessage);

  if (!isLoading) return null;

  return (
    <Modal
      show={isLoading}
      onHide={() => {}} // Prevent closing by clicking outside or Esc
      backdrop="static"
      keyboard={false}
      centered
      dialogClassName="modal-dialog-centered" // Ensure Bootstrap class for centering
    >
      <Modal.Body className="text-center p-4">
        <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} className="mb-3" />
        <h5 id="loadingModalTitle">{loadingMessage || 'Processing...'}</h5>
        <p className="mb-0 text-muted">Please wait.</p>
      </Modal.Body>
    </Modal>
  );
};

export default LoadingModal;