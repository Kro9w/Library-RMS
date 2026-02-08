import React, { useState, useEffect } from "react";
import { trpc } from "../trpc";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import "./Auth.css";

const JoinOrganization: React.FC = () => {
  const [step, setStep] = useState(1);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedCampusId, setSelectedCampusId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");

  // State for creating a new department
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");

  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: me } = trpc.user.getMe.useQuery();
  const { data: organizations } = trpc.user.getAllOrgs.useQuery();

  const { data: campuses } = trpc.user.getCampuses.useQuery(
    { orgId: selectedOrgId },
    { enabled: !!selectedOrgId },
  );

  const { data: departments } = trpc.user.getDepartments.useQuery(
    { campusId: selectedCampusId },
    { enabled: !!selectedCampusId },
  );

  // Auto-select Org
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      const csu = organizations.find((o) => o.acronym === "CSU");
      setSelectedOrgId(csu ? csu.id : organizations[0].id);
    }
  }, [organizations, selectedOrgId]);

  const joinOrg = trpc.user.joinOrganization.useMutation({
    onSuccess: () => {
      setStep(3); // Go to success step
    },
    onError: (error: any) => {
      alert(`Error joining: ${error.message}`);
    },
  });

  const createDeptAndJoin = trpc.user.createDepartmentAndJoin.useMutation({
    onSuccess: () => {
      setStep(3);
    },
    onError: (error: any) => {
      alert(`Error creating department: ${error.message}`);
    },
  });

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1 && selectedCampusId) {
      setStep(2);
    } else if (step === 2) {
      if (isCreatingDept) {
        if (!newDeptName.trim()) return;
        createDeptAndJoin.mutate({
          orgId: selectedOrgId,
          campusId: selectedCampusId,
          departmentName: newDeptName,
        });
      } else {
        if (!selectedDepartmentId) return;
        joinOrg.mutate({
          orgId: selectedOrgId,
          campusId: selectedCampusId,
          departmentId: selectedDepartmentId,
        });
      }
    }
  };

  const handleFinish = () => {
    utils.user.getMe.invalidate();
    navigate("/");
  };

  const selectedCampusName = campuses?.find(
    (c) => c.id === selectedCampusId,
  )?.name;

  return (
    <AuthLayout
      title={
        step === 3
          ? "Welcome!"
          : `Let's get you set up, ${me?.firstName ?? "User"}`
      }
    >
      <div className="join-org-container justify-content-center">
        <div className="form-section w-100" style={{ maxWidth: "500px" }}>
          {step === 1 && (
            <form className="auth-form" onSubmit={handleNextStep}>
              <h4 className="mb-3">Step 1: Select your Campus</h4>
              <div className="mb-3">
                <select
                  value={selectedCampusId}
                  onChange={(e) => setSelectedCampusId(e.target.value)}
                  required
                  disabled={!selectedOrgId || !campuses?.length}
                  className="form-control"
                >
                  <option value="" disabled>
                    Select a campus
                  </option>
                  {campuses?.map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="btn-primary w-100"
                disabled={!selectedCampusId}
              >
                Next
              </button>
            </form>
          )}

          {step === 2 && (
            <form className="auth-form" onSubmit={handleNextStep}>
              <h4 className="mb-2">Step 2: Select or Create Department</h4>
              <p className="text-muted mb-4 small">
                For Campus: <strong>{selectedCampusName}</strong>
              </p>

              <div className="mb-4">
                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="deptMode"
                    id="selectDept"
                    checked={!isCreatingDept}
                    onChange={() => setIsCreatingDept(false)}
                  />
                  <label className="form-check-label" htmlFor="selectDept">
                    Select existing department
                  </label>
                </div>

                {!isCreatingDept && (
                  <div className="ms-4 mb-3">
                    <select
                      value={selectedDepartmentId}
                      onChange={(e) => setSelectedDepartmentId(e.target.value)}
                      required={!isCreatingDept}
                      disabled={!departments?.length}
                      className="form-control"
                    >
                      <option value="" disabled>
                        Select a department
                      </option>
                      {departments?.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                    {!departments?.length && (
                      <div className="text-muted small mt-1">
                        No departments found. Please create one.
                      </div>
                    )}
                  </div>
                )}

                <div className="form-check mb-2">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="deptMode"
                    id="createDept"
                    checked={isCreatingDept}
                    onChange={() => setIsCreatingDept(true)}
                  />
                  <label className="form-check-label" htmlFor="createDept">
                    Create new department/office
                  </label>
                </div>

                {isCreatingDept && (
                  <div className="ms-4">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Department Name"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      required={isCreatingDept}
                    />
                  </div>
                )}
              </div>

              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn-secondary w-50"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn-primary w-50"
                  disabled={
                    joinOrg.isPending ||
                    createDeptAndJoin.isPending ||
                    (!isCreatingDept && !selectedDepartmentId) ||
                    (isCreatingDept && !newDeptName)
                  }
                >
                  {joinOrg.isPending || createDeptAndJoin.isPending
                    ? "Processing..."
                    : "Finish Setup"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-4">
              <h3 className="mb-3 text-success">You're all set!</h3>
              <p className="mb-4">
                Welcome to Folio, <strong>{me?.firstName}</strong>!
              </p>
              <button onClick={handleFinish} className="btn-primary w-100">
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};

export default JoinOrganization;
