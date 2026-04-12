import React from "react";
import { formatUserName } from "../../utils/user";

const formatFileTypeDisplay = (
  fileType: string | null | undefined,
  title: string,
): string => {
  if (fileType) {
    switch (fileType) {
      case "application/pdf":
        return "PDF";
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      case "application/msword":
        return "DOCX";
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return "XLSX";
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      case "application/vnd.ms-powerpoint":
        return "PPTX";
      case "image/jpeg":
        return "JPEG";
      case "image/png":
        return "PNG";
      case "text/plain":
        return "TXT";
      default: {
        const simpleType = fileType.split("/")[1];
        if (simpleType) return simpleType.toUpperCase();
      }
    }
  }
  const extension = title.split(".").pop();
  return extension ? extension.toUpperCase() : "N/A";
};

export const VersionHistoryTable: React.FC<{
  versions: any[];
  onDownload: (versionId: string) => void;
}> = ({ versions, onDownload }) => {
  return (
    <div className="document-table-card mt-4 mb-4">
      <div className="card-body">
        <h5 className="card-title">
          <i className="bi bi-clock-history"></i>
          Version History
        </h5>
        <hr style={{ margin: "0 0 16px" }} />
        {versions && versions.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Date</th>
                  <th>Uploaded By</th>
                  <th>Type</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((v: any) => (
                  <tr key={v.id}>
                    <td>
                      <span className="version-badge">v{v.versionNumber}</span>
                    </td>
                    <td style={{ fontSize: "13px" }}>
                      {new Date(v.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: "13px" }}>
                      {formatUserName(v.uploadedBy)}
                    </td>
                    <td style={{ fontSize: "13px" }}>
                      {formatFileTypeDisplay(v.fileType, "File")}
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => onDownload(v.id)}
                      >
                        <i className="bi bi-download me-1"></i> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
            No version history available.
          </p>
        )}
      </div>
    </div>
  );
};
