// src/components/common/AppModal.tsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

interface AppModalProps {
  show: boolean;
  onHide: () => void;
  title: string;
  children: React.ReactNode; // For the modal body
  footerButtons?: React.ReactNode; // For custom footer buttons
  size?: 'sm' | 'lg' | 'xl';
  backdrop?: 'static' | boolean;
  scrollable?: boolean;
  dialogClassName?: string;
}

const AppModal: React.FC<AppModalProps> = ({
  show,
  onHide,
  title,
  children,
  footerButtons,
  size,
  backdrop = true, // Default to normal backdrop
  scrollable,
  dialogClassName,
}) => {
  return (
    <Modal 
        show={show} 
        onHide={onHide} 
        size={size} 
        backdrop={backdrop} 
        scrollable={scrollable}
        dialogClassName={dialogClassName}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      {footerButtons && (
        <Modal.Footer>
            {footerButtons}
        </Modal.Footer>
      )}
       {!footerButtons && ( // Default footer if none provided
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Modal.Footer>
      )}
    </Modal>
  );
};

export default AppModal;