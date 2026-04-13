import React, { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import { AlertModal } from "../components/AlertModal";
import { formatUserName } from "../utils/user";
import type { ClassificationType } from "../components/ClassificationBadge";
import { ClassificationBadge } from "../components/ClassificationBadge";
import { useUser } from "../contexts/SessionContext";
import "./SendDocumentPage.css";

type StepId = "scope" | "campuses" | "departments" | "users" | "confirm";
type StepState = "active" | "done" | "skipped" | "pending";

interface StepDef {
  id: StepId;
  label: string;
  icon: string;
}

const ALL_STEPS: StepDef[] = [
  { id: "scope", label: "Institution", icon: "bi-globe2" },
  { id: "campuses", label: "Campuses", icon: "bi-buildings" },
  { id: "departments", label: "Departments", icon: "bi-diagram-3" },
  { id: "users", label: "Users", icon: "bi-people" },
  { id: "confirm", label: "Confirm", icon: "bi-send-check" },
];

function getStepsForClassification(classification: string): StepDef[] {
  switch (classification) {
    case "INSTITUTIONAL":
      return ALL_STEPS;
    case "INTERNAL":
      return ALL_STEPS.filter((s) => s.id !== "scope" && s.id !== "campuses");
    case "DEPARTMENTAL":
      return ALL_STEPS.filter(
        (s) =>
          s.id !== "scope" && s.id !== "campuses" && s.id !== "departments",
      );
    case "RESTRICTED":
    case "EXTERNAL":
    default:
      return ALL_STEPS.filter((s) => s.id === "users" || s.id === "confirm");
  }
}

interface SendConfirmationModalProps {
  show: boolean;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
  institutionSelected: boolean;
  selectedCampuses: Set<string>;
  allCampuses: any[];
  selectedDepts: Set<string>;
  allDepts: any[];
  selectedUsers: Set<string>;
  allUsers: any[];
  documentTitle: string;
}

const SendConfirmationModal: React.FC<SendConfirmationModalProps> = ({
  show,
  onConfirm,
  onClose,
  isPending,
  institutionSelected,
  selectedCampuses,
  allCampuses,
  selectedDepts,
  selectedUsers,
  documentTitle,
}) => {
  if (!show) return null;

  const campusCount = institutionSelected
    ? allCampuses.length
    : selectedCampuses.size;
  const deptCount = institutionSelected
    ? allCampuses.reduce(
        (acc: number, c: any) => acc + (c.departments?.length ?? 0),
        0,
      )
    : selectedDepts.size > 0
      ? selectedDepts.size
      : 0;

  const scopeLabel = institutionSelected
    ? `the entire institution`
    : selectedCampuses.size > 0
      ? `${campusCount} campus${campusCount !== 1 ? "es" : ""}`
      : selectedDepts.size > 0
        ? `${deptCount} department${deptCount !== 1 ? "s" : ""}`
        : `${selectedUsers.size} user${selectedUsers.size !== 1 ? "s" : ""}`;

  return (
    <div
      className="standard-modal-backdrop"
      onClick={!isPending ? onClose : undefined}
    >
      <div
        className="standard-modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-send-fill"></i>
          </div>
          <div className="standard-modal-header-text">
            <h5 className="standard-modal-title">Confirm Broadcast</h5>
            <p className="standard-modal-subtitle">Review before sending</p>
          </div>
          {!isPending && (
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
          <div className="standard-modal-notice standard-modal-notice-warning">
            <i className="bi bi-exclamation-triangle"></i>
            <p>
              You are about to send{" "}
              <strong>&ldquo;{documentTitle}&rdquo;</strong> to{" "}
              <strong>{scopeLabel}</strong>.
              {deptCount > 0 && (
                <>
                  {" "}
                  This will grant read access across{" "}
                  <strong>
                    {deptCount} department{deptCount !== 1 ? "s" : ""}
                  </strong>{" "}
                  {campusCount > 0 && (
                    <>
                      across{" "}
                      <strong>
                        {campusCount} campus{campusCount !== 1 ? "es" : ""}
                      </strong>
                    </>
                  )}
                  .
                </>
              )}{" "}
              This action cannot be undone.
            </p>
          </div>
          {selectedUsers.size > 0 && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                margin: "4px 0 0",
              }}
            >
              Additionally, <strong>{selectedUsers.size}</strong> specific user
              {selectedUsers.size !== 1 ? "s" : ""} will also receive access.
            </p>
          )}
        </div>

        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <span className="standard-modal-spinner" />
                Sending…
              </>
            ) : (
              <>
                <i className="bi bi-send-fill" />
                Confirm &amp; Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CheckCardProps {
  id: string;
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const CheckCard: React.FC<CheckCardProps> = ({
  id,
  label,
  sublabel,
  checked,
  onChange,
}) => (
  <label
    htmlFor={id}
    className={`send-check-card ${checked ? "send-check-card--checked" : ""}`}
  >
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="send-check-card__input"
    />
    <span className="send-check-card__tick">
      {checked ? <i className="bi bi-check-lg" /> : null}
    </span>
    <span className="send-check-card__body">
      <span className="send-check-card__label">{label}</span>
      {sublabel && (
        <span className="send-check-card__sublabel">{sublabel}</span>
      )}
    </span>
  </label>
);

interface GroupedSearchableListProps {
  items: { id: string; label: string; sublabel?: string; group?: string }[];
  selected: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const SearchableList: React.FC<GroupedSearchableListProps> = ({
  items,
  selected,
  onToggle,
  placeholder = "Search…",
  emptyMessage = "No items found.",
  onSelectAll,
  onDeselectAll,
}) => {
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      q.trim()
        ? items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
        : items,
    [items, q],
  );

  const allSelected =
    filtered.length > 0 && filtered.every((i) => selected.has(i.id));

  const grouped = useMemo(() => {
    const groups: Record<string, typeof items> = {};
    const ungrouped: typeof items = [];

    filtered.forEach((item) => {
      if (item.group) {
        if (!groups[item.group]) groups[item.group] = [];
        groups[item.group].push(item);
      } else {
        ungrouped.push(item);
      }
    });

    return { groups, ungrouped };
  }, [filtered]);

  return (
    <div className="send-searchable">
      <div className="send-searchable__toolbar">
        <div className="send-searchable__search-wrap">
          <i className="bi bi-search send-searchable__search-icon" />
          <input
            type="text"
            className="send-searchable__search"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              className="send-searchable__search-clear"
              onClick={() => setQ("")}
              aria-label="Clear"
            >
              <i className="bi bi-x" />
            </button>
          )}
        </div>
        {(onSelectAll || onDeselectAll) && (
          <button
            className="send-searchable__toggle-all"
            onClick={() => {
              if (allSelected) {
                onDeselectAll?.();
              } else {
                onSelectAll?.();
              }
            }}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      <div className="send-searchable__list">
        {filtered.length === 0 ? (
          <div className="send-searchable__empty">
            <i className="bi bi-search" />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          <>
            {Object.entries(grouped.groups).map(([groupName, groupItems]) => {
              const allGroupSelected = groupItems.every((i) =>
                selected.has(i.id),
              );
              return (
                <div key={groupName} className="send-searchable-group">
                  <div className="send-searchable-group__header">
                    <span className="send-searchable-group__title">
                      {groupName}
                    </span>
                    <button
                      className="send-searchable-group__toggle"
                      onClick={() => {
                        groupItems.forEach((item) =>
                          onToggle(item.id, !allGroupSelected),
                        );
                      }}
                    >
                      {allGroupSelected ? "Deselect group" : "Select group"}
                    </button>
                  </div>
                  <div className="send-searchable-group__items">
                    {groupItems.map((item) => (
                      <CheckCard
                        key={item.id}
                        id={`item-${item.id}`}
                        label={item.label}
                        sublabel={item.sublabel}
                        checked={selected.has(item.id)}
                        onChange={(c) => onToggle(item.id, c)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {grouped.ungrouped.length > 0 && (
              <div className="send-searchable-group__items mt-2">
                {grouped.ungrouped.map((item) => (
                  <CheckCard
                    key={item.id}
                    id={`item-${item.id}`}
                    label={item.label}
                    sublabel={item.sublabel}
                    checked={selected.has(item.id)}
                    onChange={(c) => onToggle(item.id, c)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

interface AudienceSummaryProps {
  institutionSelected: boolean;
  campusCount: number;
  deptCount: number;
  userCount: number;
}

const AudienceSummary: React.FC<AudienceSummaryProps> = ({
  institutionSelected,
  campusCount,
  deptCount,
  userCount,
}) => {
  const chips: { icon: string; text: string }[] = [];

  if (institutionSelected) {
    chips.push({ icon: "bi-globe2", text: "Institution-wide" });
  }
  if (campusCount > 0) {
    chips.push({
      icon: "bi-buildings",
      text: `${campusCount} campus${campusCount !== 1 ? "es" : ""}`,
    });
  }
  if (deptCount > 0) {
    chips.push({
      icon: "bi-diagram-3",
      text: `${deptCount} department${deptCount !== 1 ? "s" : ""}`,
    });
  }
  if (userCount > 0) {
    chips.push({
      icon: "bi-person",
      text: `${userCount} user${userCount !== 1 ? "s" : ""}`,
    });
  }

  if (chips.length === 0) {
    return (
      <div className="send-summary send-summary--empty">
        <i className="bi bi-send" />
        <span>No recipients selected yet</span>
      </div>
    );
  }

  return (
    <div className="send-summary">
      <span className="send-summary__label">Sending to:</span>
      {chips.map((c) => (
        <span key={c.text} className="send-summary__chip">
          <i className={`bi ${c.icon}`} />
          {c.text}
        </span>
      ))}
    </div>
  );
};

export const SendDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authUser = useUser();

  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [institutionSelected, setInstitutionSelected] = useState(false);
  const [selectedCampuses, setSelectedCampuses] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [stepIndex, setStepIndex] = useState(0);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  const { data: document, isLoading: isLoadingDoc } =
    trpc.documents.getById.useQuery({ id: id! }, { enabled: !!id });

  const { data: orgHierarchy, isLoading: isLoadingOrg } =
    trpc.user.getInstitutionHierarchy.useQuery();
  const { data: dbUser } = trpc.user.getMe.useQuery(undefined, {
    enabled: !!authUser,
  });

  const sendMutation = trpc.documents.sendDocument.useMutation();

  const classification = (document?.classification ?? "RESTRICTED") as string;

  const isInstitutionWide =
    classification === "INSTITUTIONAL" && institutionSelected;

  const baseSteps = useMemo(
    () => getStepsForClassification(classification),
    [classification],
  );

  const steps = useMemo(() => {
    if (isInstitutionWide) {
      return baseSteps.filter((s) => s.id === "scope" || s.id === "confirm");
    }
    return baseSteps;
  }, [baseSteps, isInstitutionWide]);

  const clampedStepIndex = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[clampedStepIndex];

  const allCampuses = useMemo(
    () => orgHierarchy?.campuses ?? [],
    [orgHierarchy],
  );

  const relevantDepts = useMemo(() => {
    if (classification === "DEPARTMENTAL") {
      if (!dbUser?.departmentId) return [];
      const userDept = allCampuses
        .flatMap((c: any) => c.departments)
        .find((d: any) => d.id === dbUser.departmentId);
      return userDept ? [userDept] : [];
    }
    if (classification === "INTERNAL") {
      if (!dbUser?.campusId) return [];
      const userCampus = allCampuses.find((c: any) => c.id === dbUser.campusId);
      return userCampus
        ? userCampus.departments.map((d: any) => ({
            ...d,
            campusName: userCampus.name,
          }))
        : [];
    }
    if (classification === "RESTRICTED" || classification === "EXTERNAL") {
      if (!dbUser?.campusId) return [];
      const userCampus = allCampuses.find((c: any) => c.id === dbUser.campusId);
      return userCampus
        ? userCampus.departments.map((d: any) => ({
            ...d,
            campusName: userCampus.name,
          }))
        : [];
    }
    if (selectedCampuses.size === 0) {
      return allCampuses.flatMap((c: any) =>
        c.departments.map((d: any) => ({ ...d, campusName: c.name })),
      );
    }
    return allCampuses
      .filter((c: any) => selectedCampuses.has(c.id))
      .flatMap((c: any) =>
        c.departments.map((d: any) => ({ ...d, campusName: c.name })),
      );
  }, [allCampuses, selectedCampuses, classification, dbUser]);

  const allUsers = useMemo(() => {
    let users = allCampuses.flatMap((c: any) =>
      c.departments.flatMap((d: any) =>
        (d.users ?? []).map((u: any) => ({
          ...u,
          deptId: d.id,
          deptName: d.name,
          campusId: c.id,
          campusName: c.name,
        })),
      ),
    );

    if (classification === "DEPARTMENTAL") {
      if (dbUser?.departmentId) {
        users = users.filter((u: any) => u.deptId === dbUser.departmentId);
      }
    } else if (classification === "INTERNAL") {
      if (dbUser?.campusId) {
        users = users.filter((u: any) => u.campusId === dbUser.campusId);
      }
    } else if (
      classification === "RESTRICTED" ||
      classification === "EXTERNAL"
    ) {
      if (dbUser?.campusId) {
        users = users.filter((u: any) => u.campusId === dbUser.campusId);
      }
    } else if (classification === "INSTITUTIONAL") {
      if (selectedDepts.size > 0) {
        users = users.filter((u: any) => selectedDepts.has(u.deptId));
      } else if (selectedCampuses.size > 0) {
        users = users.filter((u: any) => selectedCampuses.has(u.campusId));
      }
    }

    return users;
  }, [allCampuses, classification, dbUser, selectedCampuses, selectedDepts]);

  const campusItems = allCampuses.map((c: any) => ({
    id: c.id,
    label: c.name,
    sublabel: `${c.departments.length} department${c.departments.length !== 1 ? "s" : ""}`,
  }));

  const deptItems = relevantDepts.map((d: any) => ({
    id: d.id,
    label: d.name,
    sublabel: (d as any).campusName,
    group: (d as any).campusName,
  }));

  const userItems = allUsers.map((u: any) => ({
    id: u.id,
    label: formatUserName(u),
    sublabel: `${u.deptName} · ${u.campusName}`,
    group: `${u.campusName} — ${u.deptName}`,
  }));

  const getStepState = useCallback(
    (idx: number): StepState => {
      if (idx === clampedStepIndex) return "active";
      if (idx > clampedStepIndex) return "pending";
      if (skippedSteps.has(idx)) return "skipped";
      return "done";
    },
    [clampedStepIndex, skippedSteps],
  );

  const handleNext = () => {
    if (clampedStepIndex < steps.length - 1)
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const handleSkip = () => {
    const currentStepId = steps[clampedStepIndex].id;

    if (currentStepId === "scope") {
      setInstitutionSelected(false);
    } else if (currentStepId === "campuses") {
      setSelectedCampuses(new Set());
    } else if (currentStepId === "departments") {
      setSelectedDepts(new Set());
    } else if (currentStepId === "users") {
      setSelectedUsers(new Set());
    }

    setSkippedSteps((prev) => {
      const next = new Set(prev);
      next.add(clampedStepIndex);
      return next;
    });

    if (clampedStepIndex < steps.length - 1) {
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    if (clampedStepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleStepClick = (idx: number) => {
    if (idx < clampedStepIndex) {
      setStepIndex(idx);
      setSkippedSteps((prev) => {
        const next = new Set(prev);
        next.delete(idx);
        return next;
      });
    }
  };

  const handleInstitutionToggle = (checked: boolean) => {
    setInstitutionSelected(checked);
    if (checked) {
      setSelectedCampuses(new Set());
      setSelectedDepts(new Set());
    }
  };

  const handleSend = async () => {
    if (!id) return;
    setShowConfirmModal(false);
    try {
      let implicitCampusIds = Array.from(selectedCampuses);
      let implicitDepartmentIds = Array.from(selectedDepts);

      if (classification === "INTERNAL" && dbUser?.campusId) {
        implicitCampusIds = [dbUser.campusId];
      }
      if (
        classification === "DEPARTMENTAL" &&
        dbUser?.departmentId &&
        dbUser?.campusId
      ) {
        implicitCampusIds = [dbUser.campusId];
        implicitDepartmentIds = [dbUser.departmentId];
      }

      await sendMutation.mutateAsync({
        documentId: id,
        isInstitutional: institutionSelected,
        campusIds: implicitCampusIds,
        departmentIds: implicitDepartmentIds,
        userIds: Array.from(selectedUsers),
      });
      setAlertConfig({
        show: true,
        title: "Document Sent",
        message: "Your document has been successfully broadcasted.",
      });
    } catch (e: any) {
      setAlertConfig({
        show: true,
        title: "Error",
        message: e.message || "Failed to send document.",
      });
    }
  };

  const handleSendClick = () => {
    setShowConfirmModal(true);
  };

  const handleAlertClose = () => {
    setAlertConfig((prev) => ({ ...prev, show: false }));
    if (alertConfig.title === "Document Sent") {
      navigate(`/documents/${id}`);
    }
  };

  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
    checked: boolean,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const selectAll = (
    items: { id: string }[],
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) => setter(new Set(items.map((i) => i.id)));

  const deselectAll = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
  ) => setter(new Set());

  if (isLoadingDoc || isLoadingOrg) {
    return <div className="container mt-4" />;
  }

  if (!document) {
    return <div className="container mt-4">Document not found.</div>;
  }

  const totalRecipients =
    (institutionSelected ? 1 : 0) +
    selectedCampuses.size +
    selectedDepts.size +
    selectedUsers.size;

  return (
    <>
      <div className="send-page container mt-4 mb-5">
        {/* ── Page header ── */}
        <div className="send-page__header">
          <button
            className="send-page__back-btn"
            onClick={() => navigate(`/documents/${id}`)}
          >
            <i className="bi bi-arrow-left" />
            Back
          </button>
          <div className="send-page__title-group">
            <h2 className="send-page__title">Send Document</h2>
            <div className="send-page__subtitle">
              <i className="bi bi-file-earmark-text" />
              <span>{document.title}</span>
              <ClassificationBadge
                classification={document.classification as ClassificationType}
              />
            </div>
          </div>
        </div>

        {/* ── Audience summary bar ── */}
        <AudienceSummary
          institutionSelected={institutionSelected}
          campusCount={selectedCampuses.size}
          deptCount={selectedDepts.size}
          userCount={selectedUsers.size}
        />

        {/* ── Wizard card ── */}
        <div className="send-wizard">
          {/* Step rail */}
          <div className="send-wizard__rail">
            {steps.map((step, idx) => {
              const state = getStepState(idx);
              const isClickable = state === "done" || state === "skipped";

              return (
                <React.Fragment key={step.id}>
                  <button
                    className={`send-rail-step send-rail-step--${state}`}
                    onClick={() => isClickable && handleStepClick(idx)}
                    disabled={state === "pending"}
                    title={
                      state === "skipped"
                        ? `${step.label} (skipped)`
                        : step.label
                    }
                  >
                    <span className="send-rail-step__circle">
                      {state === "done" ? (
                        <i className="bi bi-check-lg" />
                      ) : state === "skipped" ? (
                        <i className="bi bi-dash-lg" />
                      ) : (
                        <i className={`bi ${step.icon}`} />
                      )}
                    </span>
                    <span className="send-rail-step__label">
                      {step.label}
                      {state === "skipped" && (
                        <span
                          style={{
                            fontSize: "10px",
                            display: "block",
                            fontWeight: 400,
                            color: "var(--text-muted)",
                          }}
                        >
                          skipped
                        </span>
                      )}
                    </span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`send-rail-connector ${
                        state === "done" ? "send-rail-connector--done" : ""
                      } ${
                        state === "skipped"
                          ? "send-rail-connector--skipped"
                          : ""
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Step body */}
          <div className="send-wizard__body">
            {/* SCOPE step */}
            {currentStep.id === "scope" && (
              <StepWrapper
                heading="Institution-wide send"
                description={
                  institutionSelected
                    ? `Sending to the entire institution. You can add specific individual recipients in the next step.`
                    : "Select this to grant read access to every user in the institution, or skip this to narrow down by campuses, departments, or individuals."
                }
              >
                <CheckCard
                  id="institution-wide"
                  label={"Organization"}
                  sublabel={`${allCampuses.length} campus${allCampuses.length !== 1 ? "es" : ""} · All departments`}
                  checked={institutionSelected}
                  onChange={handleInstitutionToggle}
                />

                {institutionSelected && (
                  <div
                    className="standard-modal-notice standard-modal-notice-info"
                    style={{ marginTop: "12px" }}
                  >
                    <i className="bi bi-info-circle"></i>
                    <p>
                      Organization-wide selected. The wizard will skip to the
                      individual users step so you can optionally add one-off
                      recipients, then confirm.
                    </p>
                  </div>
                )}
              </StepWrapper>
            )}

            {/* CAMPUSES step */}
            {currentStep.id === "campuses" && (
              <StepWrapper
                heading="Select campuses"
                description="Choose which campuses should receive this document. Selecting a campus grants read access to all users within it. The department and user steps will be filtered to your selection."
              >
                <SearchableList
                  items={campusItems}
                  selected={selectedCampuses}
                  onToggle={(id, c) => {
                    toggleSet(setSelectedCampuses, id, c);
                    if (!c) {
                      const campus = allCampuses.find(
                        (campus: any) => campus.id === id,
                      );
                      if (campus) {
                        const deptIds = new Set(
                          campus.departments.map((d: any) => d.id),
                        );
                        setSelectedDepts((prev) => {
                          const next = new Set(prev);
                          deptIds.forEach((dId) => next.delete(dId as string));
                          return next;
                        });
                      }
                    }
                  }}
                  placeholder="Search campuses…"
                  emptyMessage="No campuses found."
                  onSelectAll={() =>
                    selectAll(campusItems, setSelectedCampuses)
                  }
                  onDeselectAll={() => {
                    deselectAll(setSelectedCampuses);
                    deselectAll(setSelectedDepts);
                  }}
                />
              </StepWrapper>
            )}

            {/* DEPARTMENTS step */}
            {currentStep.id === "departments" && (
              <StepWrapper
                heading="Select departments"
                description={
                  selectedCampuses.size > 0
                    ? `Showing departments from the ${selectedCampuses.size} selected campus${selectedCampuses.size !== 1 ? "es" : ""}. Narrow the audience further by selecting specific departments. The users step will reflect your selection.`
                    : "Select specific departments to narrow the audience. The users step will be filtered to users in the selected departments."
                }
              >
                {deptItems.length === 0 ? (
                  <div className="send-empty-state">
                    <i className="bi bi-buildings" />
                    <p>
                      {selectedCampuses.size === 0 &&
                      classification === "INSTITUTIONAL"
                        ? "Select at least one campus first to see its departments."
                        : "No departments found."}
                    </p>
                    {selectedCampuses.size === 0 &&
                      steps.some((s) => s.id === "campuses") && (
                        <button
                          className="btn btn-sm btn-outline-secondary mt-2"
                          onClick={() => {
                            const campusIdx = steps.findIndex(
                              (s) => s.id === "campuses",
                            );
                            if (campusIdx >= 0) handleStepClick(campusIdx);
                          }}
                        >
                          <i className="bi bi-arrow-left me-1" />
                          Go back to Campuses
                        </button>
                      )}
                  </div>
                ) : (
                  <SearchableList
                    items={deptItems}
                    selected={selectedDepts}
                    onToggle={(id, c) => toggleSet(setSelectedDepts, id, c)}
                    placeholder="Search departments…"
                    emptyMessage="No departments match your search."
                    onSelectAll={() => selectAll(deptItems, setSelectedDepts)}
                    onDeselectAll={() => deselectAll(setSelectedDepts)}
                  />
                )}
              </StepWrapper>
            )}

            {/* USERS step */}
            {currentStep.id === "users" && (
              <StepWrapper
                heading={
                  isInstitutionWide
                    ? "Add specific users (optional)"
                    : "Add specific users"
                }
                description={
                  isInstitutionWide
                    ? "Optionally add individual users who should receive this document in addition to the organization-wide access already granted."
                    : selectedDepts.size > 0
                      ? `Showing users from the ${selectedDepts.size} selected department${selectedDepts.size !== 1 ? "s" : ""}. Select specific individuals or add one-off recipients.`
                      : selectedCampuses.size > 0
                        ? `Showing users from the ${selectedCampuses.size} selected campus${selectedCampuses.size !== 1 ? "es" : ""}. Optionally select specific individual recipients.`
                        : "Optionally add individual users who should receive this document regardless of their campus or department."
                }
              >
                <SearchableList
                  items={userItems}
                  selected={selectedUsers}
                  onToggle={(id, c) => toggleSet(setSelectedUsers, id, c)}
                  placeholder="Search by name…"
                  emptyMessage="No users found."
                  onSelectAll={() => selectAll(userItems, setSelectedUsers)}
                  onDeselectAll={() => deselectAll(setSelectedUsers)}
                />
              </StepWrapper>
            )}

            {/* CONFIRM step */}
            {currentStep.id === "confirm" && (
              <StepWrapper
                heading="Review and send"
                description="Review the audience below. Once sent, all selected recipients will be granted read access and notified."
              >
                <ConfirmSummary
                  institutionSelected={institutionSelected}
                  selectedCampuses={selectedCampuses}
                  allCampuses={allCampuses}
                  selectedDepts={selectedDepts}
                  allDepts={relevantDepts}
                  selectedUsers={selectedUsers}
                  allUsers={allUsers}
                />
              </StepWrapper>
            )}

            {/* ── Footer navigation ── */}
            <div className="send-wizard__footer">
              <button
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={clampedStepIndex === 0}
              >
                <i className="bi bi-arrow-left me-1" />
                Back
              </button>

              <div className="send-wizard__footer-right">
                {/* Skip only on non-confirm, non-scope-when-organization-wide steps */}
                {currentStep.id !== "confirm" &&
                  !(currentStep.id === "scope" && institutionSelected) && (
                    <button className="send-skip-btn" onClick={handleSkip}>
                      Skip this step
                    </button>
                  )}

                {currentStep.id === "confirm" ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSendClick}
                    disabled={sendMutation.isPending || totalRecipients === 0}
                  >
                    {sendMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2" />
                        Send Document
                      </>
                    )}
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={handleNext}>
                    Continue
                    <i className="bi bi-arrow-right ms-1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation modal ── */}
      <SendConfirmationModal
        show={showConfirmModal}
        onConfirm={handleSend}
        onClose={() => setShowConfirmModal(false)}
        isPending={sendMutation.isPending}
        institutionSelected={institutionSelected}
        selectedCampuses={selectedCampuses}
        allCampuses={allCampuses}
        selectedDepts={selectedDepts}
        allDepts={relevantDepts}
        selectedUsers={selectedUsers}
        allUsers={allUsers}
        documentTitle={document.title}
      />

      <AlertModal
        show={alertConfig.show}
        title={alertConfig.title}
        onClose={handleAlertClose}
      >
        {alertConfig.message}
      </AlertModal>
    </>
  );
};

const StepWrapper: React.FC<{
  heading: string;
  description: string;
  children: React.ReactNode;
}> = ({ heading, description, children }) => (
  <div className="send-step">
    <div className="send-step__header">
      <h3 className="send-step__heading">{heading}</h3>
      <p className="send-step__desc">{description}</p>
    </div>
    <div className="send-step__content">{children}</div>
  </div>
);

const ConfirmSummary: React.FC<{
  institutionSelected: boolean;
  selectedCampuses: Set<string>;
  allCampuses: any[];
  selectedDepts: Set<string>;
  allDepts: any[];
  selectedUsers: Set<string>;
  allUsers: any[];
}> = ({
  institutionSelected,
  selectedCampuses,
  allCampuses,
  selectedDepts,
  allDepts,
  selectedUsers,
  allUsers,
}) => {
  const chosenCampuses = allCampuses.filter((c: any) =>
    selectedCampuses.has(c.id),
  );
  const chosenDepts = allDepts.filter((d: any) => selectedDepts.has(d.id));
  const chosenUsers = allUsers.filter((u: any) => selectedUsers.has(u.id));

  const hasNothing =
    !institutionSelected &&
    chosenCampuses.length === 0 &&
    chosenDepts.length === 0 &&
    chosenUsers.length === 0;

  if (hasNothing) {
    return (
      <div className="send-confirm-empty">
        <i className="bi bi-exclamation-triangle" />
        <p>No recipients selected. Go back and select at least one audience.</p>
      </div>
    );
  }

  return (
    <div className="send-confirm">
      {institutionSelected && (
        <ConfirmGroup
          icon="bi-globe2"
          label="Organization"
          color="var(--success)"
        >
          <span className="send-confirm-item">Organization-wide</span>
        </ConfirmGroup>
      )}

      {chosenCampuses.length > 0 && (
        <ConfirmGroup
          icon="bi-buildings"
          label={`${chosenCampuses.length} Campus${chosenCampuses.length !== 1 ? "es" : ""}`}
          color="var(--info)"
        >
          {chosenCampuses.map((c: any) => (
            <span key={c.id} className="send-confirm-item">
              {c.name}
            </span>
          ))}
        </ConfirmGroup>
      )}

      {chosenDepts.length > 0 && (
        <ConfirmGroup
          icon="bi-diagram-3"
          label={`${chosenDepts.length} Department${chosenDepts.length !== 1 ? "s" : ""}`}
          color="var(--warning)"
        >
          {chosenDepts.map((d: any) => (
            <span key={d.id} className="send-confirm-item">
              {d.name}
              {(d as any).campusName && (
                <span className="send-confirm-item__meta">
                  {(d as any).campusName}
                </span>
              )}
            </span>
          ))}
        </ConfirmGroup>
      )}

      {chosenUsers.length > 0 && (
        <ConfirmGroup
          icon="bi-people"
          label={`${chosenUsers.length} User${chosenUsers.length !== 1 ? "s" : ""}`}
          color="var(--brand)"
        >
          {chosenUsers.map((u: any) => (
            <span key={u.id} className="send-confirm-item">
              {formatUserName(u)}
              {u.deptName && (
                <span className="send-confirm-item__meta">{u.deptName}</span>
              )}
            </span>
          ))}
        </ConfirmGroup>
      )}
    </div>
  );
};

const ConfirmGroup: React.FC<{
  icon: string;
  label: string;
  color: string;
  children: React.ReactNode;
}> = ({ icon, label, color, children }) => (
  <div className="send-confirm-group">
    <div className="send-confirm-group__header" style={{ color }}>
      <i className={`bi ${icon}`} />
      <strong>{label}</strong>
    </div>
    <div className="send-confirm-group__items">{children}</div>
  </div>
);

export default SendDocumentPage;
