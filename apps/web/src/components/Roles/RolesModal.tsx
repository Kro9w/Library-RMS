// apps/web/src/components/Roles/RolesModal.tsx
import { useState } from "react";
import { trpc } from "../../trpc";
import RolePill from "./RolePill";
import "./RolesModal.css";

export function RolesModal() {
  const { data: roles, refetch: refetchRoles } = trpc.roles.getRoles.useQuery();
  const { data: users, refetch: refetchUsers } =
    trpc.user.getUsersWithRoles.useQuery();

  const createRole = trpc.roles.createRole.useMutation();
  const updateRole = trpc.roles.updateRole.useMutation();
  const deleteRole = trpc.roles.deleteRole.useMutation();
  const assignRoleToUser = trpc.roles.assignRoleToUser.useMutation();
  const unassignRoleFromUser = trpc.roles.unassignRoleFromUser.useMutation();

  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleAccess, setNewRoleAccess] = useState("Member");
  const [editedRoleName, setEditedRoleName] = useState("");
  const [dropdownOpenForUser, setDropdownOpenForUser] = useState<string | null>(
    null
  );

  const handleCreateRole = async () => {
    const isAdmin = newRoleAccess === "Admin";
    await createRole.mutateAsync({
      name: newRoleName,
      canManageUsers: isAdmin,
      canManageRoles: isAdmin,
      canManageDocuments: isAdmin,
    });
    refetchRoles();
    setNewRoleName("");
    setNewRoleAccess("Member");
  };

  const handleUpdateRole = async () => {
    if (selectedRole) {
      await updateRole.mutateAsync({
        id: selectedRole.id,
        name: editedRoleName,
      });
      refetchRoles();
      setSelectedRole(null);
      setEditedRoleName("");
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    await deleteRole.mutateAsync(roleId);
    refetchRoles();
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    await assignRoleToUser.mutateAsync({ userId, roleId });
    refetchUsers();
    setDropdownOpenForUser(null);
  };

  const handleUnassignRole = async (userId: string, roleId: string) => {
    await unassignRoleFromUser.mutateAsync({ userId, roleId });
    refetchUsers();
  };

  return (
    <div
      className="modal fade"
      id="rolesModal"
      tabIndex={-1}
      aria-labelledby="rolesModalLabel"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="rolesModalLabel">
              Manage Roles
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            {/* Create Role */}
            <div className="mb-3">
              <label htmlFor="newRoleName" className="form-label">
                New Role Name
              </label>
              <div className="input-group d-flex flex-row">
                <input
                  type="text"
                  className="form-control"
                  id="newRoleName"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                />
                <select
                  className="form-select"
                  value={newRoleAccess}
                  onChange={(e) => setNewRoleAccess(e.target.value)}
                >
                  <option value="Member">Member</option>
                  <option value="Admin">Admin</option>
                </select>
                <button className="btn btn-primary" onClick={handleCreateRole}>
                  Create Role
                </button>
              </div>
            </div>

            <hr />

            {/* Roles List */}
            <ul className="list-group">
              {roles?.map((role) => (
                <li key={role.id} className="list-group-item">
                  {selectedRole?.id === role.id ? (
                    <div className="d-flex justify-content-between align-items-center">
                      <input
                        type="text"
                        className="form-control"
                        value={editedRoleName}
                        onChange={(e) => setEditedRoleName(e.target.value)}
                      />
                      <div>
                        <button
                          className="btn btn-success btn-sm me-2"
                          onClick={handleUpdateRole}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedRole(null);
                            setEditedRoleName("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex justify-content-between align-items-center">
                      <RolePill roleName={role.name} />
                      <div className="d-flex justify-content-between align-items-center">
                        <button
                          className="btn btn-icon"
                          onClick={() => {
                            setSelectedRole(role);
                            setEditedRoleName(role.name);
                          }}
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button
                          className="btn btn-icon"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <hr />

            {/* Assign Roles to Users */}
            <h5>Assign Roles to Users</h5>
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>
                      <div className="role-pills-container">
                        {user.roles.map((userRole) => {
                          const role = roles?.find(
                            (r) => r.id === userRole.roleId
                          );
                          return role ? (
                            <RolePill
                              key={role.id}
                              roleName={role.name}
                              onRemove={() =>
                                handleUnassignRole(user.id, role.id)
                              }
                            />
                          ) : null;
                        })}
                        <div className="add-role-container">
                          <button
                            className="add-role-btn"
                            onClick={() =>
                              setDropdownOpenForUser(
                                dropdownOpenForUser === user.id ? null : user.id
                              )
                            }
                          >
                            +
                          </button>
                          {dropdownOpenForUser === user.id && (
                            <div className="role-dropdown">
                              {roles
                                ?.filter(
                                  (role) =>
                                    !user.roles.some(
                                      (userRole) => userRole.roleId === role.id
                                    )
                                )
                                .map((role) => (
                                  <button
                                    key={role.id}
                                    className="role-dropdown-item"
                                    onClick={() =>
                                      handleAssignRole(user.id, role.id)
                                    }
                                  >
                                    {role.name}
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
