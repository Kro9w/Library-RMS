import React, { useState, useEffect } from "react";
import { trpc } from "../trpc";
import { useNavigate } from "react-router-dom";
import "./JoinInstitution.css";

const JoinInstitution: React.FC = () => {
  const [step, setStep] = useState(1);
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
    onError: (error: any) => alert(`Error joining: ${error.message}`),
  });

  const createDeptAndJoin = trpc.user.createDepartmentAndJoin.useMutation({
    onSuccess: () => setStep(3),
    onError: (error: any) => alert(`Error: ${error.message}`),
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
              viewBox="0 0 119.4 152.21"
              className="onboarding-brand-logo"
            >
              <path
                fillRule="evenodd"
                d="M119.25,44.29h-30.63c-.21-8.67,.8-19.25-3.3-24.72-3.64-5-14.23-6.25-22.15-3.77-13.27,4.93-21.94,17.44-29.95,27.78-3.32,4.28-7.25,9.8-13.43,11.07-7.05,1.45-9.54-5.24-11.05-10.11-3.94-14.68,1.31-31.7,5.63-42.44,.39,.08,.79,.16,1.18,.02v1.18c-.98,3.38-.29,7.88,.47,10.37,3.08,11.1,10.5,15.34,22.64,10.13C55.43,17.33,83.75-11.39,107.94,4.97c3.89,2.71,6.71,6.87,8.48,10.84,3.56,7.28,3.02,17.98,2.83,28.49Zm-13.19,66.68c-9.92-.16-20.05-.31-30.18-.68,.36-9.01,1.75-27.73-4.95-31.81-2.51-1.24-6.96-1.03-11.05-1.18-9.91,22.05-19.11,43.88-33.25,61.26-5.68,7.28-14.02,13.64-26.62,13.64,.08-25.99,.16-52,.24-77.99H36.05c6.36-14.14,12.72-28.28,18.87-42.62,9.01,.29,17.81,.37,26.39,.45-6.21,13.75-14.62,27.39-19.79,42.18,28.48-.25,44.98,8.54,44.53,36.76ZM1.88,118.77c16.54-.24,26.91-27.76,32.28-40.79v-.45c-10.85,.18-25.97,1.09-30.39,7.54-3.59,5.61-2,24.9-1.88,33.69Z"
              />
            </svg>
            <span className="onboarding-brand-name">Folio RMS</span>
          </div>
          <div className="onboarding-aside-copy">
            <h1>
              Welcome to
              <br />
              Folio RMS
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
                Welcome to Folio, <strong>{me?.firstName}</strong>. Your
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
    </div>
  );
};

export default JoinInstitution;
