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

  // Helper to get highest role level (1 is highest priority)
  const getUserLevel = (user: User): number => {
    if (!user.roles || user.roles.length === 0) return 4;
    return Math.min(...user.roles.map((r: any) => r.level ?? 4));
  };

  // Group users by department AND sort them by level
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

    // Sort users within each group: Level 1 -> Level 4
    Object.keys(groups).forEach((dept) => {
      groups[dept].sort((a, b) => {
        const levelA = getUserLevel(a);
        const levelB = getUserLevel(b);
        if (levelA !== levelB) {
          return levelA - levelB; // Ascending: 1 is top
        }
        // Tie-breaker: Name
        return formatUserNameLastFirst(a).localeCompare(
          formatUserNameLastFirst(b),
        );
      });
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
      <style>{`
        /* Override Accordion Active State */
        .accordion-button:not(.collapsed) {
          background-color: #ED9B40 !important;
          color: white !important; /* Changed to white for better contrast, or black if user prefers */
          font-weight: bold;
          box-shadow: none !important; /* Remove focus ring */
        }
        .accordion-button:focus {
            box-shadow: none !important;
            border-color: rgba(0,0,0,.125);
        }
        
        /* Custom Shield with Star Icon */
        .shield-icon-wrapper {
            position: absolute;
            bottom: -5px; /* Adjust vertical position */
            left: -5px;   /* Adjust horizontal position */
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        
        .shield-base {
            font-size: 20px;
            color: #ED9B40; /* Using Theme Yellow/Orange for the shield itself, or grey? User said "same shield icon". Let's use Theme. */
            /* Or maybe a dark grey shield looks more "Leadership"? Let's try Theme Yellow since user mentioned yellow for active state. */
            color: #495057; /* Let's stick to a professional dark grey base for the shield */
        }
        
        .shield-star {
            font-size: 8px; /* Small star inside */
            color: #FFD700; /* Gold star */
            position: absolute;
            top: 55%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 11;
        }

        /* Adjust Table Padding */
        .table > :not(caption) > * > * {
            padding: 1rem 1rem; /* Increased padding (p-3 equivalent) */
        }
      `}</style>

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
                    <span
                      className="fw-bold me-2"
                      style={{
                        color: expandedDepts[deptName] ? "white" : "inherit",
                      }}
                    >
                      {deptName}
                    </span>
                    <span
                      className={`badge rounded-pill ${expandedDepts[deptName] ? "bg-white text-dark" : "bg-secondary"}`}
                    >
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
                    <table className="table table-hover mb-0 align-middle">
                      <thead>
                        <tr>
                          <th style={{ width: "45%" }}>User</th>
                          <th style={{ width: "40%" }}>Roles</th>
                          <th style={{ width: "15%" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedUsers[deptName].map((user: User) => {
                          const level = getUserLevel(user);

                          return (
                            <tr key={user.id}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="position-relative me-3">
                                    <img
                                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                                        formatUserName(user),
                                      )}&background=ED9B40&color=fff`}
                                      alt={formatUserName(user)}
                                      className="rounded-circle"
                                      style={{
                                        width: "48px",
                                        height: "48px",
                                        objectFit: "cover",
                                        // Removed border
                                      }}
                                    />

                                    {/* Badge logic: Bottom-Left */}
                                    {level === 1 && (
                                      <div
                                        className="shield-icon-wrapper"
                                        title="Department Head"
                                      >
                                        {/* Stacked Icon: Shield base + Star overlay */}
                                        <i className="bi bi-shield-fill shield-base"></i>
                                        <i className="bi bi-star-fill shield-star"></i>
                                      </div>
                                    )}
                                    {level === 2 && (
                                      <div
                                        className="shield-icon-wrapper"
                                        title="Officer"
                                      >
                                        {/* Plain Shield */}
                                        <i className="bi bi-shield-fill shield-base"></i>
                                      </div>
                                    )}
                                  </div>
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
                              <td>
                                <div className="role-pills-container">
                                  {user.roles.map((role: any) => (
                                    <div
                                      key={role.id}
                                      className="role-pill" // Removed bg-warning logic
                                      data-role-name={role.name}
                                    >
                                      <span className="role-dot"></span>
                                      {role.name}
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex gap-2">
                                  <button
                                    className="btn btn-sm btn-outline-primary border-0"
                                    onClick={() => setUserToSendTo(user)}
                                    title="Send Document"
                                  >
                                    <i className="bi bi-send fs-5"></i>
                                  </button>
                                  {canManageUsers && (
                                    <>
                                      <button
                                        className="btn btn-sm btn-outline-danger border-0"
                                        onClick={() => setUserToRemove(user)}
                                        title="Remove User"
                                      >
                                        <i className="bi bi-trash fs-5"></i>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
