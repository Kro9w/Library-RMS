import { useState } from "react";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import { v4 as uuidv4 } from "uuid";
import mammoth from "mammoth";

export function useUploadDocument(onClose: () => void) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | undefined>();
  const [controlNumber, setControlNumber] = useState<string | null>(null);
  const [classification, setClassification] = useState<
    "INSTITUTIONAL" | "INTERNAL" | "DEPARTMENTAL" | "RESTRICTED" | "FOR_APPROVAL" | "EXTERNAL"
  >("RESTRICTED");
  const [transitRoute, setTransitRoute] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const { data: me } = trpc.user.getMe.useQuery();
  const utils = trpc.useUtils();
  const createDocMutation = trpc.documents.createDocumentRecord.useMutation();
  const { data: documentTypes } = trpc.documentTypes.getAll.useQuery();
  const { data: storageConfig } = trpc.documents.getStorageConfig.useQuery();
  const { data: departmentsResponse } = trpc.user.getDepartments.useQuery(
    { campusId: me?.campusId as string },
    { enabled: !!me?.campusId },
  );

  const bucketName = storageConfig?.bucketName;

  const highestRoleLevel =
    me?.roles && me.roles.length > 0
      ? me.roles.reduce((min: number, role: any) => Math.min(min, role.level), Infinity)
      : 4;

  const canManageDocs = me?.roles?.some((r: any) => r.canManageDocuments) ?? false;
  const canManageInstitution = me?.roles?.some((r: any) => r.canManageInstitution) ?? false;

  const scanForControlNumber = async (f: File) => {
    setIsScanning(true);
    setControlNumber(null);

    if (f.name.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result;
        if (arrayBuffer instanceof ArrayBuffer) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            const match = result.value.match(/CSU-([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/);
            setControlNumber(match?.[0]?.trim() ?? null);
          } catch {
            setControlNumber(null);
          } finally {
            setIsScanning(false);
          }
        } else {
          setIsScanning(false);
        }
      };
      reader.onerror = () => setIsScanning(false);
      reader.readAsArrayBuffer(f);
    } else {
      try {
        const formData = new FormData();
        formData.append("file", f);

        const response = await fetch("/api/documents/extract-ocr", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          setControlNumber(data.controlNumber ?? null);
        } else {
          setControlNumber(null);
        }
      } catch (err) {
        console.error("OCR API error:", err);
        setControlNumber(null);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleUpload = async (userId: string | undefined) => {
    if (!file || !userId || !bucketName) {
      setError("Missing required information.");
      return;
    }
    setUploading(true);
    setError(null);

    const fileExtension = file.name.split(".").pop();
    const storageKey = `${userId}/${uuidv4()}.${fileExtension}`;

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storageKey, file);

      if (uploadError) throw uploadError;

      await createDocMutation.mutateAsync({
        title: file.name,
        storageKey: uploadData.path,
        storageBucket: bucketName,
        documentTypeId: selectedDocumentType,
        fileType: file.type,
        fileSize: file.size,
        classification,
        controlNumber: controlNumber ?? null,
        transitRoute: classification === "FOR_APPROVAL" ? transitRoute : undefined,
      });

      setFile(null);
      setControlNumber(null);
      setTransitRoute([]);
      setClassification("RESTRICTED");
      onClose();
      await utils.documents.invalidate();
      await utils.getDashboardStats.invalidate();
    } catch (err: any) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return {
    state: {
      file, setFile,
      uploading,
      error, setError,
      selectedDocumentType, setSelectedDocumentType,
      controlNumber, setControlNumber,
      classification, setClassification,
      transitRoute, setTransitRoute,
      isScanning,
    },
    data: {
      documentTypes,
      departmentsResponse,
      bucketName,
    },
    auth: {
      highestRoleLevel,
      canManageDocs,
      canManageInstitution,
    },
    actions: {
      scanForControlNumber,
      handleUpload,
    }
  };
}
