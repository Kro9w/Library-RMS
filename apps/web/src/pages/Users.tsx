// apps/web/src/pages/Users.tsx
import { useState } from "react";
import { trpc } from "../trpc";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import "../components/Roles/RolesModal.css";
import { ConfirmModal } from "../components/ConfirmModal";
import { RolesModal } from "../components/Roles/RolesModal";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";

type User = AppRouterOutputs["user"]["getUsersWithRoles"][0];

export function Users() {
  const {
    data: users,
    isLoading,
    isError,
    error,
  } = trpc.user.getUsersWithRoles.useQuery();
  const { data: currentUser } = trpc.user.getMe.useQuery();
  const { data: myDocuments } = trpc.documents.getMyDocuments.useQuery();
  const removeUserFromOrg = trpc.user.removeUserFromOrg.useMutation();
  const transferDocument = trpc.documents.sendDocument.useMutation();
  const utils = trpc.useUtils();

  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [userToSendTo, setUserToSendTo] = useState<User | null>(null);
  const [documentToSend, setDocumentToSend] = useState<string>("");

  // REFACTOR: currentUser.roles is now Role[] (implicit relation)
  const canManageUsers =
    currentUser?.roles.some(
      (role: { canManageUsers: boolean }) => role.canManageUsers
    ) || false;

  const handleRemoveFromOrg = () => {
    if (userToRemove) {
      removeUserFromOrg.mutate(
        { userId: userToRemove.id },
        {
          onSuccess: () => {
            utils.user.getUsersWithRoles.invalidate();
            setUserToRemove(null);
          },
        }
      );
    }
  };

  const handleSendDocument = () => {
    if (userToSendTo && documentToSend) {
      transferDocument.mutate(
        {
          documentId: documentToSend,
          recipientId: userToSendTo.id,
          tagIds: [],
        },
        {
          onSuccess: () => {
            setUserToSendTo(null);
            setDocumentToSend("");
          },
        }
      );
    }
  };

  if (isLoading) return <LoadingAnimation />;
  if (isError)
    return (
      <div className="container mt-4 alert alert-danger">
        Error: {error.message}
      </div>
    );

  return (
    <>
      <div className="container mt-4">
        <h2 className="mb-4">
          Users
          {currentUser?.organization && (
            <small className="text-muted">
              {" "}
              - {currentUser.organization.name} (
              {currentUser.organization.acronym})
            </small>
          )}
        </h2>
        <div className="card">
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users && users.length > 0 ? (
                  users.map((user: User) => (
                    <tr key={user.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <img
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                              user.name || user.email || "User"
                            )}&background=ED9B40&color=fff`}
                            alt={user.name || "User Avatar"}
                            className="rounded-circle me-3"
                            style={{
                              width: "48px",
                              height: "48px",
                              objectFit: "cover",
                            }}
                          />
                          <div>
                            <h6 className="fw-bold mb-0">
                              {user.name || "No Name"}
                            </h6>
                            <small className="text-muted">{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td className="align-middle">
                        <div className="role-pills-container">
                          {/* REFACTOR: user.roles is now Role[] */}
                          {user.roles.map((role: any) => (
                            <div
                              key={role.id}
                              className="role-pill"
                              data-role-name={role.name}
                            >
                              <span className="role-dot"></span>
                              {role.name}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex">
                          <button
                            className="btn btn-icon"
                            onClick={() => setUserToSendTo(user)}
                          >
                            <i className="bi bi-send"></i>
                          </button>
                          {canManageUsers && (
                            <>
                              <button
                                className="btn btn-icon"
                                data-bs-toggle="modal"
                                data-bs-target="#rolesModal"
                              >
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button
                                className="btn btn-icon"
                                onClick={() => setUserToRemove(user)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center text-muted py-4">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ConfirmModal
        show={!!userToRemove}
        onClose={() => setUserToRemove(null)}
        onConfirm={
          userToRemove && currentUser && userToRemove.id === currentUser.id
            ? () => {}
            : handleRemoveFromOrg
        }
        title={
          userToRemove && currentUser && userToRemove.id === currentUser.id
            ? "Action Not Allowed"
            : "Remove User"
        }
        isConfirming={removeUserFromOrg.isPending}
      >
        {userToRemove && currentUser && userToRemove.id === currentUser.id ? (
          <span>You can't remove yourself from the organization!</span>
        ) : (
          <>
            Are you sure you want to remove {userToRemove?.name} from the
            organization?
          </>
        )}
      </ConfirmModal>
      <ConfirmModal
        show={!!userToSendTo}
        onClose={() => setUserToSendTo(null)}
        onConfirm={handleSendDocument}
        title="Send Document"
        isConfirming={transferDocument.isPending}
      >
        <p>
          Send a document to <strong>{userToSendTo?.name}</strong>
        </p>
        <select
          className="form-select"
          value={documentToSend}
          onChange={(e) => setDocumentToSend(e.target.value)}
        >
          <option value="" disabled>
            Select a document
          </option>
          {myDocuments?.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
      </ConfirmModal>
      <RolesModal />
    </>
  );
}
