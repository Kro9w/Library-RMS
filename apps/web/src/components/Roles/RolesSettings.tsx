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
  const [permissions, setPermissions] = useState({
    canManageUsers: false,
    canManageRoles: false,
    canManageDocuments: false,
  });
  const [selectedUser, setSelectedUser] = useState<string>("");

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
    setPermissions({
      canManageUsers: false,
      canManageRoles: false,
      canManageDocuments: false,
    });
    setSelectedUser("");
  };

  const handleCreateOrUpdateRole = async () => {
    if (!roleName) return;

    if (selectedRole) {
      await updateRoleMutation.mutateAsync({
        id: selectedRole.id,
        name: roleName,
        canManageUsers: permissions.canManageUsers,
        canManageRoles: permissions.canManageRoles,
        canManageDocuments: permissions.canManageDocuments,
      });
    } else {
      await createRoleMutation.mutateAsync({
        name: roleName,
        canManageUsers: permissions.canManageUsers,
        canManageRoles: permissions.canManageRoles,
        canManageDocuments: permissions.canManageDocuments,
      });
    }

    refetchRoles();
    resetForm();
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm("Are you sure you want to delete this role?")) {
      await deleteRoleMutation.mutateAsync(roleId);
      refetchRoles();
      if (selectedRole?.id === roleId) {
        resetForm();
      }
    }
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setPermissions({
      canManageUsers: role.canManageUsers,
      canManageRoles: role.canManageRoles,
      canManageDocuments: role.canManageDocuments,
    });
  };

  const handleAssignRole = async (userId: string) => {
    if (!selectedRole) return;
    await assignRoleMutation.mutateAsync({
      userId,
      roleId: selectedRole.id,
    });
    refetchUsers();
  };

  const handleRemoveRole = async (userId: string) => {
    if (!selectedRole) return;
    await removeRoleMutation.mutateAsync({
      userId,
      roleId: selectedRole.id,
    });
    refetchUsers();
  };

  return (
    <div className="card">
      <div className="card-header">Roles</div>
      <div className="card-body">
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
                  {role.name}
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
                placeholder="e.g. Moderator"
              />
            </div>

            <div className="mb-3">
              <label className="form-label d-block">Permissions</label>
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
              disabled={!roleName}
            >
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
                          !u.roles.some((r: any) => r.id === selectedRole.id)
                      )
                      .map((u: User) => (
                        <option key={u.id} value={u.id}>
                          {formatUserName(u)}
                        </option>
                      ))}
                  </select>
                  <button
                    className="btn btn-outline-success"
                    type="button"
                    onClick={() => {
                      if (selectedUser) {
                        handleAssignRole(selectedUser);
                        setSelectedUser("");
                      }
                    }}
                    disabled={!selectedUser}
                  >
                    Add
                  </button>
                </div>

                {/* List Users in Role */}
                <ul className="list-group">
                  {users
                    ?.filter((u: User) =>
                      u.roles.some((r: any) => r.id === selectedRole.id)
                    )
                    .map((u: User) => (
                      <li
                        key={u.id}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        {formatUserName(u)}
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveRole(u.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  {users?.filter((u: User) =>
                    u.roles.some((r: any) => r.id === selectedRole.id)
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
