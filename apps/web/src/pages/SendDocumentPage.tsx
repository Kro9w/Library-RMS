import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import { AlertModal } from "../components/AlertModal";
import { formatUserName } from "../utils/user";
import type { ClassificationType } from "../components/ClassificationBadge";
import { ClassificationBadge } from "../components/ClassificationBadge";

// ─── Types ───────────────────────────────────────────────────────────────────

type StepId = "scope" | "campuses" | "departments" | "users" | "confirm";

interface StepDef {
  id: StepId;
  label: string;
  icon: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Given a classification, returns the ordered list of wizard steps to show.
 *
 * INSTITUTIONAL → scope → campuses → departments → users → confirm
 * INTERNAL      →         campuses → departments → users → confirm
 * DEPARTMENTAL  →                    departments → users → confirm
 * CONFIDENTIAL  →                                  users → confirm
 */
function getStepsForClassification(classification: string): StepDef[] {
  const ALL_STEPS: StepDef[] = [
    { id: "scope", label: "Institution", icon: "bi-globe2" },
    { id: "campuses", label: "Campuses", icon: "bi-buildings" },
    { id: "departments", label: "Departments", icon: "bi-diagram-3" },
    { id: "users", label: "Users", icon: "bi-people" },
    { id: "confirm", label: "Confirm", icon: "bi-send-check" },
  ];

  switch (classification) {
    case "INSTITUTIONAL":
      return ALL_STEPS; // all five
    case "INTERNAL":
      return ALL_STEPS.filter((s) => s.id !== "scope");
    case "DEPARTMENTAL":
      return ALL_STEPS.filter((s) => s.id !== "scope" && s.id !== "campuses");
    case "CONFIDENTIAL":
    default:
      return ALL_STEPS.filter((s) => s.id === "users" || s.id === "confirm");
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

interface SearchableListProps {
  items: { id: string; label: string; sublabel?: string }[];
  selected: Set<string>;
  onToggle: (id: string, checked: boolean) => void;
  placeholder?: string;
  emptyMessage?: string;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

const SearchableList: React.FC<SearchableListProps> = ({
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
          filtered.map((item) => (
            <CheckCard
              key={item.id}
              id={`item-${item.id}`}
              label={item.label}
              sublabel={item.sublabel}
              checked={selected.has(item.id)}
              onChange={(c) => onToggle(item.id, c)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ─── Audience summary chip ────────────────────────────────────────────────────

interface AudienceSummaryProps {
  institutionSelected: boolean;
  institutionName?: string;
  campusCount: number;
  deptCount: number;
  userCount: number;
}

const AudienceSummary: React.FC<AudienceSummaryProps> = ({
  institutionSelected,
  institutionName,
  campusCount,
  deptCount,
  userCount,
}) => {
  const chips: { icon: string; text: string }[] = [];

  if (institutionSelected && institutionName) {
    chips.push({ icon: "bi-globe2", text: institutionName });
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
        <i className="bi bi-broadcast" />
        <span>No recipients selected yet</span>
      </div>
    );
  }

  return (
    <div className="send-summary">
      <span className="send-summary__label">Broadcasting to:</span>
      {chips.map((c) => (
        <span key={c.text} className="send-summary__chip">
          <i className={`bi ${c.icon}`} />
          {c.text}
        </span>
      ))}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SendDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });

  // ── Selection state ──────────────────────────────────────────────────────
  const [institutionSelected, setInstitutionSelected] = useState(false);
  const [selectedCampuses, setSelectedCampuses] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDepts, setSelectedDepts] = useState<Set<string>>(new Set());
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // ── Wizard step index ────────────────────────────────────────────────────
  const [stepIndex, setStepIndex] = useState(0);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: document, isLoading: isLoadingDoc } =
    trpc.documents.getById.useQuery({ id: id! }, { enabled: !!id });

  const { data: orgHierarchy, isLoading: isLoadingOrg } =
    trpc.user.getInstitutionHierarchy.useQuery();

  const broadcastMutation = trpc.documents.broadcastDocument.useMutation();

  // ── Derived ──────────────────────────────────────────────────────────────
  const classification = (document?.classification ?? "CONFIDENTIAL") as string;
  const steps = useMemo(
    () => getStepsForClassification(classification),
    [classification],
  );
  const currentStep = steps[stepIndex];

  const allCampuses = useMemo(
    () => orgHierarchy?.campuses ?? [],
    [orgHierarchy],
  );

  /** Departments filtered to campuses that are selected (or all if no campus step) */
  const relevantDepts = useMemo(() => {
    if (
      classification === "DEPARTMENTAL" ||
      classification === "CONFIDENTIAL"
    ) {
      // No campus filter — show departments from user's own campus
      return allCampuses.flatMap((c) => c.departments);
    }
    // Filter by selected campuses
    if (selectedCampuses.size === 0) return [];
    return allCampuses
      .filter((c) => selectedCampuses.has(c.id))
      .flatMap((c) => c.departments.map((d) => ({ ...d, campusName: c.name })));
  }, [allCampuses, selectedCampuses, classification]);

  const allUsers = useMemo(
    () =>
      allCampuses.flatMap((c) =>
        c.departments.flatMap((d) =>
          (d.users ?? []).map((u: any) => ({
            ...u,
            deptName: d.name,
            campusName: c.name,
          })),
        ),
      ),
    [allCampuses],
  );

  // ── Campus items for list ─────────────────────────────────────────────────
  const campusItems = allCampuses.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: `${c.departments.length} department${c.departments.length !== 1 ? "s" : ""}`,
  }));

  // ── Dept items for list ───────────────────────────────────────────────────
  const deptItems = relevantDepts.map((d: any) => ({
    id: d.id,
    label: d.name,
    sublabel: (d as any).campusName,
  }));

  // ── User items for list ───────────────────────────────────────────────────
  const userItems = allUsers.map((u: any) => ({
    id: u.id,
    label: formatUserName(u),
    sublabel: `${u.deptName} · ${u.campusName}`,
  }));

  // ── Navigation ────────────────────────────────────────────────────────────
  const canProceed = (): boolean => {
    if (!currentStep) return false;
    switch (currentStep.id) {
      case "scope":
        return true; // optional — can proceed without selecting institution-wide
      case "campuses":
        return true; // optional — departments/users can still be selected
      case "departments":
        return true;
      case "users":
        return true;
      case "confirm":
        return (
          institutionSelected ||
          selectedCampuses.size > 0 ||
          selectedDepts.size > 0 ||
          selectedUsers.size > 0
        );
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleSend = async () => {
    if (!id) return;
    try {
      await broadcastMutation.mutateAsync({
        documentId: id,
        institutionIds:
          institutionSelected && orgHierarchy ? [orgHierarchy.id] : [],
        campusIds: Array.from(selectedCampuses),
        departmentIds: Array.from(selectedDepts),
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

  const handleAlertClose = () => {
    setAlertConfig((prev) => ({ ...prev, show: false }));
    if (alertConfig.title === "Document Sent") {
      navigate(`/documents/${id}`);
    }
  };

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleSet = (
    set: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
    checked: boolean,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
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

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

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
            <h2 className="send-page__title">Broadcast Document</h2>
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
          institutionName={orgHierarchy?.name}
          campusCount={selectedCampuses.size}
          deptCount={selectedDepts.size}
          userCount={selectedUsers.size}
        />

        {/* ── Wizard card ── */}
        <div className="send-wizard">
          {/* Step rail */}
          <div className="send-wizard__rail">
            {steps.map((step, idx) => {
              const state =
                idx < stepIndex
                  ? "done"
                  : idx === stepIndex
                    ? "active"
                    : "pending";
              return (
                <React.Fragment key={step.id}>
                  <button
                    className={`send-rail-step send-rail-step--${state}`}
                    onClick={() => idx < stepIndex && setStepIndex(idx)}
                    disabled={idx > stepIndex}
                    title={step.label}
                  >
                    <span className="send-rail-step__circle">
                      {state === "done" ? (
                        <i className="bi bi-check-lg" />
                      ) : (
                        <i className={`bi ${step.icon}`} />
                      )}
                    </span>
                    <span className="send-rail-step__label">{step.label}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`send-rail-connector ${
                        idx < stepIndex ? "send-rail-connector--done" : ""
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
                heading="Institution-wide broadcast"
                description="Select this to grant read access to every user in the institution. You can combine this with campus, department, or individual selections below."
              >
                <CheckCard
                  id="institution-wide"
                  label={orgHierarchy?.name ?? "Institution"}
                  sublabel={`${allCampuses.length} campus${allCampuses.length !== 1 ? "es" : ""}`}
                  checked={institutionSelected}
                  onChange={setInstitutionSelected}
                />
              </StepWrapper>
            )}

            {/* CAMPUSES step */}
            {currentStep.id === "campuses" && (
              <StepWrapper
                heading="Select campuses"
                description="Choose which campuses should receive this document. Selecting a campus grants read access to all users within it."
              >
                <SearchableList
                  items={campusItems}
                  selected={selectedCampuses}
                  onToggle={(id, c) =>
                    toggleSet(selectedCampuses, setSelectedCampuses, id, c)
                  }
                  placeholder="Search campuses…"
                  emptyMessage="No campuses found."
                  onSelectAll={() =>
                    selectAll(campusItems, setSelectedCampuses)
                  }
                  onDeselectAll={() => deselectAll(setSelectedCampuses)}
                />
              </StepWrapper>
            )}

            {/* DEPARTMENTS step */}
            {currentStep.id === "departments" && (
              <StepWrapper
                heading="Select departments"
                description={
                  selectedCampuses.size > 0
                    ? `Showing departments from the ${selectedCampuses.size} selected campus${selectedCampuses.size !== 1 ? "es" : ""}. Select individual departments to narrow the audience.`
                    : "Select which departments should receive this document."
                }
              >
                {deptItems.length === 0 ? (
                  <div className="send-empty-state">
                    <i className="bi bi-buildings" />
                    <p>
                      {selectedCampuses.size === 0
                        ? "Select at least one campus first to see its departments."
                        : "No departments found for the selected campuses."}
                    </p>
                    {selectedCampuses.size === 0 &&
                      steps.some((s) => s.id === "campuses") && (
                        <button
                          className="btn btn-sm btn-outline-secondary mt-2"
                          onClick={() => {
                            const campusIdx = steps.findIndex(
                              (s) => s.id === "campuses",
                            );
                            if (campusIdx >= 0) setStepIndex(campusIdx);
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
                    onToggle={(id, c) =>
                      toggleSet(selectedDepts, setSelectedDepts, id, c)
                    }
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
                heading="Add specific users"
                description="Optionally add individual users who should receive this document regardless of their campus or department. This is useful for one-off recipients."
              >
                <SearchableList
                  items={userItems}
                  selected={selectedUsers}
                  onToggle={(id, c) =>
                    toggleSet(selectedUsers, setSelectedUsers, id, c)
                  }
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
                  institutionName={orgHierarchy?.name}
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
                disabled={stepIndex === 0}
              >
                <i className="bi bi-arrow-left me-1" />
                Back
              </button>

              <div className="send-wizard__footer-right">
                {/* Skip is always available on non-confirm steps */}
                {currentStep.id !== "confirm" && (
                  <button className="send-skip-btn" onClick={handleNext}>
                    Skip this step
                  </button>
                )}

                {currentStep.id === "confirm" ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSend}
                    disabled={
                      broadcastMutation.isPending || totalRecipients === 0
                    }
                  >
                    {broadcastMutation.isPending ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <i className="bi bi-broadcast me-2" />
                        Broadcast Document
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

// ─── Step wrapper ─────────────────────────────────────────────────────────────

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

// ─── Confirm summary ──────────────────────────────────────────────────────────

const ConfirmSummary: React.FC<{
  institutionSelected: boolean;
  institutionName?: string;
  selectedCampuses: Set<string>;
  allCampuses: any[];
  selectedDepts: Set<string>;
  allDepts: any[];
  selectedUsers: Set<string>;
  allUsers: any[];
}> = ({
  institutionSelected,
  institutionName,
  selectedCampuses,
  allCampuses,
  selectedDepts,
  allDepts,
  selectedUsers,
  allUsers,
}) => {
  const chosenCampuses = allCampuses.filter((c) => selectedCampuses.has(c.id));
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
      {institutionSelected && institutionName && (
        <ConfirmGroup
          icon="bi-globe2"
          label="Institution"
          color="var(--success)"
        >
          <span className="send-confirm-item">{institutionName}</span>
        </ConfirmGroup>
      )}

      {chosenCampuses.length > 0 && (
        <ConfirmGroup
          icon="bi-buildings"
          label={`${chosenCampuses.length} Campus${chosenCampuses.length !== 1 ? "es" : ""}`}
          color="var(--info)"
        >
          {chosenCampuses.map((c) => (
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

// ─── Inline CSS ───────────────────────────────────────────────────────────────

const CSS = `
/* ── Page shell ─────────────────────────────────────────────────────────── */
.send-page__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.send-page__back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  margin-top: 4px;
  transition: all 100ms ease;
  box-shadow: var(--shadow-xs);
}
.send-page__back-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.send-page__title-group {
  min-width: 0;
}

.send-page__title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
  margin: 0 0 6px;
}

.send-page__subtitle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-muted);
  flex-wrap: wrap;
}

/* ── Audience summary bar ───────────────────────────────────────────────── */
.send-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  box-shadow: var(--shadow-xs);
  font-size: 13px;
}

.send-summary--empty {
  color: var(--text-muted);
}

.send-summary--empty i {
  margin-right: 4px;
}

.send-summary__label {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-right: 4px;
}

.send-summary__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--brand-subtle);
  color: var(--brand);
  border: 1px solid var(--border-brand);
  border-radius: var(--radius-full);
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
}

/* ── Wizard container ───────────────────────────────────────────────────── */
.send-wizard {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 0;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  min-height: 520px;
}

@media (max-width: 768px) {
  .send-wizard {
    grid-template-columns: 1fr;
  }
  .send-wizard__rail {
    flex-direction: row !important;
    border-right: none !important;
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    padding: 12px !important;
  }
  .send-rail-connector {
    width: 24px !important;
    height: 2px !important;
    align-self: center;
    margin: 0 !important;
  }
  .send-rail-step {
    flex-direction: column !important;
    min-width: 80px;
  }
  .send-rail-step__label {
    font-size: 10px !important;
  }
}

/* ── Step rail (left sidebar) ───────────────────────────────────────────── */
.send-wizard__rail {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 24px 16px;
  background: var(--bg-subtle);
  border-right: 1px solid var(--border);
}

.send-rail-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 100ms ease;
}

.send-rail-step--active {
  background: var(--brand-subtle);
  cursor: default;
}

.send-rail-step--done {
  cursor: pointer;
}

.send-rail-step--pending {
  cursor: not-allowed;
  opacity: 0.5;
}

.send-rail-step__circle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  transition: all 150ms ease;
  background: var(--bg-muted);
  color: var(--text-muted);
  border: 1.5px solid var(--border);
}

.send-rail-step--active .send-rail-step__circle {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-subtle);
}

.send-rail-step--done .send-rail-step__circle {
  background: var(--success-subtle);
  color: var(--success);
  border-color: #86efac;
}

.send-rail-step__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
}

.send-rail-step--active .send-rail-step__label {
  color: var(--brand);
  font-weight: 600;
}

.send-rail-step--done .send-rail-step__label {
  color: var(--text-secondary);
}

.send-rail-connector {
  width: 2px;
  height: 16px;
  background: var(--border);
  margin: 2px 0 2px 24px;
  border-radius: 1px;
  transition: background 200ms ease;
}

.send-rail-connector--done {
  background: var(--success);
  opacity: 0.5;
}

/* ── Wizard body ────────────────────────────────────────────────────────── */
.send-wizard__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ── Step content ───────────────────────────────────────────────────────── */
.send-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 28px 28px 0;
  overflow: hidden;
}

.send-step__header {
  margin-bottom: 18px;
}

.send-step__heading {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 6px;
  letter-spacing: -0.2px;
}

.send-step__desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.6;
}

.send-step__content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Wizard footer ──────────────────────────────────────────────────────── */
.send-wizard__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  border-top: 1px solid var(--border);
  background: var(--bg-subtle);
  flex-shrink: 0;
}

