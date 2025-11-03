import React, { useState } from "react";
import { trpc } from "../trpc";

const LogsPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = trpc.logs.getLogs.useQuery({
    page,
    limit: 10,
  });

  return (
    <div className="container mt-4">
      <h1>Audit Logs</h1>
      {isLoading && <p>Loading...</p>}
      {isError && <p>Error loading logs.</p>}
      {data && (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Organization</th>
                <th>Role</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.user.name}</td>
                  <td>{log.action}</td>
                  <td>{log.organization.name}</td>
                  <td>{log.userRole}</td>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="d-flex justify-content-between">
            <button
              className="btn btn-primary"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {data.totalPages}
            </span>
            <button
              className="btn btn-primary"
              onClick={() => setPage(page + 1)}
              disabled={page === data.totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LogsPage;
