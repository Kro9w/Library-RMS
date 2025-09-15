import React, { useState } from "react";
import { trpc } from "../../api/src/trpc/trpc";

// Define the document type for clarity
type DocumentType = "memorandum" | "office_order" | "communication_letter";

export function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // State for form inputs
  const [docType, setDocType] = useState<DocumentType>("memorandum");
  const [tags, setTags] = useState("");

  const trpcCtx = trpc.useContext();

  // 1. Re-add the tRPC mutation hook for creating documents
  const createDoc = trpc.createDocument.useMutation({
    onSuccess: () => {
      // Invalidate the documents query to refetch the list on other pages
      trpcCtx.getDocuments.invalidate();
    },
    onError: (error) => {
      // Simple error handling
      alert(`Upload failed: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // 2. Create the function to handle the actual upload logic
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent the default form submission which reloads the page

    if (files.length === 0) return;

    // Process and upload each file
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        // This is the logic that converts the file to a JSON string for the database
        const content = JSON.stringify(Array.from(new Uint8Array(arrayBuffer)));

        await createDoc.mutateAsync({
          title: file.name,
          type: docType,
          content,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean), // Split and clean tags
        });
      } catch (err) {
        console.error("Failed to upload file:", file.name, err);
      }
    }

    // Clear the form after a successful upload
    setFiles([]);
    setTags("");
    alert("Upload complete!");
  };

  return (
    <div className="container mt-4">
      <h1>Upload Documents</h1>
      <div className="row">
        <div className="col-md-6">
          {/* Drag and Drop Zone */}
          <div
            className={`p-5 border-2 border-dashed rounded text-center ${
              isDragging ? "border-primary bg-light" : "border-secondary"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <i className="bi bi-cloud-arrow-up fs-1"></i>
            <p>Drag & drop files here, or</p>
            <label htmlFor="file-upload" className="btn btn-primary">
              Browse Files
            </label>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".docx,.pdf"
              className="d-none"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="col-md-6">
          <h4>Files to Upload ({files.length})</h4>
          {files.length === 0 ? (
            <p className="text-muted">No files selected.</p>
          ) : (
            <ul
              className="list-group mb-3"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {files.map((file, index) => (
                <li key={index} className="list-group-item">
                  {file.name}
                </li>
              ))}
            </ul>
          )}

          {/* 3. Hook the form's onSubmit to our upload function */}
          <form onSubmit={handleUpload}>
            <div className="mb-3">
              <label htmlFor="type" className="form-label">
                Document Type
              </label>
              <select
                id="type"
                className="form-select"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
              >
                <option value="memorandum">memorandum</option>
                <option value="office_order">office_order</option>
                <option value="communication_letter">
                  communication_letter
                </option>
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="tags" className="form-label">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                id="tags"
                className="form-control"
                placeholder="e.g. finance, urgent"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-success w-100"
              disabled={files.length === 0 || createDoc.isPending} // <--- Use isPending instead
            >
              {createDoc.isPending ? ( // <--- Use isPending instead
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Uploading...
                </>
              ) : (
                <>
                  <i className="bi bi-upload me-2"></i>
                  Start Upload ({files.length})
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
