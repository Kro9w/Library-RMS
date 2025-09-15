import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { trpc } from "../trpc";
import { renderAsync } from "docx-preview";
import "./DocumentDetails.css"; // Import the CSS for the panel

export function DocumentDetails() {
  const { documentId } = useParams();

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  // State to control the visibility of the slide-out details panel
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const {
    data: document,
    isLoading,
    isError,
    error,
  } = trpc.getDocument.useQuery(documentId!, {
    enabled: !!documentId,
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

  if (isLoading) return <p className="container mt-4">Loading document...</p>;
  if (isError)
    return (
      <p className="container mt-4 alert alert-danger">
        Error: {error.message}
      </p>
    );
  if (!document) return <p className="container mt-4">Document not found.</p>;

  return (
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
          {/* Replaced text with an icon for a "notch" feel */}
          <i className="bi bi-info-circle-fill fs-5"></i>
        </div>

        {/* Slide-out Details Panel */}
        <div
          className={`details-panel ${isDetailsVisible ? "visible" : ""}`}
          onMouseLeave={() => setIsDetailsVisible(false)}
        >
          {/* This card is now inside the slide-out panel */}
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
              <button className="btn btn-success">
                <i className="bi bi-download me-2"></i>Download
              </button>
              <button className="btn btn-danger">
                <i className="bi bi-trash me-2"></i>Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
