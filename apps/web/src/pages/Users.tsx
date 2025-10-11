import React, { useState } from "react";
import { Protect } from "@clerk/clerk-react";
import { trpc } from "../trpc";
import { ConfirmModal } from "../components/ConfirmModal";

// 1. Updated User Type
// This type now perfectly matches the simple object structure returned by our tRPC backend.
type User = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | undefined;
  imageUrl?: string;
  publicMetadata: {
    role?: "Admin" | "Editor" | "Viewer";
  };
};

interface UsersProps {
  cardWidth?: string;
}

export function Users({ cardWidth = "280px" }: UsersProps) {
  // 2. Simplified Data Fetching
  // The 'data' from useQuery is now directly the array of users.
  const { data: users, isLoading, isError, error } = trpc.getUsers.useQuery();
  const trpcCtx = trpc.useContext();

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const updateUserRole = trpc.updateUserRole.useMutation({
    onSuccess: () => trpcCtx.getUsers.invalidate(),
    onError: (err) => alert(`Failed to update role: ${err.message}`),
  });

  const removeUser = trpc.removeUserFromOrg.useMutation({
    onSuccess: () => trpcCtx.getUsers.invalidate(),
    onSettled: () => setUserToDelete(null),
    onError: (err) => alert(`Failed to remove user: ${err.message}`),
  });

  const handleRoleChange = (
    userId: string,
    role: "Admin" | "Editor" | "Viewer"
  ) => {
    updateUserRole.mutate({ userId, role });
  };

  const handleConfirmDelete = () => {
    if (userToDelete) removeUser.mutate(userToDelete.id);
  };

  if (isLoading) return <div className="container mt-4">Loading users...</div>;
  if (isError)
    return (
      <div className="container mt-4 alert alert-danger">
        Error: {error.message}
      </div>
    );

  return (
    <>
      <Protect role="org:admin">
        <div className="container mt-4">
          <h1 className="mb-4">User Management</h1>
          <div className="row g-0">
            {/* 3. Direct Mapping
                We can now directly map over the 'users' array without checking for a nested 'data' property. */}
            {users && users.length > 0 ? (
              users.map((user) => (
                <div
                  className="col-12 col-sm-6 col-md-4 d-flex justify-content-center"
                  key={user.id}
                  style={{ padding: "4px" }}
                >
                  <div
                    className="card shadow-sm border-0 p-3 h-100"
                    style={{
                      width: cardWidth,
                      minHeight: "320px",
                      borderRadius: "1rem",
                      margin: "0",
                    }}
                  >
                    <div className="d-flex flex-column align-items-center h-100">
                      <img
                        src={
                          user.imageUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            user.email || "User"
                          )}&background=ED9B40&color=fff`
                        }
                        alt={user.email || "User Avatar"}
                        className="rounded-circle shadow-sm mb-3"
                        style={{
                          width: "72px",
                          height: "72px",
                          objectFit: "cover",
                          border: "3px solid #fff",
                        }}
                      />
                      <h6 className="fw-bold text-center">
                        {user.email || "No Email"}
                      </h6>
                      <small className="text-muted mb-2">Role</small>

                      <select
                        className="form-select form-select-sm mb-3"
                        value={
                          (user.publicMetadata?.role as string) ?? "Viewer"
                        }
                        onChange={(e) =>
                          handleRoleChange(
                            user.id,
                            e.target.value as "Admin" | "Editor" | "Viewer"
                          )
                        }
                      >
                        <option value="Admin">Admin</option>
                        <option value="Editor">Editor</option>
                        <option value="Viewer">Viewer</option>
                      </select>

                      <button
                        className="btn btn-sm btn-outline-danger w-100 mt-auto"
                        onClick={() => setUserToDelete(user)}
                      >
                        Remove User
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted py-4">No users found.</div>
            )}
          </div>
        </div>
      </Protect>

      <ConfirmModal
        isOpen={!!userToDelete}
        title="Confirm Removal"
        message={`Are you sure you want to remove ${
          userToDelete?.email || "this user"
        } from the organization?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
        isConfirming={removeUser.isPending}
      />
    </>
  );
}
