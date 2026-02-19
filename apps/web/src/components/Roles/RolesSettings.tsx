import React, { useState } from "react";
import { trpc } from "../../trpc";
import type { AppRouterOutputs } from "../../../../api/src/trpc/trpc.router";
import "./RolesModal.css";
import { formatUserName } from "../../utils/user";

type User = AppRouterOutputs["user"]["getUsersWithRoles"][0];
type Role = AppRouterOutputs["roles"]["getRoles"][0];

export const RolesSettings: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [level, setLevel] = useState<number>(4);
  const [permissions, setPermissions] = useState({
    canManageUsers: false,
    canManageRoles: false,
    canManageDocuments: false,
  });
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: roles, refetch: refetchRoles } = trpc.roles.getRoles.useQuery();
  const { data: users, refetch: refetchUsers } =
    trpc.user.getUsersWithRoles.useQuery();

  const createRoleMutation = trpc.roles.createRole.useMutation();
  const updateRoleMutation = trpc.roles.updateRole.useMutation();
  const deleteRoleMutation = trpc.roles.deleteRole.useMutation();
  const assignRoleMutation = trpc.roles.assignRoleToUser.useMutation();
  const removeRoleMutation = trpc.roles.unassignRoleFromUser.useMutation();

  const resetForm = () => {
    setSelectedRole(null);
    setRoleName("");
    setLevel(4);
    setPermissions({
      canManageUsers: false,
      canManageRoles: false,
      canManageDocuments: false,
    });
    setSelectedUser("");
    setErrorMessage(null);
  };

  const handleLevelChange = (newLevel: number) => {
    setLevel(newLevel);
    // Auto-set permissions based on level (Client-side mirror of backend default)
    switch (newLevel) {
      case 1: // Leader
        setPermissions({
          canManageUsers: true,
          canManageRoles: true,
          canManageDocuments: true,
        });
        break;
      case 2: // Co-Leader
        setPermissions({
          canManageUsers: false,
          canManageRoles: false,
          canManageDocuments: true,
        });
        break;
      default:
        setPermissions({
          canManageUsers: false,
          canManageRoles: false,
          canManageDocuments: false,
        });
        break;
    }
  };

  const handleCreateOrUpdateRole = async () => {
    if (!roleName) return;
    setErrorMessage(null);

    try {
      if (selectedRole) {
        await updateRoleMutation.mutateAsync({
          id: selectedRole.id,
          name: roleName,
          level,
          canManageUsers: permissions.canManageUsers,
          canManageRoles: permissions.canManageRoles,
          canManageDocuments: permissions.canManageDocuments,
        });
      } else {
        await createRoleMutation.mutateAsync({
          name: roleName,
          level,
          canManageUsers: permissions.canManageUsers,
          canManageRoles: permissions.canManageRoles,
          canManageDocuments: permissions.canManageDocuments,
        });
      }

      refetchRoles();
      resetForm();
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to save role.");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm("Are you sure you want to delete this role?")) {
      try {
        await deleteRoleMutation.mutateAsync(roleId);
        refetchRoles();
        if (selectedRole?.id === roleId) {
          resetForm();
        }
      } catch (error: any) {
        setErrorMessage(error.message || "Failed to delete role.");
      }
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setLevel(role.level || 4);
    setPermissions({
      canManageUsers: role.canManageUsers,
      canManageRoles: role.canManageRoles,
      canManageDocuments: role.canManageDocuments,
    });
    setErrorMessage(null);
  };

  const handleAssignRole = async (userId: string) => {
    if (!selectedRole) return;
    setErrorMessage(null);
    try {
      await assignRoleMutation.mutateAsync({
        userId,
        roleId: selectedRole.id,
      });
      refetchUsers();
      setSelectedUser("");
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to assign role.");
    }
  };

  const handleRemoveRole = async (userId: string) => {
    if (!selectedRole) return;
    try {
      await removeRoleMutation.mutateAsync({
        userId,
        roleId: selectedRole.id,
      });
      refetchUsers();
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to remove role.");
    }
  };

  return (
    <div className="card">
      <div className="card-header">Roles</div>
      <div className="card-body">
        {errorMessage && (
          <div className="alert alert-danger" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="row">
          {/* Left Column: Role List */}
          <div className="col-md-4 border-end">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold mb-0">Roles</h6>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={resetForm}
              >
                + New
              </button>
            </div>
            <div className="list-group">
              {roles?.map((role: Role) => (
                <button
                  key={role.id}
                  type="button"
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                    selectedRole?.id === role.id ? "active" : ""
                  }`}
                  onClick={() => handleEditRole(role)}
                >
                  <div className="d-flex align-items-center gap-2">
                    {role.level === 1 && (
                      <i className="bi bi-shield-shaded text-warning"></i>
                    )}
                    {role.level === 2 && (
                      <i className="bi bi-shield text-secondary"></i>
                    )}
                    {role.name}
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRole(role.id);
                    }}
                    className="text-danger ms-2"
                    style={{ cursor: "pointer" }}
                  >
                    &times;
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Role Details & Assignments */}
          <div className="col-md-8">
            <h6 className="fw-bold mb-3">
              {selectedRole ? `Edit Role: ${selectedRole.name}` : "New Role"}
            </h6>

            <div className="mb-3">
              <label className="form-label">Role Name</label>
              <input
                type="text"
                className="form-control"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. Director, Officer, Staff"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Authority Level</label>
              <select
                className="form-select"
                value={level}
                onChange={(e) => handleLevelChange(parseInt(e.target.value))}
              >
                <option value={1}>
                  Level 1 - Leader (Head/Director) - Full Admin
                </option>
                <option value={2}>
                  Level 2 - Co-Leader (Manager/Coordinator)
                </option>
                <option value={3}>Level 3 - Elder (Senior Officer)</option>
                <option value={4}>Level 4 - Member (Staff/Faculty)</option>
              </select>
              <small className="text-muted">
                Sets default permissions and hierarchy position.
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label d-block">
                Permissions (Override Defaults)
              </label>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="perm-users"
                  checked={permissions.canManageUsers}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      canManageUsers: e.target.checked,
                    })
                  }
                />
                <label className="form-check-label" htmlFor="perm-users">
                  Manage Users
                </label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="perm-roles"
                  checked={permissions.canManageRoles}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      canManageRoles: e.target.checked,
                    })
                  }
                />
                <label className="form-check-label" htmlFor="perm-roles">
                  Manage Roles
                </label>
              </div>
              <div className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="perm-docs"
                  checked={permissions.canManageDocuments}
                  onChange={(e) =>
                    setPermissions({
                      ...permissions,
                      canManageDocuments: e.target.checked,
                    })
                  }
                />
                <label className="form-check-label" htmlFor="perm-docs">
                  Manage Documents
                </label>
              </div>
            </div>

            <button
              className="btn btn-primary mb-4"
              onClick={handleCreateOrUpdateRole}
              disabled={
                !roleName ||
                createRoleMutation.isPending ||
                updateRoleMutation.isPending
              }
            >
              {createRoleMutation.isPending || updateRoleMutation.isPending ? (
                <span className="spinner-border spinner-border-sm me-2"></span>
              ) : null}
              {selectedRole ? "Update Role" : "Create Role"}
            </button>

            {selectedRole && (
              <>
                <hr />
                <h6 className="fw-bold mb-3">Assigned Users</h6>

                {/* Add User to Role */}
                <div className="input-group mb-3">
                  <select
                    className="form-select"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  >
                    <option value="">Select User...</option>
                    {users
                      ?.filter(
                        (u: User) =>
                          !u.roles.some((r: any) => r.id === selectedRole.id),
                      )
                      .map((u: User) => (
                        <option key={u.id} value={u.id}>
                          {formatUserName(u)} (
                          {u.department?.name || "Unassigned"})
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn btn-outline-success"
                    type="button"
                    onClick={() => {
                      if (selectedUser) {
                        handleAssignRole(selectedUser);
                      }
                    }}
                    disabled={!selectedUser || assignRoleMutation.isPending}
                  >
                    {assignRoleMutation.isPending ? "Adding..." : "Add"}
                  </button>
                </div>

                {/* List Users in Role */}
                <ul className="list-group">
                  {users
                    ?.filter((u: User) =>
                      u.roles.some((r: any) => r.id === selectedRole.id),
                    )
                    .map((u: User) => (
                      <li
                        key={u.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          {formatUserName(u)}
                          <small className="text-muted ms-2">
                            ({u.department?.name})
                          </small>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveRole(u.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  {users?.filter((u: User) =>
                    u.roles.some((r: any) => r.id === selectedRole.id),
                  ).length === 0 && (
                    <li className="list-group-item text-muted">
                      No users assigned to this role.
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
