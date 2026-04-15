import { useState } from "react";
import { RecordsSeriesPanel } from "../../components/RecordsSeries/RecordsSeriesPanel";
import { DocumentTypesPanel } from "../../components/DocumentTypes/DocumentTypsPanel";

export default function AdminDocumentTypes() {
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  return (
    <div>
      <h2 style={{ color: "var(--brand)", marginBottom: "0.5rem" }}>
        Records Classification
      </h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Super admin view for establishing global standard Records Series and
        their Document Types.
      </p>

      <div className="mb-5">
        <RecordsSeriesPanel
          selectedSeriesId={selectedSeriesId}
          onSelectSeries={setSelectedSeriesId}
        />
      </div>

      {selectedSeriesId && (
        <div className="mb-4 pt-4 border-top">
          <DocumentTypesPanel selectedSeriesId={selectedSeriesId} />
        </div>
      )}
    </div>
  );
}
