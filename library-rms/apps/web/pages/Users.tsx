// /pages/Users.tsx
import { Protect } from "@clerk/clerk-react";

export function Users() {
  // User data would be fetched from Clerk's Backend API
  const mockUsers = [
    { id: "user1", email: "admin@example.com", role: "Admin" },
    { id: "user2", email: "editor@example.com", role: "Editor" },
    { id: "user3", email: "viewer@example.com", role: "Viewer" },
  ];

  return (
    <Protect role="org:admin">
      <div className="container mt-4">
        <h1>User Management</h1>
        <p className="text-muted">
          This page is only visible to administrators.
        </p>
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>
                  <select
                    className="form-select form-select-sm"
                    defaultValue={user.role}
                  >
                    <option>Admin</option>
                    <option>Editor</option>
                    <option>Viewer</option>
                  </select>
                </td>
                <td className="text-end">
                  <button className="btn btn-sm btn-outline-danger">
                    Remove User
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Protect>
  );
}
