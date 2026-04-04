import React, { useEffect, useState, useRef, useMemo } from "react";
import { trpc } from "../trpc";
import { Modal } from "bootstrap";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { formatUserName } from "../utils/user";
import "./StandardModal.css";

type User = AppRouterOutputs["documents"]["getAppUsers"][0];

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

interface ForwardDocumentModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
  initialRecipientId?: string | null;
  forceRecipientLock?: boolean; // If true, disable the dropdowns
  users?: User[]; // Optional: if provided, we skip fetch
  campuses?: Campus[]; // Replacing flat institutions with hierarchical campuses
  recipient?: User | null; // The full user object if known
}

export const ForwardDocumentModal: React.FC<ForwardDocumentModalProps> = ({
  show,
  onClose,
  documentId,
  initialRecipientId,
  forceRecipientLock = false,
  users: propUsers,
  campuses: propCampuses,
}) => {
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [recipientId, setRecipientId] = useState(initialRecipientId || "");

  // --- Data Fetching (Fallback) ---
  const { data: fetchedUsers } = trpc.documents.getAppUsers.useQuery(
    undefined,
    { enabled: !propUsers && show },
  );
  const { data: fetchedOrgHierarchy } =
    trpc.user.getInstitutionHierarchy.useQuery(undefined, {
      enabled: !propCampuses && show,
    });

  const { data: document } = trpc.documents.getById.useQuery(
    { id: documentId },
    { enabled: !!documentId && show },
  );

  // Figure out prescribed routing
  const isTransitDocument =
    document?.recordStatus === "IN_TRANSIT" &&
    document?.classification === "FOR_APPROVAL";

  const users = propUsers || fetchedUsers;
  const campuses = propCampuses || fetchedOrgHierarchy?.campuses || [];

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

  const forwardDocumentMutation = trpc.documents.forwardDocument.useMutation();

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

    await forwardDocumentMutation.mutateAsync({
      documentId,
      recipientId,
    });

    onClose();
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
      onClick={!forwardDocumentMutation.isPending ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-forward-fill"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Forward Document</h5>
          </div>
          {!forwardDocumentMutation.isPending && (
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
                    forwardDocumentMutation.isPending
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
                    forwardDocumentMutation.isPending
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
                    forwardDocumentMutation.isPending
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
        </div>

        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={forwardDocumentMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={handleSend}
            disabled={!recipientId || forwardDocumentMutation.isPending}
          >
            {forwardDocumentMutation.isPending ? (
              <>
                <span className="standard-modal-spinner" />
                Forwarding...
              </>
            ) : (
              <>
                <i className="bi bi-forward-fill" /> Forward Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
