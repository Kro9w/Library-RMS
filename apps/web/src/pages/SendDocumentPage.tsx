import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { trpc } from "../trpc";
import { AlertModal } from "../components/AlertModal";
import { formatUserName } from "../utils/user";
import type { ClassificationType } from "../components/ClassificationBadge";
import { ClassificationBadge } from "../components/ClassificationBadge";

export const SendDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [alertConfig, setAlertConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({ show: false, title: "", message: "" });

  const [selectedInstitutions, setSelectedInstitutions] = useState<Set<string>>(
    new Set(),
  );
  const [selectedCampuses, setSelectedCampuses] = useState<Set<string>>(
    new Set(),
  );
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(
    new Set(),
  );
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  const [searchDept, setSearchDept] = useState("");
  const [searchUser, setSearchUser] = useState("");

  const { data: document, isLoading: isLoadingDoc } =
    trpc.documents.getById.useQuery({ id: id! }, { enabled: !!id });

  const { data: orgHierarchy, isLoading: isLoadingOrg } =
    trpc.user.getInstitutionHierarchy.useQuery();

  const broadcastMutation = trpc.documents.broadcastDocument.useMutation();

  const handleSend = async () => {
    if (!id) return;
    try {
      await broadcastMutation.mutateAsync({
        documentId: id,
        institutionIds: Array.from(selectedInstitutions),
        campusIds: Array.from(selectedCampuses),
        departmentIds: Array.from(selectedDepartments),
        userIds: Array.from(selectedUsers),
      });
      setAlertConfig({
        show: true,
        title: "Success",
        message: "Document successfully sent.",
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
    if (alertConfig.title === "Success") {
      navigate(`/documents/${id}`);
    }
  };

  const classification = document?.classification as string;

  const showInstitutions = classification === "INSTITUTIONAL";
  const showCampuses =
    classification === "INSTITUTIONAL" || classification === "INTERNAL";
  const showDepartments = showCampuses || classification === "DEPARTMENTAL";

  const allCampuses = orgHierarchy?.campuses || [];

  const allDepartments = useMemo(() => {
    return allCampuses
      .flatMap((c) => c.departments)
      .filter((d) =>
        searchDept
          ? d.name.toLowerCase().includes(searchDept.toLowerCase())
          : true,
      );
  }, [allCampuses, searchDept]);

  const allUsers = useMemo(() => {
    return allCampuses
      .flatMap((c) => c.departments.flatMap((d) => d.users || []))
      .filter((u) =>
        searchUser
          ? `${u.firstName} ${u.lastName}`
              .toLowerCase()
              .includes(searchUser.toLowerCase())
          : true,
      );
  }, [allCampuses, searchUser]);

  if (isLoadingDoc || isLoadingOrg) {
    return <div className="container mt-4"></div>;
  }

  if (!document) {
    return <div className="container mt-4">Document not found.</div>;
  }

  return (
    <div className="container mt-4 mb-5">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1">Send Document</h2>
          <div className="d-flex align-items-center gap-2 text-muted">
            <i className="bi bi-file-earmark-text"></i> {document.title}
            <ClassificationBadge
              classification={document.classification as ClassificationType}
            />
          </div>
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(`/documents/${id}`)}
        >
          Back to Details
        </button>
      </div>

      <div className="row g-4">
        {showInstitutions && orgHierarchy && (
          <div className="col-12">
            <div className="card">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fs-6">
                  <i className="bi bi-globe me-2"></i>Institutions
                </h5>
                <button
                  className="btn btn-sm btn-link text-decoration-none"
                  onClick={() =>
                    setSelectedInstitutions((prev) =>
                      prev.size === 1 ? new Set() : new Set([orgHierarchy.id]),
                    )
                  }
                >
                  {selectedInstitutions.size === 1
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div className="card-body">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="inst-check"
                    checked={selectedInstitutions.has(orgHierarchy.id)}
                    onChange={(e) => {
                      const next = new Set(selectedInstitutions);
                      e.target.checked
                        ? next.add(orgHierarchy.id)
                        : next.delete(orgHierarchy.id);
                      setSelectedInstitutions(next);
                    }}
                  />
                  <label className="form-check-label" htmlFor="inst-check">
                    {orgHierarchy.name}
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCampuses && (
          <div className="col-12 col-lg-6">
            <div className="card h-100">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fs-6">
                  <i className="bi bi-building me-2"></i>Campuses
                </h5>
                <button
                  className="btn btn-sm btn-link text-decoration-none"
                  onClick={() =>
                    setSelectedCampuses((prev) =>
                      prev.size === allCampuses.length
                        ? new Set()
                        : new Set(allCampuses.map((c) => c.id)),
                    )
                  }
                >
                  {selectedCampuses.size === allCampuses.length &&
                  allCampuses.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div
                className="card-body"
                style={{ maxHeight: "300px", overflowY: "auto" }}
              >
                {allCampuses.map((campus) => (
                  <div className="form-check mb-2" key={campus.id}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`campus-${campus.id}`}
                      checked={selectedCampuses.has(campus.id)}
                      onChange={(e) => {
                        const next = new Set(selectedCampuses);
                        e.target.checked
                          ? next.add(campus.id)
                          : next.delete(campus.id);
                        setSelectedCampuses(next);
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`campus-${campus.id}`}
                    >
                      {campus.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showDepartments && (
          <div className={`col-12 ${showCampuses ? "col-lg-6" : ""}`}>
            <div className="card h-100">
              <div className="card-header bg-light d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fs-6">
                  <i className="bi bi-people me-2"></i>Departments
                </h5>
                <button
                  className="btn btn-sm btn-link text-decoration-none"
                  onClick={() =>
                    setSelectedDepartments((prev) =>
                      prev.size === allDepartments.length
                        ? new Set()
                        : new Set(allDepartments.map((d) => d.id)),
                    )
                  }
                >
                  {selectedDepartments.size === allDepartments.length &&
                  allDepartments.length > 0
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div
                className="card-body d-flex flex-column"
                style={{ maxHeight: "300px" }}
              >
                <input
                  type="text"
                  className="form-control form-control-sm mb-3"
                  placeholder="Filter departments..."
                  value={searchDept}
                  onChange={(e) => setSearchDept(e.target.value)}
                />
                <div style={{ overflowY: "auto", flexGrow: 1 }}>
                  {allDepartments.map((dept) => (
                    <div className="form-check mb-2" key={dept.id}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`dept-${dept.id}`}
                        checked={selectedDepartments.has(dept.id)}
                        onChange={(e) => {
                          const next = new Set(selectedDepartments);
                          e.target.checked
                            ? next.add(dept.id)
                            : next.delete(dept.id);
                          setSelectedDepartments(next);
                        }}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`dept-${dept.id}`}
                      >
                        {dept.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="col-12">
          <div className="card">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="mb-0 fs-6">
                <i className="bi bi-person me-2"></i>Specific Users
              </h5>
            </div>
            <div
              className="card-body d-flex flex-column"
              style={{ maxHeight: "300px" }}
            >
              <input
                type="text"
                className="form-control form-control-sm mb-3"
                placeholder="Search users..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
              <div
                className="row g-2"
                style={{ overflowY: "auto", flexGrow: 1 }}
              >
                {allUsers.map((u) => (
                  <div className="col-12 col-md-6 col-lg-4" key={u.id}>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`user-${u.id}`}
                        checked={selectedUsers.has(u.id)}
                        onChange={(e) => {
                          const next = new Set(selectedUsers);
                          e.target.checked ? next.add(u.id) : next.delete(u.id);
                          setSelectedUsers(next);
                        }}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`user-${u.id}`}
                      >
                        {formatUserName(u)}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 d-flex justify-content-end gap-3">
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(`/documents/${id}`)}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary btn-animated-submit"
          disabled={
            broadcastMutation.isPending ||
            (selectedInstitutions.size === 0 &&
              selectedCampuses.size === 0 &&
              selectedDepartments.size === 0 &&
              selectedUsers.size === 0)
          }
          onClick={handleSend}
        >
          {broadcastMutation.isPending ? (
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
              <i className="bi bi-send-fill me-2"></i> Send Document
            </>
          )}
        </button>
      </div>

      <AlertModal
        show={alertConfig.show}
        title={alertConfig.title}
        onClose={handleAlertClose}
      >
        {alertConfig.message}
      </AlertModal>
    </div>
  );
};

export default SendDocumentPage;
