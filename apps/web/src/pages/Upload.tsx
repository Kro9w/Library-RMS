// apps/web/src/pages/Upload.tsx
import React, { useState } from "react";
import { trpc } from "../trpc";
import { useAuth } from "../context/AuthContext";
import { UploadDetailsModal } from "../components/UploadDetailsModal";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
// 1. FIXED: Correctly import AppRouterInputs
import type {
  AppRouter,
  AppRouterOutputs,
  AppRouterInputs,
} from "../../../api/src/trpc/trpc.router";
import { TRPCClientErrorLike } from "@trpc/client";

// 2. UPDATED: This type now matches the modal's state
type FileDetails = {
  tags: { id: string; name: string }[];
};
type AvailableTag = AppRouterOutputs["documents"]["getTags"][0];

// 3. This type will now be found correctly
type CreateDocInput = AppRouterInputs["documents"]["createDocument"];

export function Upload() {
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const { dbUser } = useAuth();
  const trpcCtx = trpc.useContext();

  const { data: availableTags } = trpc.documents.getTags.useQuery();

  const createDoc = trpc.documents.createDocument.useMutation({
    onSuccess: () => {
      trpcCtx.documents.getDocuments.invalidate();
    },
    onError: (
      error: TRPCClientErrorLike<AppRouter>,
      variables: CreateDocInput
    ) => {
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

  // 4. This function's signature now matches the modal's prop type
  const handleUploadAll = async (fileDetailsMap: Map<File, FileDetails>) => {
    if (!dbUser || !dbUser.organizationId) {
      return Promise.reject(
        new Error(
          "You must be signed in and in an organization to upload documents."
        )
      );
    }

    const uploadPromises = Array.from(fileDetailsMap.entries()).map(
      async ([file, details]) => {
        try {
          const storageRef = ref(
            storage,
            `documents/${dbUser.organizationId}/${Date.now()}-${file.name}`
          );
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);

          return createDoc.mutateAsync({
            title: file.name,
            content: "", // Add text extraction or a summary here later
            fileUrl: downloadURL,
            // 5. UPDATED: This now matches the 'details' object
            tags: details.tags.map((tag) => ({ id: tag.id })),
          });
        } catch (err) {
          console.error("Failed to process and upload file:", file.name, err);
          return Promise.reject(err);
        }
      }
    );

    await Promise.all(uploadPromises);
  };

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setStagedFiles([]);
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
        onClose={handleCloseModal}
        files={stagedFiles}
        onUploadAll={handleUploadAll}
        isUploading={createDoc.isPending}
        // 6. This prop passing is now type-safe
        availableTags={(availableTags as AvailableTag[]) || []}
      />
    </>
  );
}
