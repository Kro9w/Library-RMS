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
    <div className="lookup-root">
      {/* Centered hero column */}
      <div className="lookup-container">
        {/* Brand header */}
        <div className="lookup-brand">
          <img src="/plume.svg" alt="Plume RMS" className="lookup-brand-logo" />
          <div className="lookup-brand-text">
            <span className="lookup-brand-name">Plume RMS</span>
            <span className="lookup-brand-tagline">
              Public Document Tracker
            </span>
          </div>
        </div>

        {/* Hero card */}
        <div className="lookup-hero-card">
          <h1 className="lookup-hero-title">Track Document Progress</h1>
          <p className="lookup-hero-desc">
            Enter a control number to view the routing and approval status of a
            document in transit.
          </p>

          <form onSubmit={handleSearch} className="lookup-form">
            <div className="lookup-input-wrap">
              <i className="bi bi-hash lookup-input-icon"></i>
              <input
                type="text"
                className="lookup-input"
                placeholder="e.g. CSU-2024-001-FL"
                value={controlNumber}
                onChange={(e) => setControlNumber(e.target.value)}
                required
              />
            </div>
            <button className="lookup-btn" type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="lookup-spinner" />
              ) : (
                <i className="bi bi-search"></i>
              )}
              {isLoading ? "Searching…" : "Search"}
            </button>
          </form>
        </div>

        {/* Error state */}
        {error && (
          <div className="lookup-empty-card">
            <div className="lookup-empty-icon">
              <i className="bi bi-exclamation-circle"></i>
            </div>
            <p className="lookup-empty-title">No results found</p>
            <p className="lookup-empty-desc">
              {error.message ||
                "No routing progress found for this control number."}
            </p>
          </div>
        )}

        {/* Results card */}
        {data && (
          <div className="lookup-result-card">
            {/* Document header */}
            <div className="lookup-doc-header">
              <div className="lookup-doc-meta">
                <h2 className="lookup-doc-title">{data.title}</h2>
                <span className="lookup-control-badge">
                  <i className="bi bi-hash"></i>
                  {data.controlNumber}
                </span>
              </div>
              <span
                className={`lookup-status-badge ${
                  data.status === "Approved"
                    ? "lookup-status-approved"
                    : data.status ===
                        "Returned for Corrections/Revision/Clarification"
                      ? "lookup-status-returned"
                      : data.status === "Disapproved"
                        ? "lookup-status-disapproved"
                        : "lookup-status-inprogress"
                }`}
              >
                {data.status ? data.status : "In Progress"}
              </span>
            </div>

            {/* Routing progress */}
            {data.transitRoutes && data.transitRoutes.length > 0 && (
              <div className="lookup-section">
                <p className="lookup-section-label">
                  <i className="bi bi-signpost-split"></i>
                  Approval Route
                </p>
                <div className="lookup-route">
                  {data.transitRoutes.map((route: any, index: number) => {
                    let stepClass = "lookup-step-pending";
                    let iconClass = "bi-circle";

                    const decision =
                      route.decision ||
                      (route.status === "CURRENT" ? data.status : null);

                    if (route.status === "PENDING") {
                      stepClass = "lookup-step-pending";
                      iconClass = "bi-circle";
                    } else if (route.status === "CURRENT") {
                      if (
                        decision ===
                        "Returned for Corrections/Revision/Clarification"
                      ) {
                        stepClass = "lookup-step-rejected text-warning";
                        iconClass = "bi-arrow-return-left";
                      } else if (decision === "Disapproved") {
                        stepClass = "lookup-step-rejected text-danger";
                        iconClass = "bi-x-circle-fill";
                      } else if (
                        decision === "For the review of the Executive Committee"
                      ) {
                        stepClass = "lookup-step-current text-secondary";
                        iconClass = "bi-people-fill";
                      } else {
                        stepClass = "lookup-step-current";
                        iconClass = "bi-record-circle-fill";
                      }
                    } else if (route.status === "APPROVED") {
                      if (decision === "Noted") {
                        stepClass = "lookup-step-approved text-info";
                        iconClass = "bi-journal-check";
                      } else if (decision === "For Endorsement") {
                        stepClass = "lookup-step-approved text-primary";
                        iconClass = "bi-forward-fill";
                      } else if (decision === "Approved") {
                        stepClass = "lookup-step-approved text-success";
                        iconClass = "bi-check-circle-fill";
                      } else {
                        stepClass = "lookup-step-approved text-success";
                        iconClass = "bi-check-circle-fill";
                      }
                    } else if (route.status === "REJECTED") {
                      stepClass = "lookup-step-rejected text-danger";
                      iconClass = "bi-x-circle-fill";
                    }

                    return (
                      <React.Fragment key={route.id}>
                        <div className={`lookup-step ${stepClass}`}>
                          <div className="lookup-step-icon">
                            <i className={`bi ${iconClass}`}></i>
                          </div>
                          <span className="lookup-step-label">
                            {route.department?.name || "Unknown Office"}
                          </span>
                        </div>
                        {index < data.transitRoutes.length - 1 && (
                          <div
                            className={`lookup-route-line ${
                              route.status === "APPROVED"
                                ? "lookup-route-line-done"
                                : ""
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Review history */}
            {data.remarks && data.remarks.length > 0 && (
              <div className="lookup-section lookup-section-top">
                <p className="lookup-section-label">
                  <i className="bi bi-clipboard-check"></i>
                  Review History
                </p>
                <div className="lookup-remarks">
                  {data.remarks.map((remark: any) => (
                    <div key={remark.id} className="lookup-remark">
                      <div className="lookup-remark-header">
                        <div className="lookup-remark-author">
                          <div className="lookup-remark-avatar">
                            {remark.author?.firstName?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="lookup-remark-name">
                              {remark.author?.firstName}{" "}
                              {remark.author?.lastName}
                            </p>
                            {remark.author?.department?.name && (
                              <p className="lookup-remark-dept">
                                {remark.author.department.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="lookup-remark-time">
                          <p>
                            {new Date(remark.createdAt).toLocaleDateString()}
                          </p>
                          <p>
                            {new Date(remark.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {remark.message && (
                        <p className="lookup-remark-message">
                          {remark.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="lookup-footer">
          Cagayan State University · Plume Records Management System
        </p>
      </div>
    </div>
  );
}

export default App;
