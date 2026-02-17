// apps/web/src/pages/Users.tsx
import { useState, useMemo, useEffect } from "react";
import { trpc } from "../trpc";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import "../components/Roles/RolesModal.css";
import { ConfirmModal } from "../components/ConfirmModal";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import { formatUserName, formatUserNameLastFirst } from "../utils/user";

type User = AppRouterOutputs["user"]["getUsersWithRoles"][0];

export function Users() {
  const {
    data: users,
    isLoading,
    isError,
    error,
  } = trpc.user.getUsersWithRoles.useQuery();
  const { data: currentUser } = trpc.user.getMe.useQuery();
  // Refactored to use getAll({ filter: 'mine' })
  const { data: myDocuments } = trpc.documents.getAll.useQuery({
    filter: "mine",
  });
  const removeUserFromOrg = trpc.user.removeUserFromOrg.useMutation();
  const transferDocument = trpc.documents.sendDocument.useMutation();
  const utils = trpc.useUtils();

  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [userToSendTo, setUserToSendTo] = useState<User | null>(null);
  const [documentToSend, setDocumentToSend] = useState<string>("");

  // State for collapsible departments
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>(
    {},
  );

  // Group users by department
  const groupedUsers = useMemo(() => {
    if (!users) return {};
    const groups: Record<string, User[]> = {};
    users.forEach((user) => {
      const deptName = user.department?.name || "Unassigned";
      if (!groups[deptName]) {
        groups[deptName] = [];
      }
      groups[deptName].push(user);
    });
    return groups;
  }, [users]);

  // Sort department names alphabetically
  const sortedDepts = useMemo(() => {
    return Object.keys(groupedUsers).sort((a, b) => a.localeCompare(b));
  }, [groupedUsers]);

  // Set initial expanded state: Open current user's department, close others
  useEffect(() => {
    if (currentUser?.department?.name && sortedDepts.length > 0) {
      setExpandedDepts((prev) => {
        // Only initialize if we haven't set any state yet (or if we want to force reset on load)
        // Given the requirement "only one open is the same department", we set it here.
        // We check if keys exist to avoid overwriting user interaction if this effect re-runs.
        if (Object.keys(prev).length === 0) {
          return { [currentUser.department!.name]: true };
        }
        return prev;
      });
    }
  }, [currentUser, sortedDepts]);

  const toggleDept = (deptName: string) => {
    setExpandedDepts((prev) => ({
      ...prev,
      [deptName]: !prev[deptName],
    }));
  };

  // REFACTOR: currentUser.roles is now Role[] (implicit relation)
  const canManageUsers =
    currentUser?.roles.some(
      (role: { canManageUsers: boolean }) => role.canManageUsers,
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
        },
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
        },
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
          {currentUser?.campus && (
            <small className="text-muted">
              {" "}
              -{" "}
              {currentUser.campus.name === "University Administration"
                ? currentUser.campus.name
                : `${currentUser.campus.name} Campus`}
            </small>
          )}
        </h2>

        {sortedDepts.length > 0 ? (
          <div className="accordion" id="departmentsAccordion">
            {sortedDepts.map((deptName) => (
              <div className="accordion-item" key={deptName}>
                <h2 className="accordion-header">
                  <button
                    className={`accordion-button ${
                      expandedDepts[deptName] ? "" : "collapsed"
                    }`}
                    type="button"
                    onClick={() => toggleDept(deptName)}
                    aria-expanded={expandedDepts[deptName]}
                  >
                    <span className="fw-bold me-2">{deptName}</span>
                    <span className="badge bg-secondary rounded-pill">
                      {groupedUsers[deptName].length}
                    </span>
                  </button>
                </h2>
                <div
                  className={`accordion-collapse collapse ${
                    expandedDepts[deptName] ? "show" : ""
                  }`}
                >
                  <div className="accordion-body p-0">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: "40%" }}>User</th>
                          <th style={{ width: "40%" }}>Roles</th>
                          <th style={{ width: "20%" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedUsers[deptName].map((user: User) => (
                          <tr key={user.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <img
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    formatUserName(user),
                                  )}&background=ED9B40&color=fff`}
                                  alt={formatUserName(user)}
                                  className="rounded-circle me-3"
                                  style={{
                                    width: "48px",
                                    height: "48px",
                                    objectFit: "cover",
                                  }}
                                />
                                <div>
                                  <h6 className="fw-bold mb-0">
                                    {formatUserNameLastFirst(user)}
                                  </h6>
                                  <small className="text-muted">
                                    {user.email}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td className="align-middle">
                              <div className="role-pills-container">
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
                            <td className="align-middle">
                              <div className="d-flex">
                                <button
                                  className="btn btn-icon"
                                  onClick={() => setUserToSendTo(user)}
                                  title="Send Document"
                                >
                                  <i className="bi bi-send"></i>
                                </button>
                                {canManageUsers && (
                                  <>
                                    <button
                                      className="btn btn-icon"
                                      onClick={() => setUserToRemove(user)}
                                      title="Remove User"
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="card-body text-center text-muted py-4">
              No users found in this campus.
            </div>
          </div>
        )}
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
            Are you sure you want to remove {formatUserName(userToRemove)} from
            the organization?
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
          Send a document to <strong>{formatUserName(userToSendTo)}</strong>
        </p>
        <select
          className="form-select"
          value={documentToSend}
          onChange={(e) => setDocumentToSend(e.target.value)}
        >
          <option value="" disabled>
            Select a document
          </option>
          {myDocuments?.map((doc: any) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
      </ConfirmModal>
    </>
  );
}
