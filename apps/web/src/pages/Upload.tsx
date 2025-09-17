import React, { useState } from "react";
import { trpc } from "../trpc";
import { useUser } from "@clerk/clerk-react";
import { UploadDetailsModal } from "../components/UploadDetailsModal";

type DocumentType = "memorandum" | "office_order" | "communication_letter";
type FileDetails = {
  docType: DocumentType;
  tags: string[];
};

export function Upload() {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { user } = useUser();
  const trpcCtx = trpc.useContext();

  const { data: availableTags } = trpc.getTags.useQuery();

  const createDoc = trpc.createDocument.useMutation({
    onSuccess: () => {
      trpcCtx.getDocuments.invalidate();
    },
    onError: (error, variables) => {
      alert(`Upload failed for ${variables.title}: ${error.message}`);
    },
  });

  const handleFilesSelected = (selectedFiles: File[]) => {
    setStagedFiles((prev) => {
      const newFiles = selectedFiles.filter(
        (sf) => !prev.some((pf) => pf.name === sf.name)
      );
      return [...prev, ...newFiles];
    });
    setIsUploadModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesSelected(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleUploadAll = async (fileDetailsMap: Map<File, FileDetails>) => {
    if (!user) {
      // It's better to reject the promise so the modal knows the upload failed
      return Promise.reject(
        new Error("You must be signed in to upload documents.")
      );
    }

    const uploadPromises = Array.from(fileDetailsMap.entries()).map(
      async ([file, details]) => {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const content = JSON.stringify(
            Array.from(new Uint8Array(arrayBuffer))
          );

          return createDoc.mutateAsync({
            title: file.name,
            type: details.docType,
            content,
            tags: details.tags,
            userID: user.id,
            uploadedBy:
              user.fullName ||
              user.primaryEmailAddress?.emailAddress ||
              "Unknown User",
          });
        } catch (err) {
          console.error("Failed to process and upload file:", file.name, err);
          return Promise.reject(err);
        }
      }
    );

    // Await the uploads, but do not clear the files here.
    await Promise.all(uploadPromises);
  };

  // This new function will handle closing the modal and clearing the files.
  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setStagedFiles([]); // Clear the files only after the modal is closed.
  };

  return (
    <>
      <div className="container mt-4">
        <h1>Upload Documents</h1>
        <p>Select files to begin the upload process.</p>
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

      <UploadDetailsModal
        isOpen={isUploadModalOpen}
        onClose={handleCloseModal} // Use the new handler
        files={stagedFiles}
        onUploadAll={handleUploadAll}
        isUploading={createDoc.isPending}
        availableTags={availableTags || []}
      />
    </>
  );
}
