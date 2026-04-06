import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { trpc } from "../trpc";
import "./ArchivesPage.css";

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
};

export const ArchivesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"archives" | "destruction">(
    "archives",
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 10;

  const { data: _archivedData, isLoading: isLoadingArchived } =
    trpc.archives.getArchivedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "archives" },
    );

  const { data: _destroyedData, isLoading: isLoadingDestroyed } =
    trpc.archives.getDestroyedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "destruction" },
    );

  // Fetch totals for both tabs (page 1, size 1) for the stat strip
  const { data: archiveTotals } = trpc.archives.getArchivedDocuments.useQuery({
    page: 1,
    pageSize: 1,
  });
  const { data: destroyTotals } = trpc.archives.getDestroyedDocuments.useQuery({
    page: 1,
    pageSize: 1,
  });

  const utils = trpc.useUtils();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(
    null,
  );
  const [downloadingManifestId, setDownloadingManifestId] = useState<
    string | null
  >(null);

  const handleDownloadManifest = async (id: string) => {
    try {
      setDownloadingManifestId(id);
      const result = await utils.archives.getArchiveManifestUrl.fetch({ id });
      if (result.signedUrl) window.open(result.signedUrl, "_blank");
    } catch {
      alert("Failed to fetch manifest");
    } finally {
      setDownloadingManifestId(null);
    }
  };

  const handleDownloadFile = async (documentId: string) => {
    try {
      setDownloadingFileId(documentId);
      const result = await utils.documents.getSignedDocumentUrl.fetch({
        documentId,
      });
      if (result.signedUrl) window.open(result.signedUrl, "_blank");
    } catch {
      alert("Failed to fetch document file");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const isLoading =
    activeTab === "archives" ? isLoadingArchived : isLoadingDestroyed;
  const archivedData: any = _archivedData;
  const destroyedData: any = _destroyedData;
  const data: any = activeTab === "archives" ? archivedData : destroyedData;
  const documents = data?.documents || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const groupedDocuments = React.useMemo(() => {
    const groups: Record<string, { docs: typeof documents; color?: string }> =
      {};
    documents.forEach((doc: any) => {
      const typeName = doc.documentType?.name || "Uncategorized";
      if (!groups[typeName]) {
        groups[typeName] = { docs: [], color: doc.documentType?.color };
      }
      groups[typeName].docs.push(doc);
    });
    return groups;
  }, [documents]);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );
  const toggleAccordion = (groupName: string) => {
    setOpenAccordions((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const switchTab = (tab: "archives" | "destruction") => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="archives-page-header">
        <div>
          <h2>Disposition Register</h2>
          <p className="text-muted mb-0" style={{ fontSize: "13px" }}>
            Institutional records that have been archived or permanently
            destroyed per retention schedule.
          </p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="archives-stats-strip">
        <div className="archives-stat-chip">
          <div className="archives-stat-chip-icon icon-archive">
            <i className="bi bi-archive" />
          </div>
          <div className="d-flex flex-column">
            <span className="archives-stat-chip-label">Archived</span>
            <span className="archives-stat-chip-value">
              {archiveTotals?.totalCount ?? "—"}
            </span>
          </div>
        </div>
        <div className="archives-stat-chip">
          <div className="archives-stat-chip-icon icon-destroy">
            <i className="bi bi-trash3" />
          </div>
          <div className="d-flex flex-column">
            <span className="archives-stat-chip-label">Destroyed</span>
            <span className="archives-stat-chip-value">
              {destroyTotals?.totalCount ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab strip + search */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
        <div className="archives-tab-strip">
          <button
            className={`archives-tab ${activeTab === "archives" ? "active" : ""}`}
            onClick={() => switchTab("archives")}
          >
            <i className="bi bi-archive" />
            Archives
          </button>
          <button
            className={`archives-tab tab-destruction ${activeTab === "destruction" ? "active" : ""}`}
            onClick={() => switchTab("destruction")}
          >
            <i className="bi bi-trash3" />
            Destruction Register
          </button>
        </div>

        <div className="archives-search-wrap">
          <i className="bi bi-search archives-search-icon" />
          <input
            type="text"
            className="archives-search-input"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Destruction notice */}
      {activeTab === "destruction" && (
        <div className="archives-destruction-notice">
          <i className="bi bi-shield-exclamation" />
          <span>
            The records below have been <strong>permanently destroyed</strong>{" "}
            from storage in accordance with their retention schedule. Only
            metadata tombstones remain for audit compliance. File contents
            cannot be recovered.
          </span>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="archives-loading">
          <div className="archives-spinner" />
          <span>Loading records…</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="archives-empty">
          <div
            className={`archives-empty-icon ${activeTab === "archives" ? "icon-archive" : "icon-destroy"}`}
          >
            <i
              className={`bi ${activeTab === "archives" ? "bi-archive" : "bi-trash3"}`}
            />
          </div>
          <h4>
            No {activeTab === "archives" ? "archived" : "destroyed"} records
            found
          </h4>
          <p>
            {search
              ? `No records match "${search}". Try a different search term.`
              : `Documents that have been ${activeTab === "archives" ? "archived" : "destroyed"} through the disposition process will appear here.`}
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedDocuments)
            .sort(([a], [b]) => {
              if (a === "Uncategorized") return 1;
              if (b === "Uncategorized") return -1;
              return a.localeCompare(b);
            })
            .map(([groupName, { docs: groupDocs, color }]) => {
              const isOpen = openAccordions[groupName];
              const dotColor = color ? `#${color}` : "var(--text-muted)";

              return (
                <div className="archives-group" key={groupName}>
                  <button
                    className="archives-group-header"
                    onClick={() => toggleAccordion(groupName)}
                  >
                    <div className="archives-group-header-left">
                      <span
                        className="archives-group-type-dot"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="archives-group-title">{groupName}</span>
                    </div>
                    <div className="archives-group-header-right">
                      <span className="archives-group-count">
                        {groupDocs.length}{" "}
                        {groupDocs.length === 1 ? "record" : "records"}
                      </span>
                      <i
                        className={`bi bi-chevron-down archives-group-chevron ${isOpen ? "open" : ""}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="archives-table-wrap">
                      <table className="archives-table">
                        <thead>
                          <tr>
                            <th>Document</th>
                            <th>
                              {activeTab === "archives"
                                ? "Archived"
                                : "Destroyed"}{" "}
                              Date
                            </th>
                            <th>Uploaded By</th>
                            <th style={{ textAlign: "right" }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupDocs.map((doc: any) => {
                            const uploaderName = doc.uploadedBy
                              ? `${doc.uploadedBy.firstName ?? ""} ${doc.uploadedBy.lastName ?? ""}`.trim()
                              : "Unknown";

                            return (
                              <tr key={doc.id}>
                                <td>
                                  <span className="archives-doc-title">
                                    {doc.title}
                                  </span>
                                  {doc.controlNumber && (
                                    <span className="archives-doc-cn">
                                      CN: {doc.controlNumber}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  {doc.lifecycle?.dispositionDate ? (
                                    <div className="archives-date">
                                      <div className="archives-date-primary">
                                        {format(
                                          new Date(
                                            doc.lifecycle?.dispositionDate,
                                          ),
                                          "MMM d, yyyy",
                                        )}
                                      </div>
                                      <div className="archives-date-secondary">
                                        {format(
                                          new Date(
                                            doc.lifecycle?.dispositionDate,
                                          ),
                                          "h:mm a",
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                                <td>
                                  <div className="archives-uploader">
                                    <div className="archives-uploader-avatar">
                                      {getInitials(uploaderName)}
                                    </div>
                                    <span className="archives-uploader-name">
                                      {uploaderName}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <div className="archives-actions">
                                    {activeTab === "archives" ? (
                                      <>
                                        <button
                                          className="archives-action-btn btn-download"
                                          onClick={() =>
                                            handleDownloadFile(doc.id)
                                          }
                                          disabled={
                                            downloadingFileId === doc.id
                                          }
                                          title="Download archived file"
                                        >
                                          {downloadingFileId === doc.id ? (
                                            <>
                                              <span
                                                className="archives-spinner"
                                                style={{
                                                  width: 12,
                                                  height: 12,
                                                  borderWidth: 1.5,
                                                }}
                                              />{" "}
                                              Fetching…
                                            </>
                                          ) : (
                                            <>
                                              <i className="bi bi-download" />{" "}
                                              Download
                                            </>
                                          )}
                                        </button>
                                        {doc.archiveManifestUrl && (
                                          <button
                                            className="archives-action-btn btn-manifest"
                                            onClick={() =>
                                              handleDownloadManifest(doc.id)
                                            }
                                            disabled={
                                              downloadingManifestId === doc.id
                                            }
                                            title="View archival manifest"
                                          >
                                            {downloadingManifestId ===
                                            doc.id ? (
                                              <span
                                                className="archives-spinner"
                                                style={{
                                                  width: 12,
                                                  height: 12,
                                                  borderWidth: 1.5,
                                                }}
                                              />
                                            ) : (
                                              <>
                                                <i className="bi bi-filetype-json" />{" "}
                                                Manifest
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <Link
                                        to={`/documents/${doc.id}`}
                                        className="archives-action-btn btn-certificate"
                                        title="View destruction certificate"
                                      >
                                        <i className="bi bi-shield-check" />{" "}
                                        Certificate
                                      </Link>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Per-group pagination if needed */}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Global pagination */}
          {totalPages > 1 && (
            <div className="archives-pagination mt-3">
              <span className="archives-pagination-info">
                Page {page} of {totalPages} · {totalCount} total records
              </span>
              <div className="archives-pagination-controls">
                <button
                  className="archives-page-btn"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <i className="bi bi-chevron-left" />
                  Previous
                </button>
                <button
                  className="archives-page-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
