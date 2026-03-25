import { DocumentTypesPanel } from "../../components/DocumentTypes/DocumentTypsPanel";

export default function AdminDocumentTypes() {
  return (
    <div>
      <h2 style={{ color: "var(--brand)", marginBottom: "0.5rem" }}>
        Manage Document Types
      </h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Super admin view for establishing global standard document types.
      </p>

      <div className="mb-4">
        <DocumentTypesPanel />
      </div>
    </div>
  );
}
