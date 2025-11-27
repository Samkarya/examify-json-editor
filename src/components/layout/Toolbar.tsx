import React from 'react';
import { useQuestionsStore } from '../../store/questionsStore';
import { APP_NAME } from '../../constants';
import { toast } from 'react-toastify';
import { Dropdown } from 'react-bootstrap';
import { Upload, Download, CheckCircle, HelpCircle, FileCode, FileText, Code, Printer } from 'lucide-react';
import classNames from 'classnames';

const Toolbar: React.FC = () => {
    const setImportModalOpen = useQuestionsStore((state) => state.setImportModalOpen);
    const setExportModalOpen = useQuestionsStore((state) => state.setExportModalOpen);
    const setHelpModalOpen = useQuestionsStore((state) => state.setHelpModalOpen);
    const activeMainView = useQuestionsStore((state) => state.activeMainView);
    const setActiveMainView = useQuestionsStore(state => state.setActiveMainView);
    const triggerFormValidationStore = useQuestionsStore((state) => state.triggerFormValidation);
    const triggerJsonEditorValidationStore = useQuestionsStore((state) => state.triggerJsonEditorValidation);

    const questions = useQuestionsStore((state) => state.questions);
    const exportFileName = useQuestionsStore((state) => state.exportFileName);

    const handlePrint = (showAnswers: boolean) => {
        localStorage.setItem('examify-print-data', JSON.stringify(questions));
        localStorage.setItem('examify-print-title', exportFileName.replace('.json', ''));
        window.open(`/?mode=print&showAnswers=${showAnswers}`, '_blank');
    };

    const handleValidateGlobalClick = () => {
        if (activeMainView === 'form') {
            const isValid = triggerFormValidationStore();
            if (isValid) toast.success("Form Data is Valid!");
            else toast.error("Form Data has validation issues.");
        } else {
            const isValid = triggerJsonEditorValidationStore();
            if (isValid) toast.success("JSON is Valid!");
            else toast.error("JSON has structural issues.");
        }
    };

    return (
        <div className="d-flex align-items-center justify-content-between px-3 border-bottom bg-white" style={{ height: 'var(--header-height)' }}>
            <div className="d-flex align-items-center">
                <div className="bg-primary text-white rounded p-1 me-2 d-flex align-items-center justify-content-center" style={{ width: 28, height: 28 }}>
                    <FileCode size={18} />
                </div>
                <span className="fw-bold text-primary me-4">{APP_NAME}</span>

                {/* View Switcher */}
                <div className="bg-light rounded p-1 d-flex">
                    <button
                        className={classNames("btn btn-sm d-flex align-items-center px-3", { "btn-white shadow-sm fw-bold text-primary": activeMainView === 'form', "text-secondary border-0": activeMainView !== 'form' })}
                        onClick={() => setActiveMainView('form')}
                    >
                        <FileText size={14} className="me-2" /> Form
                    </button>
                    <button
                        className={classNames("btn btn-sm d-flex align-items-center px-3", { "btn-white shadow-sm fw-bold text-primary": activeMainView === 'json', "text-secondary border-0": activeMainView !== 'json' })}
                        onClick={() => setActiveMainView('json')}
                    >
                        <Code size={14} className="me-2" /> JSON
                    </button>
                </div>
            </div>

            <div className="d-flex align-items-center gap-2">
                <button className="btn btn-sm btn-light border d-flex align-items-center" onClick={() => setImportModalOpen(true)}>
                    <Upload size={14} className="me-2" /> Import
                </button>
                <button className="btn btn-sm btn-light border d-flex align-items-center" onClick={() => setExportModalOpen(true)}>
                    <Download size={14} className="me-2" /> Export
                </button>

                <Dropdown>
                    <Dropdown.Toggle variant="light" size="sm" className="border d-flex align-items-center">
                        <Printer size={14} className="me-2" /> PDF
                    </Dropdown.Toggle>

                    <Dropdown.Menu>
                        <Dropdown.Item onClick={() => handlePrint(true)}>With Answers & Explanations</Dropdown.Item>
                        <Dropdown.Item onClick={() => handlePrint(false)}>Practice Mode (No Answers)</Dropdown.Item>
                    </Dropdown.Menu>
                </Dropdown>

                <div className="vr mx-1"></div>
                <button className="btn btn-sm btn-primary-custom text-white d-flex align-items-center" onClick={handleValidateGlobalClick}>
                    <CheckCircle size={14} className="me-2" /> Validate
                </button>
                <button className="btn btn-sm btn-link text-secondary" onClick={() => setHelpModalOpen(true)}>
                    <HelpCircle size={18} />
                </button>
            </div>
        </div>
    );
};

export default Toolbar;