.send-wizard__footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.send-skip-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  transition: color 100ms ease;
}
.send-skip-btn:hover {
  color: var(--text-secondary);
}

/* ── Searchable list ────────────────────────────────────────────────────── */
.send-searchable {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  flex: 1;
}

.send-searchable__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.send-searchable__search-wrap {
  position: relative;
  flex: 1;
}

.send-searchable__search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.send-searchable__search {
  width: 100%;
  height: 34px;
  padding: 0 32px 0 30px;
  font-size: 13px;
  font-family: var(--font-sans);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  transition: border-color 150ms, box-shadow 150ms;
  box-shadow: var(--shadow-xs);
}
.send-searchable__search::placeholder { color: var(--text-muted); }
.send-searchable__search:focus {
  outline: none;
  border-color: var(--brand-muted);
  box-shadow: var(--ring);
}

.send-searchable__search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 15px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.send-searchable__search-clear:hover { color: var(--text-primary); }

.send-searchable__toggle-all {
  background: none;
  border: none;
  font-size: 12px;
  font-weight: 500;
  color: var(--brand);
  cursor: pointer;
  white-space: nowrap;
  padding: 0;
  flex-shrink: 0;
  transition: color 100ms;
}
.send-searchable__toggle-all:hover { color: var(--brand-hover); }

