import React, { useState } from "react";
import { trpc } from "./trpc";
import "./App.css";

function App() {
  const [controlNumber, setControlNumber] = useState("");
  const [searchedNumber, setSearchedNumber] = useState("");

  const { data, isLoading, error } =
    trpc.documents.lookupByControlNumber.useQuery(
      { controlNumber: searchedNumber },
      { enabled: !!searchedNumber, retry: false },
    );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (controlNumber.trim()) {
      setSearchedNumber(controlNumber.trim());
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          <div className="text-center mb-5 d-flex flex-column align-items-center">
            <img
              src="/plume.svg"
              alt="Plume RMS Logo"
              width="64"
              height="64"
              className="mb-4"
            />
            <h1
              className="fw-bold mb-3"
              style={{ fontSize: "28px", letterSpacing: "-0.5px" }}
            >
              Plume RMS Lookup
            </h1>
            <p className="text-muted" style={{ fontSize: "15px" }}>
              Enter a document control number to track its routing and approval
              progress.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mb-5 d-flex">
            <input
              type="text"
              className="search-bar flex-grow-1"
              placeholder="e.g. DOC-2023-0001"
              value={controlNumber}
              onChange={(e) => setControlNumber(e.target.value)}
              required
            />
            <button
              className="btn btn-primary btn-search shadow-sm"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <i className="bi bi-search me-2"></i>
              )}
              Search
            </button>
          </form>

          {error && (
            <div className="alert alert-warning shadow-sm border-warning-subtle text-center">
              <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
              {error.message ||
                "No routing progress found for this Control Number."}
            </div>
          )}

          {data && (
            <div className="document-table-card mt-4 mb-4">
              <div className="card-body">
                <h5 className="card-title d-flex justify-content-between align-items-center">
                  <div>
                    <i className="bi bi-clipboard-check me-2"></i>
                    Review Details
                  </div>
                  <div>
                    <span className="text-muted fw-bold me-2 fs-6">
                      Status:
                    </span>
                    <span
                      className={`badge ${
                        data.status === "Approved" || data.status === "Endorsed"
                          ? "bg-success"
                          : data.status ===
                              "Returned for Corrections/Revision/Clarification"
                            ? "bg-warning text-dark"
                            : data.status === "Disapproved"
                              ? "bg-danger"
                              : "bg-secondary"
                      }`}
                      style={{ fontSize: "0.85rem", padding: "0.5em 0.8em" }}
                    >
                      {data.status ? data.status.toUpperCase() : "IN PROGRESS"}
                    </span>
                  </div>
                </h5>
                <hr />

                <div className="mb-4">
                  <h6 className="fw-bold mb-1" style={{ fontSize: "1.1rem" }}>
                    {data.title}
                  </h6>
                  <p
                    className="text-muted mb-0"
                    style={{ fontSize: "0.85rem" }}
                  >
                    Control Number: {data.controlNumber}
                  </p>
                </div>

                {data.transitRoutes && data.transitRoutes.length > 0 && (
                  <div className="mb-5 mt-4">
                    <span className="text-muted fw-bold d-block mb-3 fs-6">
                      Routing Progress
                    </span>
                    <div
                      className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-sm-center w-100 position-relative"
                      style={{ gap: "1.5rem" }}
                    >
                      {/* Vertical line for mobile */}
                      <div
                        className="d-block d-sm-none position-absolute"
                        style={{
                          left: "20px",
                          top: "20px",
                          bottom: "20px",
                          width: "2px",
                          backgroundColor: "var(--border-strong)",
                          zIndex: 0,
                        }}
                      ></div>

                      {data.transitRoutes.map((route: any, index: number) => {
                        let badgeClass = "bg-secondary text-light";
                        let iconClass = "bi-circle";
                        if (route.status === "APPROVED") {
                          badgeClass = "bg-success text-light";
                          iconClass = "bi-check-circle-fill";
                        } else if (route.status === "CURRENT") {
                          badgeClass = "bg-primary text-light";
                          iconClass = "bi-record-circle-fill";
                        } else if (route.status === "REJECTED") {
                          badgeClass = "bg-danger text-light";
                          iconClass = "bi-x-circle-fill";
                        }

                        return (
                          <React.Fragment key={route.id}>
                            <div
                              className="d-flex flex-row flex-sm-column align-items-center position-relative"
                              style={{ zIndex: 1, minWidth: "120px" }}
                            >
                              <div
                                className={`badge ${badgeClass} rounded-pill p-2 mb-0 mb-sm-2 me-3 me-sm-0 shadow-sm`}
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <i className={`bi ${iconClass} fs-5`}></i>
                              </div>
                              <span
                                className="text-sm-center"
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight:
                                    route.status === "CURRENT"
                                      ? "bold"
                                      : "normal",
                                  lineHeight: "1.2",
                                }}
                              >
                                {route.department?.name || "Unknown Office"}
                              </span>
                            </div>
                            {index < data.transitRoutes.length - 1 && (
                              <div
                                className="d-none d-sm-block flex-grow-1 mx-2"
                                style={{
                                  height: "2px",
                                  backgroundColor:
                                    route.status === "APPROVED"
                                      ? "var(--success)"
                                      : "var(--border-strong)",
                                  minWidth: "30px",
                                }}
                              ></div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}

                {data.remarks && data.remarks.length > 0 && (
                  <div className="mt-3">
                    <span className="text-muted fw-bold d-block mb-3 fs-6">
                      Review History
                    </span>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Reviewer</th>
                            <th>Date & Time</th>
                            <th>Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.remarks.map((remark: any) => (
                            <tr key={remark.id}>
                              <td>
                                <strong>
                                  {remark.author?.firstName}{" "}
                                  {remark.author?.lastName}
                                </strong>
                                <div
                                  className="text-muted mt-1"
                                  style={{ fontSize: "0.8rem" }}
                                >
                                  {remark.author?.department?.name || ""}
                                </div>
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <div>
                                  {new Date(
                                    remark.createdAt,
                                  ).toLocaleDateString()}
                                </div>
                                <small className="text-muted">
                                  {new Date(
                                    remark.createdAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </small>
                              </td>
                              <td>
                                <div
                                  className="p-2 bg-light rounded border"
                                  style={{
                                    fontSize: "0.9rem",
                                    whiteSpace: "pre-wrap",
                                    backgroundColor: "var(--bg-subtle)",
                                  }}
                                >
                                  {remark.message}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
