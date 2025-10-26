import React from "react";
import { useParams } from "react-router-dom";
import { trpc } from "../trpc";
// FIX: Use a named import for PdfViewer
import { PdfViewer } from "../components/PdfViewer";
import "./DocumentDetails.css";

export const DocumentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: document, isLoading: isLoadingDoc } =
    trpc.documents.getById.useQuery({ id: id! }, { enabled: !!id });

  const { data: urlData, isLoading: isLoadingUrl } =
    trpc.documents.getSignedDocumentUrl.useQuery(
      { documentId: id! },
      {
        enabled: !!id,
        staleTime: 1000 * 60 * 4, // Cache URL for 4 minutes
        refetchOnWindowFocus: false,
      }
    );

  if (isLoadingDoc || isLoadingUrl) {
    return <div>Loading document...</div>;
  }

  if (!document || !urlData) {
    return <div>Document not found.</div>;
  }

  const isPdf = document.title.toLowerCase().endsWith(".pdf");

  return (
    <div className="document-details-container">
      <div className="document-viewer">
        <h3>{document.title}</h3>
        {isPdf && urlData.signedUrl ? (
          <PdfViewer fileUrl={urlData.signedUrl} />
        ) : (
          <p>
            Cannot preview this file type.
            <a
              href={urlData.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download file
            </a>
          </p>
        )}
      </div>
      <div className="document-metadata">
        <h4>Details</h4>
        <p>
          <strong>Owner:</strong> {document.uploadedBy?.name || "N/A"}
        </p>
        <p>
          <strong>Created:</strong>{" "}
          {new Date(document.createdAt).toLocaleDateString()}
        </p>
        {/* TODO: Add Tagging UI, Access Control UI here */}
      </div>
    </div>
  );
};
