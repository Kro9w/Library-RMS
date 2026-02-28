import React, { useEffect, useState, useRef, useMemo } from "react";
import { trpc } from "../trpc";
import { Modal } from "bootstrap";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { formatUserName } from "../utils/user";

type User = AppRouterOutputs["documents"]["getAppUsers"][0];
type Tag = AppRouterOutputs["documents"]["getTags"][0];

// Define hierarchy types
interface Campus {
  id: string;
  name: string;
  departments: Department[];
}

interface Department {
  id: string;
  name: string;
  users: any[];
}

interface SendDocumentModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
  initialRecipientId?: string | null;
  users?: User[]; // Optional: if provided, we skip fetch
  campuses?: Campus[]; // Replacing flat orgs with hierarchical campuses
  tags?: Tag[];
  globalTags?: Tag[];
  recipient?: User | null; // The full user object if known
}

export const SendDocumentModal: React.FC<SendDocumentModalProps> = ({
  show,
  onClose,
  documentId,
  initialRecipientId,
  users: propUsers,
  campuses: propCampuses,
  tags: propTags,
  globalTags: propGlobalTags,
  recipient: propRecipient,
}) => {
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [recipientId, setRecipientId] = useState(initialRecipientId || "");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // --- Data Fetching (Fallback) ---
  const { data: fetchedUsers } = trpc.documents.getAppUsers.useQuery(
    undefined,
    { enabled: !propUsers && show },
  );
  const { data: fetchedOrgHierarchy } = trpc.user.getOrgHierarchy.useQuery(
    undefined,
    {
      enabled: !propCampuses && show,
    },
  );
  const { data: fetchedTags } = trpc.documents.getTags.useQuery(undefined, {
    enabled: !propTags && show,
  });
  const { data: fetchedGlobalTags } = trpc.documents.getGlobalTags.useQuery(
    undefined,
    { enabled: !propGlobalTags && show },
  );
  // Only fetch roles if we don't have the user object with roles already
  const { data: usersWithRoles } = trpc.user.getUsersWithRoles.useQuery(
    undefined,
    {
      enabled: !propRecipient && !!recipientId && show,
    },
  );

  const users = propUsers || fetchedUsers;
  const campuses = propCampuses || fetchedOrgHierarchy?.campuses || [];
  const tags = propTags || fetchedTags;
  const globalTags = propGlobalTags || fetchedGlobalTags;

  // Derive Dropdowns Options
  const departments = useMemo(() => {
    if (!selectedCampusId) return [];
    return (
      campuses.find((c: Campus) => c.id === selectedCampusId)?.departments || []
    );
  }, [selectedCampusId, campuses]);

  const filteredUsers = useMemo(() => {
    // If we have a selected department, use the hierarchy structure if available
    if (selectedDeptId && departments.length > 0) {
      const dept = departments.find((d: Department) => d.id === selectedDeptId);
      if (dept && dept.users) {
        // Map hierarchy users to flat user structure if needed, or just use them
        return dept.users;
      }
    }
    // Fallback to filtering the flat user list if hierarchy user list is missing or empty
    if (users && selectedDeptId) {
      return users.filter((u: any) => u.departmentId === selectedDeptId);
    }
    return [];
  }, [selectedDeptId, departments, users]);

  // Resolve Recipient & Roles
  const currentRecipient = useMemo(() => {
    if (propRecipient && propRecipient.id === recipientId) return propRecipient;
    if (users) return users.find((u: any) => u.id === recipientId);
    return null;
  }, [recipientId, propRecipient, users]);

  const recipientRoles = useMemo(() => {
    if (currentRecipient && (currentRecipient as any).roles) {
      return (currentRecipient as any).roles;
    }
    return usersWithRoles?.find((u) => u.id === recipientId)?.roles;
  }, [currentRecipient, usersWithRoles, recipientId]);

  const filteredGlobalTags = useMemo(() => {
    const canManageDocuments = recipientRoles?.some(
      (role: any) => role.canManageDocuments,
    );
    return globalTags?.filter((tag: Tag) => {
      if (canManageDocuments) {
        return ["for review", "communication"].includes(tag.name);
      }
      return tag.name === "communication";
    });
  }, [globalTags, recipientRoles]);

  const sendDocumentMutation = trpc.documents.sendDocument.useMutation();

  const modalRef = useRef<HTMLDivElement>(null);
  const modalInstanceRef = useRef<Modal | null>(null);

  useEffect(() => {
    if (modalRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current);
      modalRef.current.addEventListener("hidden.bs.modal", () => {
        onClose();
      });
    }
    return () => {
      modalInstanceRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (show) {
      modalInstanceRef.current?.show();
    } else {
      modalInstanceRef.current?.hide();
    }
  }, [show]);

  // Initialize State on Open
  useEffect(() => {
    if (show) {
      if (initialRecipientId) {
        setRecipientId(initialRecipientId);
        // Pre-fill dropdowns based on recipient
        let found = false;
        // Search in hierarchy if available
        if (campuses) {
          for (const c of campuses) {
            for (const d of c.departments) {
              const u = d.users?.find((u: any) => u.id === initialRecipientId);
              if (u) {
                setSelectedCampusId(c.id);
                setSelectedDeptId(d.id);
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
        // Fallback to flat list check
        if (!found && users) {
          const u = users.find((u: any) => u.id === initialRecipientId);
          if (u) {
            setSelectedCampusId((u as any).campusId || "");
            setSelectedDeptId((u as any).departmentId || "");
          }
        }
      } else {
        setRecipientId("");
        setSelectedCampusId("");
        setSelectedDeptId("");
      }
      setSelectedTags(new Set());
    }
  }, [show, initialRecipientId, campuses, users]);

  const handleSend = async () => {
    if (!documentId || !recipientId) return;

    await sendDocumentMutation.mutateAsync({
      documentId,
      recipientId,
      tagIds: Array.from(selectedTags),
    });

    onClose();
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  // --- Inline Styles for Theme Compliance ---
  const modalHeaderStyle = {
    backgroundColor: "var(--background)",
    borderBottom: "1px solid var(--card-border)",
    color: "var(--primary)",
  };

  const modalBodyStyle = {
    backgroundColor: "var(--background)",
    color: "var(--text)",
  };

  const modalFooterStyle = {
    backgroundColor: "var(--background)",
    borderTop: "1px solid var(--card-border)",
  };

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    textTransform: "uppercase" as const,
    fontWeight: "bold" as const,
    marginBottom: "0.5rem",
  };

  const inputGroupTextStyle = {
    backgroundColor: "var(--input-bg)",
    borderColor: "var(--card-border)",
    color: "var(--text-muted)",
  };

  return (
    <div
      className="modal fade"
      ref={modalRef}
      id="sendDocumentModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content"
          style={{
            backgroundColor: "var(--card-background)",
            border: "1px solid var(--card-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="modal-header" style={modalHeaderStyle}>
            <h5 className="modal-title">
              <i className="bi bi-send me-2"></i>Send Document
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body p-4" style={modalBodyStyle}>
            <div className="row g-3">
              {/* Campus Selection */}
              <div className="col-12">
                <label htmlFor="campus" style={labelStyle}>
                  Campus
                </label>
                <div className="input-group">
                  <span
                    className="input-group-text border-end-0"
                    style={inputGroupTextStyle}
                  >
                    <i className="bi bi-bank"></i>
                  </span>
                  <select
                    id="campus"
                    className="form-select border-start-0 ps-0"
                    value={selectedCampusId}
                    onChange={(e) => {
                      setSelectedCampusId(e.target.value);
                      setSelectedDeptId("");
                      setRecipientId("");
                    }}
                  >
                    <option value="">Select Campus...</option>
                    {campuses.map((campus: Campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Selection */}
              <div className="col-12">
                <label htmlFor="department" style={labelStyle}>
                  Department / Office
                </label>
                <div className="input-group">
                  <span
                    className="input-group-text border-end-0"
                    style={inputGroupTextStyle}
                  >
                    <i className="bi bi-building"></i>
                  </span>
                  <select
                    id="department"
                    className="form-select border-start-0 ps-0"
                    value={selectedDeptId}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value);
                      setRecipientId("");
                    }}
                    disabled={!selectedCampusId}
                  >
                    <option value="">Select Department...</option>
                    {departments.map((dept: Department) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recipient Selection */}
              <div className="col-12">
                <label htmlFor="recipient" style={labelStyle}>
                  Recipient
                </label>
                <div className="input-group">
                  <span
                    className="input-group-text border-end-0"
                    style={inputGroupTextStyle}
                  >
                    <i className="bi bi-person"></i>
                  </span>
                  <select
                    id="recipient"
                    className="form-select border-start-0 ps-0"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    disabled={!selectedDeptId}
                  >
                    <option value="">Select Recipient...</option>
                    {filteredUsers?.map((user: User) => (
                      <option key={user.id} value={user.id}>
                        {formatUserName(user)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <hr
              className="my-4"
              style={{ borderColor: "var(--card-border)" }}
            />

            <div className="mb-4">
              <label style={labelStyle}>Standard Tags</label>
              <div className="d-flex flex-wrap gap-2">
                {tags?.length ? (
                  tags.map((tag: Tag) => (
                    <div key={tag.id} className="form-check-inline m-0">
                      <input
                        type="checkbox"
                        className="btn-check"
                        id={`tag-${tag.id}`}
                        autoComplete="off"
                        checked={selectedTags.has(tag.id)}
                        onChange={() => handleTagChange(tag.id)}
                      />
                      <label
                        className={`btn btn-sm rounded-pill px-3 ${
                          selectedTags.has(tag.id)
                            ? "btn-primary"
                            : "btn-outline-secondary"
                        }`}
                        htmlFor={`tag-${tag.id}`}
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <span className="text-muted small fst-italic">
                    No tags available
                  </span>
                )}
              </div>
            </div>

            <div className="mb-2">
              <label style={labelStyle}>Action Tags</label>
              <div className="d-flex flex-wrap gap-2">
                {filteredGlobalTags?.length ? (
                  filteredGlobalTags.map((tag: Tag) => (
                    <div key={tag.id} className="form-check-inline m-0">
                      <input
                        type="checkbox"
                        className="btn-check"
                        id={`global-tag-${tag.id}`}
                        autoComplete="off"
                        checked={selectedTags.has(tag.id)}
                        onChange={() => handleTagChange(tag.id)}
                      />
                      <label
                        className={`btn btn-sm rounded-pill px-3 ${
                          selectedTags.has(tag.id)
                            ? "btn-secondary"
                            : "btn-outline-secondary"
                        }`}
                        htmlFor={`global-tag-${tag.id}`}
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <span className="text-muted small fst-italic">
                    No action tags available for this user
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer" style={modalFooterStyle}>
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary px-4"
              onClick={handleSend}
              disabled={!recipientId || sendDocumentMutation.isPending}
            >
              {sendDocumentMutation.isPending ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Sending...
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill me-2"></i>Send Document
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