.send-searchable__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}

.send-searchable__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}
.send-searchable__empty i { font-size: 24px; opacity: 0.25; }

/* ── Check card ─────────────────────────────────────────────────────────── */
.send-check-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: border-color 100ms, background 100ms;
  background: var(--bg-surface);
  user-select: none;
}
.send-check-card:hover {
  border-color: var(--border-strong);
  background: var(--bg-hover);
}
.send-check-card--checked {
  border-color: var(--brand-muted);
  background: var(--brand-subtle);
}

.send-check-card__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}

.send-check-card__tick {
  width: 18px;
  height: 18px;
  border-radius: var(--radius-sm);
  border: 1.5px solid var(--border-strong);
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  flex-shrink: 0;
  color: #fff;
  transition: all 100ms ease;
}

.send-check-card--checked .send-check-card__tick {
  background: var(--brand);
  border-color: var(--brand);
}

.send-check-card__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.send-check-card__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.send-check-card__sublabel {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Empty state (departments no campus) ────────────────────────────────── */
.send-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 24px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}
.send-empty-state i { font-size: 28px; opacity: 0.2; }
.send-empty-state p { margin: 0; }

/* ── Confirm step ───────────────────────────────────────────────────────── */
.send-confirm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: var(--warning);
  text-align: center;
}
.send-confirm-empty i { font-size: 28px; }
.send-confirm-empty p { margin: 0; color: var(--text-muted); font-size: 13px; }

.send-confirm {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding-bottom: 8px;
}

.send-confirm-group {
  background: var(--bg-subtle);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.send-confirm-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-muted);
}

.send-confirm-group__items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 8px;
}

.send-confirm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-secondary);
  background: var(--bg-surface);
}

.send-confirm-item__meta {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-subtle);
  padding: 1px 7px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-muted);
}
`;

export default SendDocumentPage;
