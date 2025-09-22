import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import { renderAsync } from "docx-preview";
import "./DocumentDetails.css";
import { ConfirmModal } from "../components/ConfirmModal";

export function DocumentDetails() {
  const { documentId } = useParams();
  const navigate = useNavigate();

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  // 1. State to manage the visibility of the delete confirmation modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    data: document,
    isLoading,
    isError,
    error,
  } = trpc.getDocument.useQuery(documentId!, {
    enabled: !!documentId,
  });

  const trpcCtx = trpc.useContext();
  const deleteDoc = trpc.deleteDocument.useMutation({
    onSuccess: () => {
      trpcCtx.getDocuments.invalidate();
      navigate("/documents");
    },
    onError: (error) => {
      alert(`Failed to delete document: ${error.message}`);
    },
    // Close the modal whether the deletion succeeds or fails
    onSettled: () => {
      setIsDeleteModalOpen(false);
    },
  });

  useEffect(() => {
    if (!document || !document.content) {
      setPdfPreviewUrl(null);
      return;
    }

    let url: string | null = null;
    const processDocument = async () => {
      try {
        const parsedContent = JSON.parse(document.content);
        if (Array.isArray(parsedContent)) {
          const uint8Array = new Uint8Array(parsedContent);

          if (document.title.toLowerCase().endsWith(".pdf")) {
            const blob = new Blob([uint8Array], { type: "application/pdf" });
            url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
          } else if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = "";
            await renderAsync(uint8Array.buffer, docxContainerRef.current);
          }
        }
      } catch (err) {
        console.error("Failed to process document content:", err);
        if (docxContainerRef.current) {
          docxContainerRef.current.innerText = "Error rendering document.";
        }
      }
    };

    processDocument();

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [document]);

  // 2. This function is now called when the user clicks the main delete button
  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true); // This opens the modal
  };

  // 3. This function is passed to the modal and is called when the user confirms
  const handleConfirmDelete = () => {
    if (document) {
      deleteDoc.mutate(document.id);
    }
  };

  const handleDownload = () => {
    if (document && document.content) {
      try {
        const parsedContent = JSON.parse(document.content);
        const uint8Array = new Uint8Array(parsedContent);
        const mimeType = document.title.toLowerCase().endsWith(".pdf")
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const blob = new Blob([uint8Array], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const a = window.document.createElement("a");
        a.href = url;
        a.download = document.title;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to prepare file for download:", err);
        alert("Could not prepare file for download.");
      }
    }
  };

  if (isLoading) return <p className="container mt-4">Loading document...</p>;
  if (isError)
    return (
      <p className="container mt-4 alert alert-danger">
        Error: {error.message}
      </p>
    );
  if (!document) return <p className="container mt-4">Document not found.</p>;

  return (
    // Use a React Fragment to render the page and the modal side-by-side
    <>
      <div className="container mt-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2>{document.title}</h2>
          <Link to="/documents" className="btn btn-secondary">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Documents
          </Link>
        </div>
        <hr />

        <div className="details-page-container">
          {/* Main Preview Area */}
          <div className="preview-container">
            {document.title.toLowerCase().endsWith(".pdf") ? (
              pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  title={document.title}
                  width="100%"
                  height="100%"
                  style={{ border: "none" }}
                />
              ) : (
                <p className="text-muted text-center pt-5">
                  Generating PDF preview...
                </p>
              )
            ) : (
              <div ref={docxContainerRef} style={{ padding: "1rem" }}>
                <p className="text-muted text-center pt-5">
                  Generating DOCX preview...
                </p>
              </div>
            )}
          </div>

          {/* Trigger Tab for Details Panel */}
          <div
            className="details-trigger-tab"
            onMouseEnter={() => setIsDetailsVisible(true)}
          >
            <i className="bi bi-info-circle-fill fs-5"></i>
          </div>

          {/* Slide-out Details Panel */}
          <div
            className={`details-pane ${isDetailsVisible ? "visible" : ""}`}
            onMouseLeave={() => setIsDetailsVisible(false)}
          >
            <div className="card h-100">
              <div className="card-header">
                <i className="bi bi-info-circle me-2"></i>Document Details
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  <li className="list-group-item">
                    <strong>Type:</strong> {document.type}
                  </li>
                  <li className="list-group-item">
                    <strong>Uploaded:</strong>{" "}
                    {new Date(document.createdAt).toLocaleString()}
                  </li>
                  <li className="list-group-item">
                    <strong>Tags:</strong>{" "}
                    {document.tags.map((tag) => (
                      <span key={tag} className="badge bg-primary me-1">
                        {tag}
                      </span>
                    ))}
                  </li>
                </ul>
              </div>
              <div className="card-footer d-grid gap-2">
                <button className="btn btn-success" onClick={handleDownload}>
                  <i className="bi bi-download me-2"></i>Download
                </button>
                {/* 4. The Delete button now opens the modal */}
                <button className="btn btn-danger" onClick={handleDeleteClick}>
                  <i className="bi bi-trash me-2"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. The modal is rendered here and controlled by state */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete "${document.title}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isConfirming={deleteDoc.isPending}
      />
    </>
  );
}
