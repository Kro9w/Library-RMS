import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import { AlertModal } from "../components/AlertModal";
import { formatUserName } from "../utils/user";
import type { ClassificationType } from "../components/ClassificationBadge";
import { ClassificationBadge } from "../components/ClassificationBadge";
import { useUser } from "../contexts/SessionContext";
import "./SendDocumentPage.css";

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
      return ALL_STEPS.filter((s) => s.id !== "scope" && s.id !== "campuses");
    case "DEPARTMENTAL":
      return ALL_STEPS.filter(
        (s) =>
          s.id !== "scope" && s.id !== "campuses" && s.id !== "departments",
      );
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

  // Group items
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SendDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const authUser = useUser();

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
  const { data: dbUser } = trpc.user.getMe.useQuery(undefined, {
    enabled: !!authUser,
  });

  const sendMutation = trpc.documents.sendDocument.useMutation();

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
    if (classification === "DEPARTMENTAL") {
      // Show ONLY user's own department
      if (!dbUser?.departmentId) return [];
      const userDept = allCampuses
        .flatMap((c) => c.departments)
        .find((d) => d.id === dbUser.departmentId);
      return userDept ? [userDept] : [];
    }
    if (classification === "INTERNAL") {
      // Show ONLY user's own campus
      if (!dbUser?.campusId) return [];
      const userCampus = allCampuses.find((c) => c.id === dbUser.campusId);
      return userCampus
        ? userCampus.departments.map((d) => ({
            ...d,
            campusName: userCampus.name,
          }))
        : [];
    }
    if (classification === "CONFIDENTIAL") {
      // For confidential show everything within campus to be able to pick users
      if (!dbUser?.campusId) return [];
      const userCampus = allCampuses.find((c) => c.id === dbUser.campusId);
      return userCampus
        ? userCampus.departments.map((d) => ({
            ...d,
            campusName: userCampus.name,
          }))
        : [];
    }
    // INSTITUTIONAL: Filter by selected campuses
    if (selectedCampuses.size === 0) return [];
    return allCampuses
      .filter((c) => selectedCampuses.has(c.id))
      .flatMap((c) => c.departments.map((d) => ({ ...d, campusName: c.name })));
  }, [allCampuses, selectedCampuses, classification, dbUser]);

  const allUsers = useMemo(() => {
    let users = allCampuses.flatMap((c) =>
      c.departments.flatMap((d) =>
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
        users = users.filter((u) => u.deptId === dbUser.departmentId);
      }
    } else if (
      classification === "INTERNAL" ||
      classification === "CONFIDENTIAL"
    ) {
      if (dbUser?.campusId) {
        users = users.filter((u) => u.campusId === dbUser.campusId);
      }
    }

    return users;
  }, [allCampuses, classification, dbUser]);

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
    group: (d as any).campusName, // Group departments by campus
  }));

  // ── User items for list ───────────────────────────────────────────────────
  const userItems = allUsers.map((u: any) => ({
    id: u.id,
    label: formatUserName(u),
    sublabel: `${u.deptName} · ${u.campusName}`,
    group: `${u.campusName} — ${u.deptName}`, // Group users by Campus + Department
  }));

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  const handleSend = async () => {
    if (!id) return;
    try {
      // Ensure implicit selection when skipping steps due to classification
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
        institutionIds:
          institutionSelected && orgHierarchy ? [orgHierarchy.id] : [],
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

  const handleAlertClose = () => {
    setAlertConfig((prev) => ({ ...prev, show: false }));
    if (alertConfig.title === "Document Sent") {
      navigate(`/documents/${id}`);
    }
  };

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleSet = (
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
                heading="Institution-wide send"
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
                  onToggle={(id, c) => toggleSet(setSelectedCampuses, id, c)}
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
                heading="Add specific users"
                description="Optionally add individual users who should receive this document regardless of their campus or department. This is useful for one-off recipients."
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

export default SendDocumentPage;
