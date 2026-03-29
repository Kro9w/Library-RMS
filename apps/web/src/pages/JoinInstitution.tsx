import React, { useState, useEffect } from "react";
import { trpc } from "../trpc";
import { useNavigate } from "react-router-dom";
import { AlertModal } from "../components/AlertModal";
import "./JoinInstitution.css";

const JoinInstitution: React.FC = () => {
  const [step, setStep] = useState(1);
  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);

  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: me } = trpc.user.getMe.useQuery();
  const { data: institutions } = trpc.user.getAllInstitutions.useQuery();
  const { data: campuses } = trpc.user.getCampuses.useQuery(
    { institutionId: selectedOrgId },
    { enabled: !!selectedOrgId },
  );
  const { data: departments } = trpc.user.getDepartments.useQuery(
    { campusId: selectedCampusId },
    { enabled: !!selectedCampusId },
  );

  useEffect(() => {
    if (institutions && institutions.length > 0 && !selectedOrgId) {
      const csu = institutions.find((o: any) => o.acronym === "CSU");
      setSelectedOrgId(csu ? csu.id : institutions[0].id);
    }
  }, [institutions, selectedOrgId]);

  const joinOrg = trpc.user.joinInstitution.useMutation({
    onSuccess: () => setStep(3),
    onError: (error: any) =>
      setAlertConfig({
        show: true,
        title: "Error Joining",
        message: error.message,
      }),
  });

  const createDeptAndJoin = trpc.user.createDepartmentAndJoin.useMutation({
    onSuccess: () => setStep(3),
    onError: (error: any) =>
      setAlertConfig({
        show: true,
        title: "Error Creating Department",
        message: error.message,
      }),
  });

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && selectedCampusId) {
      setStep(2);
    } else if (step === 2) {
      if (isCreatingDept) {
        if (!newDeptName.trim()) return;
        createDeptAndJoin.mutate({
          institutionId: selectedOrgId,
          campusId: selectedCampusId,
          departmentName: newDeptName,
        });
      } else {
        if (!selectedDepartmentId) return;
        joinOrg.mutate({
          institutionId: selectedOrgId,
          campusId: selectedCampusId,
          departmentId: selectedDepartmentId,
        });
      }
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    await utils.user.getMe.invalidate();
    navigate("/");
  };

  const selectedCampusName = campuses?.find(
    (c: any) => c.id === selectedCampusId,
  )?.name;

  const steps = [
    { num: 1, label: "Campus" },
    { num: 2, label: "Department" },
    { num: 3, label: "Done" },
  ];

  return (
    <div className="onboarding-root">
      {/* Left panel — branding */}
      <div className="onboarding-aside">
        <div className="onboarding-aside-inner">
          <div className="onboarding-brand">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 190 180"
              className="onboarding-brand-logo plume-logo-shape"
            >
              <polygon points="110,0 190,0 190,60 160,90 160,30 80,30" />
              <polygon points="70,40 150,40 150,100 120,130 120,70 40,70" />
              <polygon points="30,80 110,80 110,140 10,180 80,110 0,110" />
            </svg>
            <span className="onboarding-brand-name">Plume RMS</span>
          </div>
          <div className="onboarding-aside-copy">
            <h1>
              Welcome to
              <br />
              Plume RMS
            </h1>
            <p>
              Let's get your workspace set up. This will only take a moment —
              just select your campus and department to get started.
            </p>
          </div>
          <div className="onboarding-aside-quote">
            <blockquote>"Organized records, empowered decisions."</blockquote>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="onboarding-main">
        <div className="onboarding-card">
          {/* Step header */}
          <div className="onboarding-step-header">
            <div className="onboarding-steps">
              {steps.map((s, i) => (
                <React.Fragment key={s.num}>
                  <div
                    className={`onboarding-step ${step === s.num ? "active" : step > s.num ? "done" : ""}`}
                  >
                    <div className="onboarding-step-circle">
                      {step > s.num ? <i className="bi bi-check" /> : s.num}
                    </div>
                    <span className="onboarding-step-label">{s.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`onboarding-step-line ${step > s.num ? "done" : ""}`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step content */}
          {step === 1 && (
            <form onSubmit={handleNext} className="onboarding-form">
              <div className="onboarding-form-header">
                <h2>Select your campus</h2>
                <p>
                  Hi {me?.firstName || "there"} — which campus do you belong to?
                </p>
              </div>

              <div className="onboarding-field">
                <label className="form-label">Campus</label>
                <select
                  className="form-control form-select"
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  required
                  disabled={!selectedOrgId || !campuses?.length}
                >
                  <option value="" disabled>
                    Select a campus…
                  </option>
                  {campuses?.map((campus: any) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="onboarding-actions">
                <button
                  type="submit"
                  className="btn btn-primary onboarding-next-btn"
                  disabled={!selectedCampusId}
                >
                  Continue
                  <i className="bi bi-arrow-right" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleNext} className="onboarding-form">
              <div className="onboarding-form-header">
                <h2>Select your department</h2>
                <p>
                  For <strong>{selectedCampusName}</strong> campus. Choose an
                  existing department or create a new one.
                </p>
              </div>

              {/* Toggle */}
              <div className="onboarding-toggle-group">
                <button
                  type="button"
                  className={`onboarding-toggle ${!isCreatingDept ? "active" : ""}`}
                  onClick={() => setIsCreatingDept(false)}
                >
                  <i className="bi bi-building" />
                  Existing department
                </button>
                <button
                  type="button"
                  className={`onboarding-toggle ${isCreatingDept ? "active" : ""}`}
                  onClick={() => setIsCreatingDept(true)}
                >
                  <i className="bi bi-plus-circle" />
                  Create new
                </button>
              </div>

              {!isCreatingDept ? (
                <div className="onboarding-field">
                  <label className="form-label">Department / Office</label>
                  <select
                    className="form-control form-select"
                    value={selectedDepartmentId}
                    onChange={(e) => setSelectedDepartmentId(e.target.value)}
                    required
                    disabled={!departments?.length}
                  >
                    <option value="" disabled>
                      Select a department…
                    </option>
                    {departments?.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {!departments?.length && (
                    <p className="form-text">
                      No departments found. Create one instead.
                    </p>
                  )}
                </div>
              ) : (
                <div className="onboarding-field">
                  <label className="form-label">Department name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. College of Information and Computing Sciences"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    required={isCreatingDept}
                    autoFocus
                  />
                </div>
              )}

              <div className="onboarding-actions onboarding-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStep(1)}
                >
                  <i className="bi bi-arrow-left" />
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary onboarding-next-btn"
                  disabled={
                    joinOrg.isPending ||
                    createDeptAndJoin.isPending ||
                    (!isCreatingDept && !selectedDepartmentId) ||
                    (isCreatingDept && !newDeptName.trim())
                  }
                >
                  {joinOrg.isPending || createDeptAndJoin.isPending
                    ? "Setting up…"
                    : "Finish setup"}
                  {!(joinOrg.isPending || createDeptAndJoin.isPending) && (
                    <i className="bi bi-arrow-right" />
                  )}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="onboarding-success">
              <div className="onboarding-success-icon">
                <i className="bi bi-check-circle-fill" />
              </div>
              <h2>You're all set!</h2>
              <p>
                Welcome to Plume, <strong>{me?.firstName}</strong>. Your
                workspace is ready.
              </p>
              <button
                className="btn btn-primary onboarding-next-btn"
                onClick={handleFinish}
                disabled={isFinishing}
              >
                {isFinishing ? "Loading…" : "Go to Dashboard"}
                {!isFinishing && <i className="bi bi-arrow-right" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <AlertModal
        show={alertConfig.show}
        title={alertConfig.title}
        onClose={() => setAlertConfig({ ...alertConfig, show: false })}
      >
        {alertConfig.message}
      </AlertModal>
    </div>
  );
};

export default JoinInstitution;
