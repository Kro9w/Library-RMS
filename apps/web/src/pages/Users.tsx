// apps/web/src/pages/Users.tsx
import React from "react";
// 1. REMOVED: Clerk import
// import { Protect } from "@clerk/clerk-react";
import { trpc } from "../trpc";
// 2. REMOVED: ConfirmModal as we are removing delete functionality
// import { ConfirmModal } from "../components/ConfirmModal";
// 3. ADDED: tRPC type import
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// 4. UPDATED: User type to match our new API response
type User = AppRouterOutputs["documents"]["getAppUsers"][0];

interface UsersProps {
  cardWidth?: string;
}

export function Users({ cardWidth = "280px" }: UsersProps) {
  // 5. FIXED: Use the correct nested tRPC procedure
  const {
    data: users,
    isLoading,
    isError,
    error,
  } = trpc.documents.getAppUsers.useQuery();

  // 6. REMOVED: All mutations and state for updating/deleting
  // const trpcCtx = trpc.useContext();
  // const [userToDelete, setUserToDelete] = useState<User | null>(null);
  // const updateUserRole = ...
  // const removeUser = ...
  // const handleRoleChange = ...
  // const handleConfirmDelete = ...

  if (isLoading) return <div className="container mt-4">Loading users...</div>;
  if (isError)
    return (
      <div className="container mt-4 alert alert-danger">
        Error: {error.message}
      </div>
    );

  return (
    <>
      {/* 7. REMOVED: <Protect> wrapper. Auth is handled by the API. */}
      <div className="container mt-4">
        <h1 className="mb-4">User Management</h1>
        <div className="row g-0">
          {users && users.length > 0 ? (
            // 8. FIXED: 'any' error by explicitly typing 'user'
            users.map((user: User) => (
              <div
                className="col-12 col-sm-6 col-md-4 d-flex justify-content-center"
                key={user.id}
                style={{ padding: "4px" }}
              >
                <div
                  className="card shadow-sm border-0 p-3 h-100"
                  style={{
                    width: cardWidth,
                    minHeight: "200px", // Shortened card
                    borderRadius: "1rem",
                    margin: "0",
                  }}
                >
                  <div className="d-flex flex-column align-items-center h-100">
                    <img
                      // 9. UPDATED: Use 'user.name' for avatar
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.name || user.email || "User"
                      )}&background=ED9B40&color=fff`}
                      alt={user.name || "User Avatar"}
                      className="rounded-circle shadow-sm mb-3"
                      style={{
                        width: "72px",
                        height: "72px",
                        objectFit: "cover",
                        border: "3px solid #fff",
                      }}
                    />
                    {/* 10. UPDATED: Display name and email */}
                    <h6 className="fw-bold text-center">
                      {user.name || "No Name"}
                    </h6>
                    <small className="text-muted mb-2">{user.email}</small>

                    {/* 11. REMOVED: Role select and delete button */}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted py-4">No users found.</div>
          )}
        </div>
      </div>
      {/* 12. REMOVED: ConfirmModal */}
    </>
  );
}
