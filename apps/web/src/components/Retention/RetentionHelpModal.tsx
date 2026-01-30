import React, { useState, useEffect, useRef } from "react";
import { Modal } from "bootstrap";
import "./RetentionHelpModal.css";

interface RetentionHelpModalProps {
  show: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: "Records Lifecycle",
    content: (
      <>
        <p>
          Every document in the system follows a standardized ISO-aligned
          lifecycle to ensure compliance and proper data management.
        </p>
        <ul className="lifecycle-list">
          <li>
            <span className="badge bg-success">Active</span>
            <p>The document is in active use and readily available.</p>
          </li>
          <li>
            <span className="badge bg-secondary">Inactive</span>
            <p>
              The document is no longer in active use but must be retained for
              compliance.
            </p>
          </li>
          <li>
            <span className="badge bg-warning text-dark">Disposition</span>
            <p>
              The retention period has ended. The document is ready for its
              final action (Archive or Destroy).
            </p>
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Retention Periods",
    content: (
      <>
        <p>
          Retention periods are defined in <strong>Years</strong> and are
          configured per Document Type.
        </p>
        <div className="info-block">
          <h6>Active Duration</h6>
          <p>How long a document stays in the "Active" phase after creation.</p>
        </div>
        <div className="info-block">
          <h6>Inactive Duration</h6>
          <p>
            How long a document stays in the "Inactive" phase after the Active
            period expires.
          </p>
        </div>
        <p className="text-muted mt-3">
          <em>Example:</em> A contract might be Active for 3 years, then
          Inactive for 7 years, for a total retention of 10 years.
        </p>
      </>
    ),
  },
  {
    title: "Disposition Actions",
    content: (
      <>
        <p>
          When a document reaches the end of its retention lifecycle, it enters
          the <strong>Disposition Ready</strong> state. Administrators must
          review and execute the final action.
        </p>
        <div className="action-card archive">
          <h6>
            <i className="bi bi-archive me-2"></i>Archive
          </h6>
          <p>
            The document is marked as "Archived". It remains in the system but
            is flagged as a permanent historical record.
          </p>
        </div>
        <div className="action-card destroy">
          <h6>
            <i className="bi bi-trash me-2"></i>Destroy
          </h6>
          <p>
            The file content is <strong>permanently deleted</strong> from
            storage. The metadata record remains for audit purposes, marked as
            "Destroyed".
          </p>
        </div>
      </>
    ),
  },
  {
    title: "Prospective Policy",
    content: (
      <>
        <div className="alert alert-info">
          <i className="bi bi-info-circle-fill me-2"></i>
          <strong>Important:</strong> Changes apply to new documents only.
        </div>
        <p>
          To ensure legal compliance and data integrity, retention rules are
          "snapshotted" when a document is created.
        </p>
        <p>
          Changing the schedule in this settings panel will{" "}
          <strong>only</strong> affect documents created <em>after</em> the
          change. Existing documents will continue to follow the schedule that
          was active when they were uploaded.
        </p>
      </>
    ),
  },
];

export const RetentionHelpModal: React.FC<RetentionHelpModalProps> = ({
  show,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current);
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        onClose();
        // Reset to first step after a short delay so it re-opens fresh
        setTimeout(() => setCurrentStep(0), 300);
      });
    }
    return () => {
      modalInstanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (show) {
      modalInstanceRef.current?.show();
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      modalInstanceRef.current?.hide();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div
      className="modal fade retention-help-modal"
      ref={modalRef}
      tabIndex={-1}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Records Retention Guide</h5>
            <button
              type="button"
              className="btn-close"
              onClick={() => modalInstanceRef.current?.hide()}
            ></button>
          </div>
          <div className="modal-body">
            <div className="tutorial-container">
              <div className="step-indicator">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`step-dot ${
                      index === currentStep ? "active" : ""
                    } ${index < currentStep ? "completed" : ""}`}
                  />
                ))}
              </div>

              <div className="tutorial-content">
                <div className="text-section">
                  <h4>{steps[currentStep].title}</h4>
                  <div className="content-body">
                    {steps[currentStep].content}
                  </div>
                </div>
                {/* Visual placeholder area - styled via CSS */}
                <div className={`visual-section step-${currentStep}`}>
                  <div className="visual-placeholder-icon">
                    {currentStep === 0 && <i className="bi bi-diagram-3"></i>}
                    {currentStep === 1 && (
                      <i className="bi bi-calendar-check"></i>
                    )}
                    {currentStep === 2 && <i className="bi bi-hdd-rack"></i>}
                    {currentStep === 3 && <i className="bi bi-shield-lock"></i>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <div className="d-flex justify-content-between w-100">
              <button
                className="btn btn-outline-secondary"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Back
              </button>
              <button className="btn btn-primary" onClick={handleNext}>
                {currentStep === steps.length - 1 ? "Finish" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
