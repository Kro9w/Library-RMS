// apps/web/src/components/UploadModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "../supabase";
import { useUser } from "@supabase/auth-helpers-react";
import { trpc } from "../trpc";
import { v4 as uuidv4 } from "uuid";
import { Modal } from "bootstrap";
import mammoth from "mammoth";
import "./UploadModal.css";

interface UploadModalProps {
  show: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ show, onClose }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<
    string | undefined
  >();
  const [controlNumber, setControlNumber] = useState<string | null>(null);
  const user = useUser();
  const createDocMutation = trpc.documents.createDocumentRecord.useMutation();
  const { data: documentTypes } = trpc.documentTypes.getAll.useQuery();
  const bucketName = import.meta.env.VITE_SUPABASE_BUCKET_NAME || "documents";

  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current);
    }
  }, []);

  useEffect(() => {
    if (show) {
      modalInstanceRef.current?.show();
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show]);

  const scanForControlNumber = async (file: File) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result;
      if (arrayBuffer instanceof ArrayBuffer) {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value;
          const regex = /CONTROL NO\.([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/;
          const match = text.match(regex);
          if (match && match[2]) {
            setControlNumber(match[2].trim());
          } else {
            setControlNumber("No control number found in this document");
          }
        } catch (err) {
          console.error("Error reading docx file:", err);
          setControlNumber("NONE");
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      if (acceptedFiles.length > 0) {
        scanForControlNumber(acceptedFiles[0]);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
  });

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
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
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storageKey, file);

      if (uploadError) {
        throw uploadError;
      }

      await createDocMutation.mutateAsync({
        title: file.name,
        storageKey: uploadData.path,
        storageBucket: bucketName,
        documentTypeId: selectedDocumentType,
        fileType: file.type,
        fileSize: file.size,
        controlNumber:
          controlNumber !== "No control number found in this document"
            ? controlNumber
            : null,
      });

      setFiles([]);
      onClose();
      alert("Upload successful!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal fade" ref={modalRef} id="uploadModal" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Upload Document</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div
              {...getRootProps({
                className: `upload-dropzone${
                  isDragActive ? " dropzone-active" : ""
                }`,
              })}
            >
              <input {...getInputProps()} />
              <i className="bi bi-cloud-arrow-up-fill"></i>
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
            <div className="mb-3">
              <label htmlFor="controlNumber" className="form-label">
                Control Number
              </label>
              <input
                type="text"
                id="controlNumber"
                className="form-control"
                value={
                  controlNumber || "Drop a file to scan for a control number"
                }
                readOnly
              />
            </div>
            <div className="mb-3">
              <label htmlFor="documentType" className="form-label">
                Document Type
              </label>
              <select
                id="documentType"
                className="form-select"
                value={selectedDocumentType}
                onChange={(e) => setSelectedDocumentType(e.target.value)}
              >
                <option value="">Select a type...</option>
                {documentTypes?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="error">{error}</p>}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
