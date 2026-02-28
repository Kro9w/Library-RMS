import { useState, useEffect, useRef, useMemo } from "react";
import { Modal } from "bootstrap";
import { trpc } from "../trpc";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { formatUserName } from "../utils/user";

type User = AppRouterOutputs["documents"]["getAppUsers"][0];
type Tag = AppRouterOutputs["documents"]["getTags"][0];

// Define hierarchy types (reused from SendDocumentModal concept)
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

interface SendMultipleDocumentsModalProps {
  show: boolean;
  onClose: () => void;
  documentIds: string[];
  initialRecipientId: string | null;
  onSuccess?: () => void;
  users?: User[]; // Kept for fallback if needed, but primary path is campuses
  campuses?: Campus[];
  tags?: Tag[];
  globalTags?: Tag[];
}

export function SendMultipleDocumentsModal({
  show,
  onClose,
  documentIds,
  initialRecipientId,
  onSuccess,
  users: propUsers,
  campuses: propCampuses,
  tags: propTags,
  globalTags: propGlobalTags,
}: SendMultipleDocumentsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const bsModalRef = useRef<Modal | null>(null);

  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [recipientId, setRecipientId] = useState<string>(
    initialRecipientId || "",
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const utils = trpc.useContext();
  const sendMultipleMutation =
    trpc.documents.sendMultipleDocuments.useMutation();

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

  const users = propUsers || fetchedUsers;
  const campuses = propCampuses || fetchedOrgHierarchy?.campuses || [];
  const tags = propTags || fetchedTags;
  const globalTags = propGlobalTags || fetchedGlobalTags;

  const allTags = useMemo(
    () => [...(tags || []), ...(globalTags || [])],
    [tags, globalTags],
  );

  // Derive Dropdowns Options
  const departments = useMemo(() => {
    if (!selectedCampusId) return [];
    return (
      campuses.find((c: Campus) => c.id === selectedCampusId)?.departments || []
    );
  }, [selectedCampusId, campuses]);

  const filteredUsers = useMemo(() => {
    if (selectedDeptId && departments.length > 0) {
      const dept = departments.find((d: Department) => d.id === selectedDeptId);
      if (dept && dept.users) {
        return dept.users;
      }
    }
    // Fallback logic
    if (users && selectedDeptId) {
      return users.filter((u: any) => u.departmentId === selectedDeptId);
    }
    return [];
  }, [selectedDeptId, departments, users]);

  useEffect(() => {
    if (show) {
      if (initialRecipientId) {
        setRecipientId(initialRecipientId);
        // Pre-fill dropdowns
        let found = false;
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
        // Fallback
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
      setSelectedTagIds([]);
    }
  }, [show, initialRecipientId, campuses, users]);

  useEffect(() => {
    const modalElement = modalRef.current;
    if (modalElement) {
      if (!bsModalRef.current) {
        bsModalRef.current = new Modal(modalElement, {
          backdrop: "static",
          keyboard: false,
        });
        modalElement.addEventListener("hidden.bs.modal", onClose);
      }
      if (show) {
        bsModalRef.current.show();
      } else {
        bsModalRef.current.hide();
      }
    }
    return () => {
      if (modalElement) {
        modalElement.removeEventListener("hidden.bs.modal", onClose);
      }
    };
  }, [show, onClose]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId],
    );
  };

  const handleSend = async () => {
    if (!recipientId || documentIds.length === 0) return;

    try {
      await sendMultipleMutation.mutateAsync({
        documentIds: documentIds,
        recipientId: recipientId,
        tagIds: selectedTagIds,
      });

      utils.documents.getAll.invalidate();
      utils.user.getOrgHierarchy.invalidate();
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to send documents:", error);
      alert("Failed to send some documents. Please try again.");
    }
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

  const infoAlertStyle = {
    backgroundColor: "var(--hover-bg)",
    color: "var(--text)",
    border: "1px solid var(--card-border)",
    borderLeft: "4px solid var(--accent)",
  };

  return (
    <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
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
              <i className="bi bi-stack me-2"></i>
              Send {documentIds.length} Document
              {documentIds.length !== 1 && "s"}
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body p-4" style={modalBodyStyle}>
            <div
              className="alert d-flex align-items-center mb-4"
              style={infoAlertStyle}
            >
              <i className="bi bi-info-circle-fill me-2 fs-4 text-secondary"></i>
              <div>
                You are about to transfer ownership of{" "}
                <strong>{documentIds.length} documents</strong>.
              </div>
            </div>

            <div className="row g-3 mb-4">
              {/* Campus Selection */}
              <div className="col-12">
                <label htmlFor="multi-campus" style={labelStyle}>
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
                    id="multi-campus"
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
                <label htmlFor="multi-department" style={labelStyle}>
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
                    id="multi-department"
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
                <label htmlFor="multi-recipient" style={labelStyle}>
                  Recipient
                </label>
                <div className="input-group">
                  <span
                    className="input-group-text border-end-0"
                    style={inputGroupTextStyle}
                  >
                    <i className="bi bi-person-check"></i>
                  </span>
                  <select
                    id="multi-recipient"
                    className="form-select border-start-0 ps-0"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    disabled={!selectedDeptId}
                  >
                    <option value="">Select User...</option>
                    {filteredUsers?.map((user: User) => (
                      <option key={user.id} value={user.id}>
                        {formatUserName(user)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label style={labelStyle}>Apply Tags (Optional)</label>
              <div className="d-flex flex-wrap gap-2">
                {allTags.length > 0 ? (
                  allTags.map((tag: Tag) => (
                    <div key={tag.id} className="form-check-inline m-0">
                      <input
                        type="checkbox"
                        className="btn-check"
                        id={`multi-tag-${tag.id}`}
                        autoComplete="off"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                      />
                      <label
                        className={`btn btn-sm rounded-pill px-3 ${
                          selectedTagIds.includes(tag.id)
                            ? "btn-primary"
                            : "btn-outline-secondary"
                        }`}
                        htmlFor={`multi-tag-${tag.id}`}
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))
                ) : (
                  <div className="text-muted small fst-italic">
                    No tags available
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer" style={modalFooterStyle}>
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onClose}
              disabled={sendMultipleMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary px-4"
              onClick={handleSend}
              disabled={!recipientId || sendMultipleMutation.isPending}
            >
              {sendMultipleMutation.isPending ? (
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
                  <i className="bi bi-send-fill me-2"></i>Send All
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
