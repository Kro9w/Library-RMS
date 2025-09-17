import React, { useState } from "react";
import { Protect } from "@clerk/clerk-react";
import { trpc } from "../trpc";
import { ConfirmModal } from "../components/ConfirmModal";

// Define a type for the User object to improve type safety.
// This shape is based on the data returned by Clerk's API.
type ClerkUser = {
  id: string;
  emailAddresses: { emailAddress: string; id: string }[];
  primaryEmailAddressId: string | null;
  publicMetadata: {
    role?: "Admin" | "Editor" | "Viewer";
  };
};

export function Users() {
  // 1. Fetch the user list from your tRPC backend
  const { data: users, isLoading, isError, error } = trpc.getUsers.useQuery();
  const trpcCtx = trpc.useContext();

  // State to manage the delete confirmation modal
  const [userToDelete, setUserToDelete] = useState<ClerkUser | null>(null);

  // 2. Create tRPC mutations for updating and removing users
  const updateUserRole = trpc.updateUserRole.useMutation({
    onSuccess: () => trpcCtx.getUsers.invalidate(), // Refresh the list on success
    onError: (err) => alert(`Failed to update role: ${err.message}`),
  });

  const removeUser = trpc.removeUserFromOrg.useMutation({
    onSuccess: () => trpcCtx.getUsers.invalidate(),
    onSettled: () => setUserToDelete(null), // Close the modal
    onError: (err) => alert(`Failed to remove user: ${err.message}`),
  });

  // 3. Handler functions to connect the UI to the mutations
  const handleRoleChange = (userId: string, role: string) => {
    updateUserRole.mutate({ userId, role: role as any });
  };

  const handleConfirmDelete = () => {
    if (userToDelete) {
      removeUser.mutate(userToDelete.id);
    }
  };

  const getPrimaryEmail = (user: ClerkUser) => {
    return (
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress || "N/A"
    );
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
          <h1>User Management</h1>
          <p className="text-muted">
            This page is only visible to administrators.
          </p>
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Add a check to see if the users array is empty */}
              {users && users.length > 0 ? (
                users.map((user: ClerkUser) => (
                  <tr key={user.id}>
                    <td>{getPrimaryEmail(user)}</td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={user.publicMetadata?.role || "Viewer"}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                      >
                        <option>Admin</option>
                        <option>Editor</option>
                        <option>Viewer</option>
                      </select>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setUserToDelete(user)}
                      >
                        Remove User
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                // Display a message if no users are found
                <tr>
                  <td colSpan={3} className="text-center text-muted py-4">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Protect>

      {/* Reusable confirmation modal for the delete action */}
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
