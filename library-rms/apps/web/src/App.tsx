// /apps/web/src/App.tsx
import React, { useState } from "react";
import { trpc } from "./trpc";
import DocViewer, { DocViewerRenderers } from "react-doc-viewer";
import { useEffect } from "react";

type DocumentType = "memorandum" | "office_order" | "communication_letter";

type DocumentTypeObject = {
  id: string;
  title: string;
  type: DocumentType;
  content: string; // stored as JSON array of bytes
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export default function App() {
  const trpcCtx = trpc.useContext();
  const {
    data: documents,
    isLoading,
    isError,
    error,
  } = trpc.getDocuments.useQuery();

  const createDoc = trpc.createDocument.useMutation({
    onSuccess: () => trpcCtx.getDocuments.invalidate(),
  });

  const deleteDoc = trpc.deleteDocument.useMutation({
    onSuccess: () => {
      trpcCtx.getDocuments.invalidate();
      setSelectedDoc(null);
    },
  });

  const [selectedDoc, setSelectedDoc] = useState<DocumentTypeObject | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    return () => {
      if (selectedDoc) {
        const urls = getDocViewerItems().map((d) => d.uri);
        urls.forEach((u) => URL.revokeObjectURL(u));
      }
    };
  }, [selectedDoc]);

  if (isLoading) return <p>Loading documents...</p>;
  if (isError) return <p>Error loading documents: {error?.message}</p>;

  const getDocViewerItems = () => {
    if (!selectedDoc) return [];

    try {
      const parsed = JSON.parse(selectedDoc.content);
      if (Array.isArray(parsed)) {
        // Convert JSON array to Uint8Array
        const uint8Array = new Uint8Array(parsed);

        // Create a Blob with proper MIME type
        const blob = new Blob([uint8Array], {
          type: selectedDoc.title.endsWith(".pdf")
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // Convert Blob to object URL
        const url = URL.createObjectURL(blob);

        return [{ uri: url }];
      }
    } catch (err) {
      console.error("Failed to parse document content:", err);
    }

    return [];
  };

  return (
    <div className="container mt-5">
      <h1>📂 Document Management</h1>

      {/* Upload Section */}
      <h2>Upload Document</h2>
      <input
        type="file"
        accept=".docx,.pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setSelectedFile(file);
        }}
      />
      <button
        className="btn btn-primary ms-2"
        onClick={async () => {
          if (!selectedFile) return;
          const arrayBuffer = await selectedFile.arrayBuffer();
          const content = JSON.stringify(
            Array.from(new Uint8Array(arrayBuffer))
          );
          await createDoc.mutateAsync({
            title: selectedFile.name,
            type: "memorandum" as DocumentType, // you can add a selector for type
            content,
            tags: [],
          });
          setSelectedFile(null);
        }}
        disabled={!selectedFile}
      >
        Upload
      </button>

      {/* Document List */}
      <h2 className="mt-4">Documents</h2>
      <ul className="list-group">
        {documents?.length ? (
          documents.map((doc) => (
            <li
              key={doc.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div
                style={{ cursor: "pointer" }}
                onClick={() =>
                  setSelectedDoc({ ...doc, type: doc.type as DocumentType })
                }
              >
                <strong>{doc.title}</strong> (ID: {doc.id}) — {doc.type}
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => deleteDoc.mutate(doc.id)}
              >
                Delete
              </button>
            </li>
          ))
        ) : (
          <li className="list-group-item">No documents found</li>
        )}
      </ul>

      {/* Preview Section */}
      {selectedDoc && (
        <div className="mt-4">
          <h3>Preview: {selectedDoc.title}</h3>
          <DocViewer
            documents={getDocViewerItems()}
            pluginRenderers={DocViewerRenderers}
          />
        </div>
      )}
    </div>
  );
}
