import React, { ReactNode } from 'react';
import { ToastContainer } from 'react-toastify';

interface IDEContainerProps {
    children: ReactNode;
}

const IDEContainer: React.FC<IDEContainerProps> = ({ children }) => {
    return (
        <div className="ide-container">
            {children}

            {/* Global Toast Container positioned for the IDE layout */}
            <ToastContainer
                position="bottom-right"
                autoClose={4000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
                style={{ bottom: '40px', right: '20px' }} // Adjust to sit above status bar
            />
        </div>
    );
};

export default IDEContainer;
