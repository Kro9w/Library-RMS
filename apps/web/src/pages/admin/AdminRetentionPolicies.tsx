import { useState } from "react";
import { RetentionPolicyPanel } from "../../components/Retention/RetentionPolicyPanel";
import { RecordsSeriesRetentionPanel } from "../../components/Retention/RecordsSeriesRetentionPanel";
import { trpc } from "../../trpc";

export default function AdminRetentionPolicies() {
  const [activeTab, setActiveTab] = useState<"series" | "documentTypes">(
    "series",
  );
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const { data: recordsSeries } = trpc.recordsSeries.getAll.useQuery();

  return (
    <div>
      <h2 style={{ color: "var(--brand)", marginBottom: "0.5rem" }}>
        Records Retention Policies
      </h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Super admin view for establishing global standard records retention and
        disposition schedules.
      </p>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "series" ? "active" : ""}`}
            onClick={() => setActiveTab("series")}
            style={{
              color: activeTab === "series" ? "var(--brand)" : "inherit",
              fontWeight: activeTab === "series" ? "500" : "normal",
            }}
          >
            Records Series
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === "documentTypes" ? "active" : ""}`}
            onClick={() => setActiveTab("documentTypes")}
            style={{
              color: activeTab === "documentTypes" ? "var(--brand)" : "inherit",
              fontWeight: activeTab === "documentTypes" ? "500" : "normal",
            }}
          >
            Document Types (Overrides)
          </button>
        </li>
      </ul>

      <div className="mb-4">
        {activeTab === "series" ? (
          <RecordsSeriesRetentionPanel />
        ) : (
          <div>
            <div className="mb-4">
              <label className="form-label fw-bold">
                Select Records Series
              </label>
              <select
                className="form-select"
                value={selectedSeriesId || ""}
                onChange={(e) => setSelectedSeriesId(e.target.value || null)}
              >
                <option value="">-- Choose a Series --</option>
                {recordsSeries?.map((series: any) => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedSeriesId ? (
              <RetentionPolicyPanel selectedSeriesId={selectedSeriesId} />
            ) : (
              <div className="alert alert-info">
                Please select a Records Series above to view its document types.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
