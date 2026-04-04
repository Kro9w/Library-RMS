import React from "react";
import { format } from "date-fns";

export const DistributionHistoryTable: React.FC<{
  distributions: any[];
}> = ({ distributions }) => {
  if (!distributions || distributions.length === 0) return null;

  return (
    <div className="document-table-card mt-4 mb-4">
      <div className="card-body">
        <h5 className="card-title">
          <i className="bi bi-send-check"></i>
          Distributions
        </h5>
        <hr style={{ margin: "0 0 16px" }} />
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Office / Department</th>
                <th>Status</th>
                <th>Date Received</th>
              </tr>
            </thead>
            <tbody>
              {distributions.map((dist: any) => (
                <tr key={dist.id}>
                  <td>
                    <strong style={{ fontSize: "13px" }}>
                      {dist.recipient.firstName} {dist.recipient.lastName}
                    </strong>
                  </td>
                  <td style={{ fontSize: "13px" }}>
                    {dist.recipient.department?.name || "N/A"}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        dist.status === "RECEIVED"
                          ? "bg-success"
                          : "bg-warning text-dark"
                      }`}
                    >
                      {dist.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "13px" }}>
                    {dist.receivedAt ? (
                      format(
                        new Date(dist.receivedAt as string),
                        "MMM d, yyyy h:mm a",
                      )
                    ) : (
                      <span className="text-muted fst-italic">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
