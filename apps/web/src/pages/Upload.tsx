import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../supabase";
import { useUser } from "@supabase/auth-helpers-react";
import { trpc } from "../trpc";
import { v4 as uuidv4 } from "uuid";

const Upload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useUser();
  const createDocMutation = trpc.documents.createDocumentRecord.useMutation();
  // 1. FIX: Get the bucket name from environment variables
  const bucketName = import.meta.env.VITE_SUPABASE_BUCKET_NAME || "documents"; // Use env var, fallback to 'documents'

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
  });

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    // 2. FIX: Check if bucketName is actually set
    if (!bucketName) {
      setError(
        "Supabase bucket name is not configured in environment variables."
      );
      return;
    }

    setUploading(true);
    setError(null);

    const file = files[0];
    const fileExtension = file.name.split(".").pop();
    const storageKey = `${user.id}/${uuidv4()}.${fileExtension}`;

    try {
      // 3. FIX: Use the bucketName variable from env/fallback
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName) // Use the correct variable here
        .upload(storageKey, file);

      if (uploadError) {
        throw uploadError; // Supabase errors are often detailed enough
      }

      // 4. FIX: Use the bucketName variable from env/fallback
      await createDocMutation.mutateAsync({
        title: file.name,
        storageKey: uploadData.path,
        storageBucket: bucketName, // Use the correct variable here
      });

      setFiles([]);
      alert("Upload successful!");
      // TODO: Invalidate queries to refetch document list (e.g., utils.documents.getAll.invalidate())
    } catch (err: any) {
      console.error(err);
      // Display Supabase error directly if available
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Documents</h2>
      <div {...getRootProps({ className: "dropzone" })}>
        <input {...getInputProps()} />
        <p>Drag 'n' drop PDF or DOCX files here, or click to select</p>
      </div>
      <aside>
        <h4>Files</h4>
        <ul>
          {files.map((file) => (
            <li key={file.name}>
              {file.name} - {file.size} bytes
            </li>
          ))}
        </ul>
      </aside>
      <button onClick={handleUpload} disabled={uploading || files.length === 0}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default Upload;
