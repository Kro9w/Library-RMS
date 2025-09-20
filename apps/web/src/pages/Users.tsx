import React, { useState } from "react";
import { Protect } from "@clerk/clerk-react";
import { trpc } from "../trpc";
import { ConfirmModal } from "../components/ConfirmModal";

type ClerkUser = {
  id: string;
  emailAddresses: { emailAddress: string; id: string }[];
  primaryEmailAddressId: string | null;
  imageUrl?: string;
  publicMetadata: {
    role?: "Admin" | "Editor" | "Viewer";
  };
};

// ✅ Props interface with adjustable width
interface UsersProps {
  cardWidth?: string; // e.g. "280px", "300px", "100%"
}

export function Users({ cardWidth = "280px" }: UsersProps) {
  const { data: users, isLoading, isError, error } = trpc.getUsers.useQuery();
  const trpcCtx = trpc.useContext();

  const [userToDelete, setUserToDelete] = useState<ClerkUser | null>(null);

  const updateUserRole = trpc.updateUserRole.useMutation({
    onSuccess: () => trpcCtx.getUsers.invalidate(),
    onError: (err) => alert(`Failed to update role: ${err.message}`),
  });

  const removeUser = trpc.removeUserFromOrg.useMutation({
    onSuccess: () => trpcCtx.getUsers.invalidate(),
    onSettled: () => setUserToDelete(null),
    onError: (err) => alert(`Failed to remove user: ${err.message}`),
  });

  const handleRoleChange = (userId: string, role: "Admin" | "Editor" | "Viewer") => {
    updateUserRole.mutate({ userId, role });
  };

  const handleConfirmDelete = () => {
    if (userToDelete) removeUser.mutate(userToDelete.id);
  };

  const getPrimaryEmail = (user: ClerkUser) =>
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || "N/A";

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

          {/* ✅ Removed gutter and added custom spacing */}
          <div className="row g-0">
            {users && users.length > 0 ? (
              users.map((user: ClerkUser) => (
                <div
                  className="col-12 col-sm-6 col-md-4 d-flex justify-content-center"
                  key={user.id}
                  style={{ padding: "4px" }} // ✅ Minimal spacing between cards
                >
                  <div
                    className="card shadow-sm border-0 p-3 h-100"
                    style={{
                      width: cardWidth, // ✅ Dynamic width from prop
                      minHeight: "320px",
                      borderRadius: "1rem",
                      margin: "0", // ✅ No extra margin between cards
                    }}
                  >
                    <div className="d-flex flex-column align-items-center h-100">
                      <img
                        src={
                          user.imageUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            getPrimaryEmail(user)
                          )}&background=ED9B40&color=fff`
                        }
                        alt={getPrimaryEmail(user)}
                        className="rounded-circle shadow-sm mb-3"
                        style={{
                          width: "72px",
                          height: "72px",
                          objectFit: "cover",
                          border: "3px solid #fff",
                        }}
                      />
                      <h6 className="fw-bold text-center">{getPrimaryEmail(user)}</h6>
                      <small className="text-muted mb-2">Role</small>

                      <select
                        className="form-select form-select-sm mb-3"
                        value={(user.publicMetadata?.role as string) ?? "Viewer"}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as "Admin" | "Editor" | "Viewer")
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
          userToDelete ? getPrimaryEmail(userToDelete) : "this user"
        } from the organization?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
        isConfirming={removeUser.isPending}
      />
    </>
  );
}
