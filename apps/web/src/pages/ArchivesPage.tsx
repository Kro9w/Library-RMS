import React, { useState } from "react";
import { Link } from "react-router-dom";
import { trpc } from "../trpc";

export const ArchivesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"archives" | "destruction">(
    "archives",
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const pageSize = 10;

  const { data: archivedData, isLoading: isLoadingArchived } =
    trpc.archives.getArchivedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "archives" },
    );

  const { data: destroyedData, isLoading: isLoadingDestroyed } =
    trpc.archives.getDestroyedDocuments.useQuery(
      { page, pageSize, search },
      { enabled: activeTab === "destruction" },
    );

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
      if (result.signedUrl) {
        window.open(result.signedUrl, "_blank");
      }
    } catch (e) {
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
      if (result.signedUrl) {
        window.open(result.signedUrl, "_blank");
      }
    } catch (e) {
      alert("Failed to fetch document file");
    } finally {
      setDownloadingFileId(null);
    }
  };

  const isLoading =
    activeTab === "archives" ? isLoadingArchived : isLoadingDestroyed;
  const data = activeTab === "archives" ? archivedData : destroyedData;

  const documents = data?.documents || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const groupedDocuments = React.useMemo(() => {
    const groups: Record<string, typeof documents> = {};

    documents.forEach((doc: any) => {
      const typeName = doc.documentType?.name || "Uncategorized";
      if (!groups[typeName]) {
        groups[typeName] = [];
      }
      groups[typeName].push(doc);
    });

    return groups;
  }, [documents]);

  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );

  const toggleAccordion = (groupName: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  return (
    <div className="page-container p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0 fw-bold text-dark">Disposition Register</h2>
          <p className="text-muted mb-0">
            View your institution's archived records and certificate tombstones
          </p>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
          <ul className="nav nav-tabs border-bottom-0">
            <li className="nav-item">
              <button
                className={`nav-link text-dark fw-semibold border-0 border-bottom border-3 ${
                  activeTab === "archives"
                    ? "border-brand active"
                    : "border-transparent"
                }`}
                onClick={() => {
                  setActiveTab("archives");
                  setPage(1);
                  setSearch("");
                }}
              >
                <i className="bi bi-archive me-2"></i>
                Archives
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link text-dark fw-semibold border-0 border-bottom border-3 ${
                  activeTab === "destruction"
                    ? "border-brand active"
                    : "border-transparent"
                }`}
                onClick={() => {
                  setActiveTab("destruction");
                  setPage(1);
                  setSearch("");
                }}
              >
                <i className="bi bi-trash3 me-2"></i>
                Destruction Register
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6 col-lg-4">
              <label className="form-label text-muted small fw-semibold">
                Search Register
              </label>
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by title..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="d-flex justify-content-center p-5">
          <div className="spinner-border text-brand" role="status"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-3">
            <i
              className={`bi ${activeTab === "archives" ? "bi-archive" : "bi-trash3"} text-muted`}
              style={{ fontSize: "3rem" }}
            ></i>
          </div>
          <h5 className="text-muted">
            No {activeTab === "archives" ? "archived" : "destroyed"} documents
            found.
          </h5>
        </div>
      ) : (
        <div className="mb-4">
          {Object.entries(groupedDocuments)
            .sort(([a], [b]) => {
              if (a === "Uncategorized") return 1;
              if (b === "Uncategorized") return -1;
              return a.localeCompare(b);
            })
            .map(([groupName, groupDocs]) => {
              const isOpen = openAccordions[groupName];
              return (
                <div className="accordion-item mb-3" key={groupName}>
                  <button
                    className={`accordion-header w-100 text-start d-flex justify-content-between align-items-center ${!isOpen ? "collapsed" : ""}`}
                    onClick={() => toggleAccordion(groupName)}
                  >
                    <span>{groupName}</span>
                    <div className="d-flex align-items-center gap-3">
                      <span className="text-muted small">
                        {groupDocs.length}{" "}
                        {groupDocs.length === 1 ? "document" : "documents"}
                      </span>
                      <i
                        className={`bi bi-chevron-${isOpen ? "up" : "down"}`}
                      ></i>
                    </div>
                  </button>

                  <div
                    className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}
                  >
                    <div className="accordion-body p-0">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                          <thead className="bg-light">
                            <tr>
                              <th>Title</th>
                              <th>Control Number</th>
                              <th>
                                {activeTab === "archives"
                                  ? "Archived"
                                  : "Destroyed"}{" "}
                                Date
                              </th>
                              <th>Uploaded By</th>
                              <th className="text-end">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupDocs.map((doc: any) => (
                              <tr key={doc.id}>
                                <td>
                                  <div className="fw-semibold text-dark">
                                    {doc.title}
                                  </div>
                                </td>
                                <td className="text-muted font-monospace">
                                  {doc.controlNumber || "-"}
                                </td>
                                <td>
                                  {doc.dispositionDate
                                    ? new Date(
                                        doc.dispositionDate,
                                      ).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td>{doc.uploadedBy?.email}</td>
                                <td className="text-end">
                                  {activeTab === "archives" ? (
                                    <>
                                      <button
                                        className="btn btn-sm btn-outline-brand me-2"
                                        onClick={() =>
                                          handleDownloadFile(doc.id)
                                        }
                                        disabled={downloadingFileId === doc.id}
                                        title="Download File"
                                      >
                                        <i className="bi bi-download"></i> File
                                      </button>
                                      {doc.archiveManifestUrl && (
                                        <button
                                          className="btn btn-sm btn-outline-secondary"
                                          onClick={() =>
                                            handleDownloadManifest(doc.id)
                                          }
                                          disabled={
                                            downloadingManifestId === doc.id
                                          }
                                          title="View Manifest"
                                        >
                                          <i className="bi bi-filetype-json"></i>{" "}
                                          Manifest
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    <Link
                                      to={`/documents/${doc.id}`}
                                      className="btn btn-sm btn-outline-danger"
                                      title="View Certificate"
                                    >
                                      <i className="bi bi-shield-check"></i>{" "}
                                      View Certificate
                                    </Link>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

          {totalPages > 1 && (
            <div className="card-footer bg-white border-top mt-4 shadow-sm rounded">
              <ul className="pagination justify-content-end mb-0">
                <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">
                    Page {page} of {totalPages}
                  </span>
                </li>
                <li
                  className={`page-item ${page === totalPages ? "disabled" : ""}`}
                >
                  <button
                    className="page-link"
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
