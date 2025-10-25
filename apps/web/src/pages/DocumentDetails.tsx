import React, { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import { renderAsync } from "docx-preview";
import "./DocumentDetails.css";
import { ConfirmModal } from "../components/ConfirmModal";
// 1. ADDED: Import the error type
import { TRPCClientErrorLike } from "@trpc/client";
import { AppRouter } from "../../../api/src/trpc/trpc.router";

export function DocumentDetails() {
  const { documentId } = useParams(); // This is a string | undefined
  const navigate = useNavigate();

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const {
    data: document,
    isLoading,
    isError,
    error,
  } = trpc.documents.getDocument.useQuery(documentId!, { // 2. FIXED: Use the nested procedure 'trpc.documents.getDocument'
    enabled: !!documentId,
  });

  const trpcCtx = trpc.useContext();
  // 3. FIXED: Use the nested procedure 'trpc.documents.deleteDocument'
  const deleteDoc = trpc.documents.deleteDocument.useMutation({
    onSuccess: () => {
      // 4. FIXED: Invalidate the correct procedure
      trpcCtx.documents.getDocuments.invalidate();
      navigate("/documents");
    },
    // 5. FIXED: Correctly typed the 'error' parameter
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      alert(`Failed to delete document: ${error.message}`);
    },
    onSettled: () => {
      setIsDeleteModalOpen(false);
    },
  });

  useEffect(() => {
    if (!document || !document.content) {
      setPdfPreviewUrl(null);
      return;
    }

    // The 'content' field is just a string in the new schema.
    // The docx-preview logic you have is based on the old schema
    // where 'content' was a JSON string of a Uint8Array.
    // This logic will likely fail.
    // For now, we'll just display the raw text content.
    if (docxContainerRef.current) {
      docxContainerRef.current.innerText = document.content;
    }

    // If you store file bytes as a string, you need to adjust
    // the logic here. For example, if it's base64:
    /*
    try {
      const byteString = atob(document.content);
      const uint8Array = new Uint8Array(byteString.length);
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      
      if (document.fileUrl.toLowerCase().endsWith(".pdf")) {
        const blob = new Blob([uint8Array], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
        
        return () => { URL.revokeObjectURL(url); };
      } else if (docxContainerRef.current) {
        docxContainerRef.current.innerHTML = "";
        renderAsync(uint8Array.buffer, docxContainerRef.current);
      }
    } catch (err) {
      console.error("Failed to process document content:", err);
      if (docxContainerRef.current) {
        docxContainerRef.current.innerText = "Error rendering document.";
      }
    }
    */
  }, [document]);

  const handleDeleteClick = () => {
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (document) {
      deleteDoc.mutate(document.id);
    }
  };

  const handleDownload = () => {
    // This also assumes 'content' is bytes.
    // A better approach is to download from 'document.fileUrl'
    if (document?.fileUrl) {
      const a = window.document.createElement("a");
      a.href = document.fileUrl; // Use the direct URL
      a.download = document.title;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    } else {
      alert("No file URL available for download.");
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
            {/* 6. SIMPLIFIED: Preview logic based on fileUrl */}
            {document.fileUrl.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={document.fileUrl} // Use fileUrl directly
                title={document.title}
                width="100%"
                height="100%"
                style={{ border: "none" }}
              />
            ) : (
              // docx-preview must be done on the client side
              // This just shows the text content for now
              <div ref={docxContainerRef} style={{ padding: "1rem" }}>
                <p>Preview for DOCX is not fully implemented.</p>
                <p>Content: {document.content}</p>
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
                  {/* 7. REMOVED: 'document.type' no longer exists */}
                  <li className="list-group-item">
                    <strong>Uploaded:</strong>{" "}
                    {new Date(document.createdAt).toLocaleString()}
                  </li>
                  <li className="list-group-item">
                    <strong>Tags:</strong>{" "}
                    {/* 8. FIXED: Mapped new tag structure */}
                    {document.tags.map((docTag) => (
                      <span
                        key={docTag.tag.id}
                        className="badge bg-primary me-1"
                      >
                        {docTag.tag.name}
                      </span>
                    ))}
                    {document.tags.length === 0 && (
                      <span className="text-muted">No tags</span>
                    )}
                  </li>
                </ul>
              </div>
              <div className="card-footer d-grid gap-2">
                <button className="btn btn-success" onClick={handleDownload}>
                  <i className="bi bi-download me-2"></i>Download
                </button>
                <button className="btn btn-danger" onClick={handleDeleteClick}>
                  <i className="bi bi-trash me-2"></i>Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        title="Confirm Deletion"
        message={`Are you sure you want to permanently delete "${document.title}"? This action cannot be undone.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isConfirming={deleteDoc.isPending} // This is correct
      />
    </>
  );
}
