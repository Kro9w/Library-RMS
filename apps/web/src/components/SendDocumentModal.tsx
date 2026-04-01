import React, { useEffect, useState, useRef, useMemo } from "react";
import { trpc } from "../trpc";
import { Modal } from "bootstrap";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { formatUserName } from "../utils/user";
import "./StandardModal.css";

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
  forceRecipientLock?: boolean; // If true, disable the dropdowns
  users?: User[]; // Optional: if provided, we skip fetch
  campuses?: Campus[]; // Replacing flat institutions with hierarchical campuses
  tags?: Tag[];
  globalTags?: Tag[];
  recipient?: User | null; // The full user object if known
}

export const SendDocumentModal: React.FC<SendDocumentModalProps> = ({
  show,
  onClose,
  documentId,
  initialRecipientId,
  forceRecipientLock = false,
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
  const { data: fetchedOrgHierarchy } =
    trpc.user.getInstitutionHierarchy.useQuery(undefined, {
      enabled: !propCampuses && show,
    });
  const { data: fetchedTags } = trpc.documents.getTags.useQuery(undefined, {
    enabled: !propTags && show,
  });

  const { data: document } = trpc.documents.getById.useQuery(
    { id: documentId },
    { enabled: !!documentId && show },
  );

  // Figure out prescribed routing
  const isTransitDocument =
    document?.recordStatus === "IN_TRANSIT" &&
    document?.classification === "FOR_APPROVAL";

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

  const trpcCtx = trpc.useContext();

  const nextRouteStop = useMemo(() => {
    if (!isTransitDocument || !document?.transitRoutes) return null;

    // If the document is returned/disapproved, we should not enforce the forward transit route
    // The originator is resubmitting back to the specific reviewer.
    if (
      document.status === "Returned for Corrections/Revision/Clarification" ||
      document.status === "Disapproved"
    ) {
      return null;
    }

    // Check if the current user/department has already received this document.
    const currentUser = users?.find(
      (u: { id: string | undefined }) =>
        u.id === trpcCtx.user.getMe.getData()?.id,
    );
    const currentUserDept =
      currentUser?.departmentId || trpcCtx.user.getMe.getData()?.departmentId;

    const currentStop = document.transitRoutes.find(
      (r: any) => r.status === "CURRENT",
    );

    // If the person opening this modal is IN the CURRENT stop's department,
    // they are likely trying to send it to the NEXT office (the PENDING one).
    // Otherwise, they are an outsider (or originator) trying to send it to the CURRENT office.
    if (currentStop && currentUserDept === currentStop.departmentId) {
      const nextPending = document.transitRoutes.find(
        (r: any) =>
          r.status === "PENDING" && r.sequenceOrder > currentStop.sequenceOrder,
      );
      if (nextPending) return nextPending;
    }

    if (currentStop) {
      return currentStop;
    }

    // Fallback if there is no current stop
    return (
      document.transitRoutes.find((r: any) => r.status === "PENDING") || null
    );
  }, [document, isTransitDocument, users, trpcCtx]);

  const hasPrescribedRoute = !!nextRouteStop;

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
    // If no recipient is selected, we still want to show the tag if it's valid for the document,
    // or we might decide to hide it. Let's show it by default if the document is confidential,
    // but the actual backend will throw if they try to send to an invalid recipient anyway.
    // Actually, to make it not disappear when switching recipients, let's relax the client-side
    // canManageDocuments check slightly, or ensure we default to true if roles aren't loaded yet.
    const hasManagePerms = recipientRoles
      ? recipientRoles.some((role: any) => role.canManageDocuments)
      : true; // Default to true so it doesn't flicker/vanish before recipient is picked.

    const isConfidential =
      (document as any)?.classification === "CONFIDENTIAL" ||
      (document as any)?.classification?.toUpperCase() === "CONFIDENTIAL";

    return globalTags?.filter((tag: Tag) => {
      // In some environments, the tags might be capitalized or differently named
      const tagName = tag.name.toLowerCase();
      if (tagName === "for review") {
        return hasManagePerms && isConfidential;
      }
      return tagName === "communication";
    });
  }, [globalTags, recipientRoles, document]);

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
      modalInstanceRef.current = null;
    };
  }, [onClose]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (show && modalInstanceRef.current) {
      // Ensure React has painted the modal content before showing it
      timeoutId = setTimeout(() => {
        modalInstanceRef.current?.show();
      }, 50);
    } else if (!show && modalInstanceRef.current) {
      modalInstanceRef.current.hide();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [show]);

  // Use simple primitives to avoid deep object dependency loops
  const targetDeptId = nextRouteStop?.departmentId;
  const initialRecipientIdSafe = initialRecipientId || "";
  const isInitializedRef = useRef(false);

  // Initialize State on Open
  useEffect(() => {
    if (!show) {
      isInitializedRef.current = false;
      return;
    }

    // Require both campuses and users to be available before initializing
    if (
      show &&
      !isInitializedRef.current &&
      campuses &&
      campuses.length > 0 &&
      users &&
      users.length > 0
    ) {
      if (hasPrescribedRoute && targetDeptId) {
        // Pre-fill next prescribed office in transit route
        setSelectedDeptId(targetDeptId);

        // Find campus for this dept
        const campus = campuses.find((c: Campus) =>
          c.departments.some((d) => d.id === targetDeptId),
        );
        if (campus) setSelectedCampusId(campus.id);

        setRecipientId(""); // clear specific recipient so user selects one in that locked dept
      } else if (initialRecipientIdSafe) {
        setRecipientId(initialRecipientIdSafe);
        // Pre-fill dropdowns based on recipient
        let found = false;
        // Search in hierarchy if available
        for (const c of campuses) {
          for (const d of c.departments) {
            const u = d.users?.find(
              (u: any) => u.id === initialRecipientIdSafe,
            );
            if (u) {
              setSelectedCampusId(c.id);
              setSelectedDeptId(d.id);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        // Fallback to flat list check
        if (!found && users && users.length > 0) {
          const u = users.find((u: any) => u.id === initialRecipientIdSafe);
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
      isInitializedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    show,
    initialRecipientIdSafe,
    hasPrescribedRoute,
    targetDeptId,
    campuses,
    users,
  ]); // We need to depend on campuses and users since they load asynchronously!

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

  const labelStyle = {
    color: "var(--text-muted)",
    fontSize: "0.8rem",
    textTransform: "uppercase" as const,
    fontWeight: "bold" as const,
    marginBottom: "0.5rem",
  };

  const inputGroupTextStyle = {
    backgroundColor: "var(--input-bg)",
    borderColor: "var(--border)",
    color: "var(--text-muted)",
  };

  if (!show) return null;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!sendDocumentMutation.isPending ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-send"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Send Document</h5>
          </div>
          {!sendDocumentMutation.isPending && (
            <button
              type="button"
              className="standard-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

        <div className="standard-modal-body">
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
                  disabled={
                    forceRecipientLock ||
                    hasPrescribedRoute ||
                    sendDocumentMutation.isPending
                  }
                  title={
                    hasPrescribedRoute
                      ? "This route is prescribed for approval"
                      : undefined
                  }
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
                  disabled={
                    !selectedCampusId ||
                    forceRecipientLock ||
                    hasPrescribedRoute ||
                    sendDocumentMutation.isPending
                  }
                  title={
                    hasPrescribedRoute
                      ? "This route is prescribed for approval"
                      : undefined
                  }
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
                  disabled={
                    !selectedDeptId ||
                    forceRecipientLock ||
                    sendDocumentMutation.isPending
                  }
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
            className="my-3 w-100 mx-0"
            style={{ borderColor: "var(--border)", margin: 0 }}
          />

          <div className="mb-2">
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
                      disabled={sendDocumentMutation.isPending}
                    />
                    <label
                      className={`btn btn-sm rounded-pill px-3 ${
                        selectedTags.has(tag.id)
                          ? "btn-primary"
                          : "btn-outline-secondary"
                      }`}
                      htmlFor={`tag-${tag.id}`}
                      style={{ fontSize: "12px", padding: "4px 10px" }}
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

          <div>
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
                      disabled={sendDocumentMutation.isPending}
                    />
                    <label
                      className={`btn btn-sm rounded-pill px-3 ${
                        selectedTags.has(tag.id)
                          ? "btn-secondary"
                          : "btn-outline-secondary"
                      }`}
                      htmlFor={`global-tag-${tag.id}`}
                      style={{ fontSize: "12px", padding: "4px 10px" }}
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

        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={sendDocumentMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={handleSend}
            disabled={!recipientId || sendDocumentMutation.isPending}
          >
            {sendDocumentMutation.isPending ? (
              <>
                <span className="standard-modal-spinner" />
                Sending...
              </>
            ) : (
              <>
                <i className="bi bi-send-fill" /> Send Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
