import React from "react";
import { formatUserName } from "../../utils/user";
import RolePill from "../Roles/RolePill";

const getDepartmentAcronym = (name: string | null | undefined): string => {
  if (!name) return "N/A";
  const stopWords = ["of", "the", "for", "and"];
  return name
    .split(" ")
    .filter((word) => !stopWords.includes(word.toLowerCase()))
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const getStepProps = (route: any, doc: any) => {
  if (route.status === "PENDING") {
    return { className: "routing-step-pending", icon: "bi-circle" };
  }

  const decision =
    route.decision || (route.status === "CURRENT" ? doc.status : null);

  if (route.status === "CURRENT") {
    if (decision === "Returned for Corrections/Revision/Clarification") {
      return {
        className: "routing-step-rejected text-warning",
        icon: "bi-arrow-return-left",
      };
    }
    if (decision === "Disapproved") {
      return {
        className: "routing-step-rejected text-danger",
        icon: "bi-x-circle-fill",
      };
    }
    if (decision === "For the review of the Executive Committee") {
      return {
        className: "routing-step-current text-secondary",
        icon: "bi-people-fill",
      };
    }
    return {
      className: "routing-step-current",
      icon: "bi-record-circle-fill",
    };
  }

  if (route.status === "APPROVED") {
    if (decision === "Noted") {
      return {
        className: "routing-step-approved text-info",
        icon: "bi-journal-check",
      };
    }
    if (decision === "For Endorsement") {
      return {
        className: "routing-step-approved text-primary",
        icon: "bi-forward-fill",
      };
    }
    if (decision === "Approved") {
      return {
        className: "routing-step-approved text-success",
        icon: "bi-check-circle-fill",
      };
    }
    return {
      className: "routing-step-approved text-success",
      icon: "bi-check-circle-fill",
    };
  }

  if (route.status === "REJECTED") {
    return {
      className: "routing-step-rejected text-danger",
      icon: "bi-x-circle-fill",
    };
  }

  return { className: "routing-step-pending", icon: "bi-circle" };
};

export const ReviewDetailsTable: React.FC<{
  document: any;
}> = ({ document }) => {
  if (
    !document.status &&
    (!document.transitRoutes || document.transitRoutes.length === 0) &&
    (!document.remarks || document.remarks.length === 0)
  ) {
    return null;
  }

  return (
    <div className="document-table-card mt-4 mb-4">
      <div className="card-body">
        {/* Section header */}
        <div className="review-section-header">
          <h5 className="card-title mb-0">
            <i className="bi bi-clipboard-check"></i>
            Review Details
          </h5>
          <div className="review-section-status">
            <span className="review-status-label">Status</span>
            <span
              className={`badge ${
                document.status === "Approved" || document.status === "Endorsed"
                  ? "bg-success"
                  : document.status ===
                      "Returned for Corrections/Revision/Clarification"
                    ? "bg-warning text-dark"
                    : document.status === "Disapproved"
                      ? "bg-danger"
                      : "bg-secondary"
              }`}
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              {document.status ? document.status.toUpperCase() : "IN PROGRESS"}
            </span>
          </div>
        </div>

        <hr style={{ margin: "0 0 20px" }} />

        {/* Routing progress */}
        {document.transitRoutes && document.transitRoutes.length > 0 && (
          <div className="routing-progress-wrap">
            <p className="routing-progress-label">
              <i className="bi bi-signpost-split"></i>
              Approval Route
            </p>
            <div className="routing-steps">
              {document.transitRoutes.map((route: any, index: number) => {
                const { className, icon } = getStepProps(route, document);
                return (
                  <React.Fragment key={route.id}>
                    <div className={`routing-step ${className}`}>
                      <div className="routing-step-icon">
                        <i className={`bi ${icon}`}></i>
                      </div>
                      <span className="routing-step-name">
                        {route.department?.name || "Unknown Office"}
                      </span>
                    </div>
                    {index < document.transitRoutes.length - 1 && (
                      <div
                        className={`routing-connector ${
                          route.status === "APPROVED"
                            ? "routing-connector-done"
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

        {/* Review history table */}
        {document.remarks && document.remarks.length > 0 && (
          <div className="table-responsive mt-2">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Reviewer</th>
                  <th>Date &amp; Time</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {document.remarks.map((remark: any) => (
                  <tr key={remark.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="reviewer-avatar">
                          {remark.author?.firstName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p
                            className="mb-0 fw-semibold"
                            style={{ fontSize: "13px" }}
                          >
                            {formatUserName(remark.author)}
                          </p>
                          <div
                            className="d-flex flex-wrap align-items-center gap-1 mt-1"
                            style={{ fontSize: "11px" }}
                          >
                            {remark.author.roles?.map((r: any) => (
                              <RolePill
                                key={r.id || r.name}
                                roleName={r.name}
                              />
                            ))}
                            {remark.author.department?.name && (
                              <span
                                className="text-muted ms-1 border-start ps-2"
                                title={remark.author.department.name}
                                style={{ fontSize: "11px" }}
                              >
                                {getDepartmentAcronym(
                                  remark.author.department.name,
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <p className="mb-0" style={{ fontSize: "13px" }}>
                        {new Date(remark.createdAt).toLocaleDateString()}
                      </p>
                      <p
                        className="mb-0 text-muted"
                        style={{ fontSize: "11px" }}
                      >
                        {new Date(remark.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td>
                      <p className="review-history-remark mb-0">
                        {remark.message}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
