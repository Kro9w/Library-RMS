import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import { useSession } from "../contexts/SessionContext";
import { v4 as uuidv4 } from "uuid";
import { AlertModal } from "../components/AlertModal";

const Upload: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useSession();
  const user = session?.user;
  const utils = trpc.useUtils();
  const createDocMutation = trpc.documents.createDocumentRecord.useMutation();
  const bucketName = import.meta.env.VITE_SUPABASE_BUCKET_NAME;

  const [classification, setClassification] = useState<
    "INSTITUTIONAL" | "INTERNAL" | "DEPARTMENTAL" | "RESTRICTED" | "EXTERNAL"
  >("RESTRICTED");

  const acceptedTypes: Record<string, string[]> =
    classification === "INSTITUTIONAL" || classification === "INTERNAL"
      ? {
          "application/pdf": [".pdf"],
          "image/jpeg": [".jpeg", ".jpg"],
          "image/png": [".png"],
          "image/tiff": [".tiff"],
        }
      : {
          "application/pdf": [".pdf"],
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            [".docx"],
          "application/msword": [".doc"],
          "application/vnd.ms-excel": [".xls"],
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
            ".xlsx",
          ],
        };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
    },
    accept: acceptedTypes,
  });

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    if (!bucketName) {
      setError(
        "Supabase bucket name is not configured in environment variables.",
      );
      return;
    }

    setUploading(true);
    setError(null);

    const file = files[0];
    const fileExtension = file.name.split(".").pop();
    const storageKey = `${user.id}/${uuidv4()}.${fileExtension}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName) // Use the correct variable here
        .upload(storageKey, file);

      if (uploadError) {
        throw uploadError; // Supabase errors are often detailed enough
      }

      await createDocMutation.mutateAsync({
        title: file.name,
        storageKey: uploadData.path,
        storageBucket: bucketName, // Use the correct variable here
        classification,
        fileType: file.type,
      });

      setFiles([]);
      setShowAlert(true);

      await utils.documents.invalidate();
      await utils.getDashboardStats.invalidate();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Documents</h2>

      <div style={{ marginBottom: "20px" }}>
        <label htmlFor="classification">
          <strong>Visibility / Classification:</strong>
        </label>
        <select
          id="classification"
          value={classification}
          onChange={(e) => {
            setClassification(e.target.value as any);
            setFiles([]); // Clear files when changing classification to prevent invalid uploads
          }}
          style={{ marginLeft: "10px", padding: "5px" }}
        >
          <option value="RESTRICTED">Restricted (Draft / Review)</option>
          <option value="EXTERNAL">External (Outside documents)</option>
          <option value="DEPARTMENTAL">Departmental (Department)</option>
          <option value="INTERNAL">Internal (Campus Broadcast)</option>
          <option value="INSTITUTIONAL">
            Institutional (Finalized Broadcast)
          </option>
        </select>
        <p style={{ fontSize: "0.85em", color: "#666", marginTop: "5px" }}>
          {classification === "INSTITUTIONAL" || classification === "INTERNAL"
            ? "Note: Internal and Institutional broadcasts require finalized formats (PDF, JPEG, PNG, TIFF)."
            : "Note: You can upload editable drafts (DOCX, Excel) for Departmental or Restricted items."}
        </p>
      </div>

      <div
        {...getRootProps({
          className: "dropzone",
          style: {
            border: "2px dashed #ccc",
            padding: "20px",
            textAlign: "center",
            cursor: "pointer",
          },
        })}
      >
        <input {...getInputProps()} />
        <p>
          Drag 'n' drop files here, or click to select.
          <br />
          <small>
            Allowed formats: {Object.values(acceptedTypes).flat().join(", ")}
          </small>
        </p>
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

      <AlertModal
        show={showAlert}
        title="Success"
        onClose={() => setShowAlert(false)}
      >
        Upload successful!
      </AlertModal>
    </div>
  );
};

export default Upload;
