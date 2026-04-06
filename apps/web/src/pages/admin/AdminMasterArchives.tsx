import React, { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { trpc } from "../../trpc";
import "../ArchivesPage.css"; // Reuse existing archives styling for list

const getInitials = (name: string) => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] ?? "?").toUpperCase();
};

export default function AdminMasterArchives() {
  const [activeTab, setActiveTab] = useState<"archives" | "destruction">(
    "archives",
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 50;

  const { data: archivedData, isLoading: isLoadingArchived } =
    trpc.archives.getAllArchivedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "archives" },
    );

  const { data: destroyedData, isLoading: isLoadingDestroyed } =
    trpc.archives.getAllDestroyedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "destruction" },
    );

  // Fetch totals for both tabs
  const { data: archiveTotals } =
    trpc.archives.getAllArchivedDocuments.useQuery({
      page: 1,
      pageSize: 1,
    });
  const { data: destroyTotals } =
    trpc.archives.getAllDestroyedDocuments.useQuery({
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
  const documents = (
    activeTab === "archives"
      ? archivedData?.documents || []
      : destroyedData?.documents || []
  ) as Array<{
    id: string;
    title: string;
    controlNumber: string | null;
    campus: { id: string; name: string } | null;
    department: { id: string; name: string } | null;
    documentType: { name: string; color: string } | null;
    uploadedBy: { firstName: string | null; lastName: string | null } | null;
    lifecycle: {
      dispositionDate: Date | string | null;
      archiveManifestUrl: string | null;
    } | null;
  }>;
  const totalCount =
    activeTab === "archives"
      ? archivedData?.totalCount || 0
      : destroyedData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Group by Campus -> Department -> DocumentType
  const groupedData = React.useMemo(() => {
    const campusMap: Record<
      string,
      {
        campusName: string;
        departments: Record<
          string,
          {
            deptName: string;
            types: Record<string, { docs: typeof documents; color?: string }>;
          }
        >;
      }
    > = {};

    documents.forEach((doc) => {
      const campusId = doc.campus?.id || "uncategorized_campus";
      const campusName = doc.campus?.name || "No Campus Assigned";

      const deptId = doc.department?.id || "uncategorized_dept";
      const deptName = doc.department?.name || "No Department Assigned";

      const typeName = doc.documentType?.name || "Uncategorized";

      if (!campusMap[campusId]) {
        campusMap[campusId] = { campusName, departments: {} };
      }
      const c = campusMap[campusId];

      if (!c.departments[deptId]) {
        c.departments[deptId] = { deptName, types: {} };
      }
      const d = c.departments[deptId];

      if (!d.types[typeName]) {
        d.types[typeName] = { docs: [], color: doc.documentType?.color };
      }
      d.types[typeName].docs.push(doc);
    });

    return campusMap;
  }, [documents]);

  const [openCampuses, setOpenCampuses] = useState<Record<string, boolean>>({});
  const [openDepts, setOpenDepts] = useState<Record<string, boolean>>({});
  const [openTypes, setOpenTypes] = useState<Record<string, boolean>>({});

  const toggleCampus = (id: string) =>
    setOpenCampuses((p) => ({ ...p, [id]: !p[id] }));
  const toggleDept = (id: string) =>
    setOpenDepts((p) => ({ ...p, [id]: !p[id] }));
  const toggleType = (id: string) =>
    setOpenTypes((p) => ({ ...p, [id]: !p[id] }));

  const switchTab = (tab: "archives" | "destruction") => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
  };

  return (
    <div className="admin-page w-100">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Master Archives Register</h2>
        <p className="admin-page-desc text-muted mb-4">
          Super admin bird's-eye view of all archived and destroyed records
          across the entire institution, organized by Campus and Office.
        </p>
      </div>

      {/* Stats strip */}
      <div className="archives-stats-strip mb-4">
        <div className="archives-stat-chip">
          <div className="archives-stat-chip-icon icon-archive">
            <i className="bi bi-archive" />
          </div>
          <div className="d-flex flex-column">
            <span className="archives-stat-chip-label">
              Institution Total Archived
            </span>
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
            <span className="archives-stat-chip-label">
              Institution Total Destroyed
            </span>
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
            Archives Register
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
        <div className="archives-destruction-notice mb-4">
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
      <div className="admin-table-card card border-0 shadow-sm bg-white rounded p-4">
        {isLoading ? (
          <div className="archives-loading py-5">
            <div className="archives-spinner" />
            <span>Loading records…</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="archives-empty py-5">
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
            <p className="text-muted">
              {search
                ? `No records match "${search}". Try a different search term.`
                : `Documents that have been ${activeTab === "archives" ? "archived" : "destroyed"} through the disposition process will appear here.`}
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(groupedData).map(
              ([campusId, { campusName, departments }]) => {
                const isCampusOpen = openCampuses[campusId];
                // Calculate total docs in this campus
                const campusDocCount = Object.values(departments).reduce(
                  (sum, dept) =>
                    sum +
                    Object.values(dept.types).reduce(
                      (tsum, t) => tsum + t.docs.length,
                      0,
                    ),
                  0,
                );

                return (
                  <div className="admin-campus-accordion mb-3" key={campusId}>
                    <button
                      className="admin-campus-header d-flex align-items-center justify-content-between w-100 border-0 bg-light p-3 rounded"
                      onClick={() => toggleCampus(campusId)}
                      style={{
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                    >
                      <div className="d-flex align-items-center gap-2">
                        <i
                          className={`bi bi-chevron-${isCampusOpen ? "down" : "right"}`}
                        />
                        <i className="bi bi-buildings text-primary ms-1" />
                        <span
                          className="fw-semibold ms-1"
                          style={{ fontSize: "15px" }}
                        >
                          {campusName}
                        </span>
                      </div>
                      <span className="badge bg-secondary rounded-pill">
                        {campusDocCount} record{campusDocCount !== 1 && "s"}
                      </span>
                    </button>

                    {isCampusOpen && (
                      <div className="ps-4 pe-2 pt-3 pb-2 border-start ms-3 mt-1">
                        {Object.entries(departments).map(
                          ([deptId, { deptName, types }]) => {
                            const isDeptOpen =
                              openDepts[`${campusId}-${deptId}`];
                            const deptDocCount = Object.values(types).reduce(
                              (tsum, t) => tsum + t.docs.length,
                              0,
                            );

                            return (
                              <div
                                className="admin-dept-accordion mb-3"
                                key={deptId}
                              >
                                <button
                                  className="admin-dept-header d-flex align-items-center justify-content-between w-100 border-0 bg-white p-2 rounded shadow-sm"
                                  onClick={() =>
                                    toggleDept(`${campusId}-${deptId}`)
                                  }
                                  style={{ cursor: "pointer" }}
                                >
                                  <div className="d-flex align-items-center gap-2">
                                    <i
                                      className={`bi bi-chevron-${isDeptOpen ? "down" : "right"} text-muted`}
                                    />
                                    <i className="bi bi-building text-info ms-1" />
                                    <span
                                      className="fw-medium ms-1"
                                      style={{ fontSize: "14px" }}
                                    >
                                      {deptName}
                                    </span>
                                  </div>
                                  <span className="badge bg-light text-dark border rounded-pill">
                                    {deptDocCount} record
                                    {deptDocCount !== 1 && "s"}
                                  </span>
                                </button>

                                {isDeptOpen && (
                                  <div className="ps-4 pt-2">
                                    {Object.entries(types).map(
                                      ([typeName, { docs, color }]) => {
                                        const typeKey = `${campusId}-${deptId}-${typeName}`;
                                        const isTypeOpen = openTypes[typeKey];
                                        const dotColor = color
                                          ? `#${color}`
                                          : "var(--text-muted)";

                                        return (
                                          <div
                                            className="archives-group mb-2"
                                            key={typeName}
                                          >
                                            <button
                                              className="archives-group-header"
                                              onClick={() =>
                                                toggleType(typeKey)
                                              }
                                            >
                                              <div className="archives-group-header-left">
                                                <span
                                                  className="archives-group-type-dot"
                                                  style={{
                                                    backgroundColor: dotColor,
                                                  }}
                                                />
                                                <span className="archives-group-title">
                                                  {typeName}
                                                </span>
                                              </div>
                                              <div className="archives-group-header-right">
                                                <span className="archives-group-count">
                                                  {docs.length} record
                                                  {docs.length !== 1 && "s"}
                                                </span>
                                                <i
                                                  className={`bi bi-chevron-down archives-group-chevron ${isTypeOpen ? "open" : ""}`}
                                                />
                                              </div>
                                            </button>

                                            {isTypeOpen && (
                                              <div className="archives-table-wrap">
                                                <table className="archives-table">
                                                  <thead>
                                                    <tr>
                                                      <th>Document</th>
                                                      <th>
                                                        {activeTab ===
                                                        "archives"
                                                          ? "Archived Date"
                                                          : "Destroyed Date"}
                                                      </th>
                                                      <th>Uploaded By</th>
                                                      <th
                                                        style={{
                                                          textAlign: "right",
                                                        }}
                                                      >
                                                        Actions
                                                      </th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {docs.map((doc) => {
                                                      const uploaderName =
                                                        doc.uploadedBy
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
                                                                CN:{" "}
                                                                {
                                                                  doc.controlNumber
                                                                }
                                                              </span>
                                                            )}
                                                          </td>
                                                          <td>
                                                            {doc.lifecycle
                                                              ?.dispositionDate ? (
                                                              <div className="archives-date">
                                                                <div className="archives-date-primary">
                                                                  {format(
                                                                    new Date(
                                                                      doc
                                                                        .lifecycle
                                                                        .dispositionDate,
                                                                    ),
                                                                    "MMM d, yyyy",
                                                                  )}
                                                                </div>
                                                                <div className="archives-date-secondary">
                                                                  {format(
                                                                    new Date(
                                                                      doc
                                                                        .lifecycle
                                                                        .dispositionDate,
                                                                    ),
                                                                    "h:mm a",
                                                                  )}
                                                                </div>
                                                              </div>
                                                            ) : (
                                                              <span className="text-muted">
                                                                —
                                                              </span>
                                                            )}
                                                          </td>
                                                          <td>
                                                            <div className="archives-uploader">
                                                              <div className="archives-uploader-avatar">
                                                                {getInitials(
                                                                  uploaderName,
                                                                )}
                                                              </div>
                                                              <span className="archives-uploader-name">
                                                                {uploaderName}
                                                              </span>
                                                            </div>
                                                          </td>
                                                          <td>
                                                            <div className="archives-actions">
                                                              {activeTab ===
                                                              "archives" ? (
                                                                <>
                                                                  <button
                                                                    className="archives-action-btn btn-download"
                                                                    onClick={() =>
                                                                      handleDownloadFile(
                                                                        doc.id,
                                                                      )
                                                                    }
                                                                    disabled={
                                                                      downloadingFileId ===
                                                                      doc.id
                                                                    }
                                                                    title="Download archived file"
                                                                  >
                                                                    {downloadingFileId ===
                                                                    doc.id ? (
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
                                                                  {doc.lifecycle
                                                                    ?.archiveManifestUrl && (
                                                                    <button
                                                                      className="archives-action-btn btn-manifest"
                                                                      onClick={() =>
                                                                        handleDownloadManifest(
                                                                          doc.id,
                                                                        )
                                                                      }
                                                                      disabled={
                                                                        downloadingManifestId ===
                                                                        doc.id
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
                                              </div>
                                            )}
                                          </div>
                                        );
                                      },
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            )}

            {/* Global pagination */}
            {totalPages > 1 && (
              <div className="archives-pagination mt-4">
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
    </div>
  );
}
