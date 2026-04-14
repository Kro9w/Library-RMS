import React, { useState } from "react";
import { trpc } from "../../trpc";
import type { AppRouterOutputs } from "../../../../api/src/trpc/trpc.router";
import { ConfirmModal } from "../ConfirmModal";
import { formatUserName } from "../../utils/user";
import "./RolesSettings.css";

type User = AppRouterOutputs["user"]["getUsersWithRoles"][0];
type Role = AppRouterOutputs["roles"]["getRoles"][0];

// Config and Constants

const LEVEL_LABELS: Record<
  number,
  { label: string; color: string; bg: string; border: string }
> = {
  0: {
    label: "Executive",
    color: "#9b2335",
    bg: "var(--brand-subtle)",
    border: "var(--brand-muted)",
  },
  1: {
    label: "Leader",
    color: "#854d0e",
    bg: "var(--warning-subtle)",
    border: "#fde047",
  },
  2: {
    label: "Manager",
    color: "#1e40af",
    bg: "var(--info-subtle)",
    border: "#93c5fd",
  },
  3: {
    label: "Senior",
    color: "var(--text-secondary)",
    bg: "var(--bg-subtle)",
    border: "var(--border)",
  },
  4: {
    label: "Staff",
    color: "var(--text-muted)",
    bg: "var(--bg-subtle)",
    border: "var(--border)",
  },
};

const PERMISSION_CONFIG = [
  {
    key: "canManageDocuments",
    label: "Manage documents",
    shortLabel: "Docs",
    icon: "bi-file-earmark-text",
    color: "#c97b2e",
  },
  {
    key: "canManageRoles",
    label: "Manage roles",
    shortLabel: "Roles",
    icon: "bi-shield",
    color: "#D79657",
  },
  {
    key: "canManageUsers",
    label: "Manage users",
    shortLabel: "Users",
    icon: "bi-people",
    color: "#E4B180",
  },
] as const;

type PermKeys = (typeof PERMISSION_CONFIG)[number]["key"];
type PermState = Record<PermKeys, boolean>;

const LEVEL_DEFAULT_PERMS: Record<number, PermState> = {
  0: { canManageUsers: true, canManageRoles: true, canManageDocuments: true },
  1: { canManageUsers: true, canManageRoles: true, canManageDocuments: true },
  2: { canManageUsers: true, canManageRoles: false, canManageDocuments: true },
  3: { canManageUsers: false, canManageRoles: false, canManageDocuments: true },
  4: {
    canManageUsers: false,
    canManageRoles: false,
    canManageDocuments: false,
  },
};

// Micro components

function LevelBadge({ level }: { level: number }) {
  const meta = LEVEL_LABELS[level] ?? LEVEL_LABELS[4];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "10px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        padding: "2px 8px",
        borderRadius: "var(--radius-full)",
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
        whiteSpace: "nowrap",
        lineHeight: 1.6,
      }}
    >
      {meta.label}
    </span>
  );
}

function PermissionDot({ active, color }: { active: boolean; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        backgroundColor: active ? color : "var(--border-strong)",
        flexShrink: 0,
      }}
    />
  );
}

function UserAvatar({ user }: { user: User }) {
  const initials = [user.firstName?.[0], user.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "26px",
        height: "26px",
        borderRadius: "50%",
        background: "var(--brand-subtle)",
        color: "var(--brand)",
        fontSize: "10px",
        fontWeight: 700,
        flexShrink: 0,
        border: "1px solid var(--brand-muted)",
      }}
    >
      {initials || "?"}
    </span>
  );
}

// Domain components

interface RoleFormProps {
  initialName?: string;
  initialLevel?: number;
  initialPerms?: PermState;
  isExecutive?: boolean;
  onSave: (data: { name: string; level: number } & PermState) => void;
  onCancel: () => void;
  isPending?: boolean;
  isEdit?: boolean;
}

function RoleForm({
  initialName = "",
  initialLevel = 4,
  initialPerms = LEVEL_DEFAULT_PERMS[4],
  isExecutive = false,
  onSave,
  onCancel,
  isPending,
  isEdit,
}: RoleFormProps) {
  const [name, setName] = useState(initialName);
  const [level, setLevel] = useState(initialLevel);
  const [perms, setPerms] = useState<PermState>(initialPerms);

  const handleLevelChange = (newLevel: number) => {
    setLevel(newLevel);
    setPerms(LEVEL_DEFAULT_PERMS[newLevel] ?? LEVEL_DEFAULT_PERMS[4]);
  };

  const togglePerm = (key: PermKeys) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          Role name
        </label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Dean, Program Coordinator, Staff"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isExecutive}
          autoFocus
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          Authority level
        </label>
        <select
          className="form-control form-select"
          value={level}
          onChange={(e) => handleLevelChange(Number(e.target.value))}
          disabled={isExecutive}
        >
          {isExecutive && <option value={0}>Level 0 — Executive</option>}
          <option value={1}>Level 1 — Leader (Full Admin)</option>
          <option value={2}>Level 2 — Manager / Coordinator</option>
          <option value={3}>Level 3 — Senior Officer</option>
          <option value={4}>Level 4 — Staff / Member</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        <label className="form-label" style={{ marginBottom: 0 }}>
          Permissions
        </label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--bg-surface)",
          }}
        >
          {PERMISSION_CONFIG.map(({ key, label, icon, color }) => (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 12px",
                cursor: isExecutive ? "default" : "pointer",
                background: perms[key]
                  ? "var(--success-subtle)"
                  : "var(--bg-surface)",
                borderBottom: "1px solid var(--border-muted)",
                transition: "background 120ms ease",
                userSelect: "none",
              }}
              onMouseEnter={(e) => {
                if (!isExecutive)
                  e.currentTarget.style.background = perms[key]
                    ? "var(--success-subtle)"
                    : "var(--bg-hover)";
              }}
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = perms[key]
                  ? "var(--success-subtle)"
                  : "var(--bg-surface)")
              }
            >
              <input
                type="checkbox"
                className="form-check-input"
                checked={perms[key]}
                onChange={() => togglePerm(key)}
                disabled={isExecutive}
                style={{
                  margin: 0,
                  width: "15px",
                  height: "15px",
                  flexShrink: 0,
                }}
              />
              <i
                className={`bi ${icon}`}
                style={{
                  fontSize: "13px",
                  color: perms[key] ? color : "var(--text-muted)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  flex: 1,
                }}
              >
                {label}
              </span>
              <PermissionDot active={perms[key]} color={color} />
            </label>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          paddingTop: "4px",
        }}
      >
        <button
          className="standard-modal-btn standard-modal-btn-ghost"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </button>
        <button
          className="standard-modal-btn standard-modal-btn-confirm"
          onClick={() => onSave({ name, level, ...perms })}
          disabled={!name.trim() || isPending || isExecutive}
        >
          {isPending ? (
            <>
              <span className="standard-modal-spinner" />
              Saving…
            </>
          ) : (
            <>{isEdit ? "Update role" : "Create role"}</>
          )}
        </button>
      </div>
    </div>
  );
}

interface AssignedUsersPanelProps {
  assignedUsers: User[];
  unassignedUsers: User[];
  selectedUser: string;
  onSelectedUserChange: (userId: string) => void;
  onAssign: () => void;
  onRemove: (userId: string) => void;
  isAssignPending: boolean;
  isRemovePending: boolean;
}

function AssignedUsersPanel({
  assignedUsers,
  unassignedUsers,
  selectedUser,
  onSelectedUserChange,
  onAssign,
  onRemove,
  isAssignPending,
  isRemovePending,
}: AssignedUsersPanelProps) {
  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: "14px",
        background: "var(--bg-surface)",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          margin: "0 0 10px",
        }}
      >
        Assigned users
      </p>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <select
          className="form-control form-select"
          value={selectedUser}
          onChange={(e) => onSelectedUserChange(e.target.value)}
          style={{
            flex: 1,
            height: "32px",
            fontSize: "12px",
            padding: "4px 28px 4px 10px",
          }}
        >
          <option value="">Add a user…</option>
          {unassignedUsers?.map((u: User) => (
            <option key={u.id} value={u.id}>
              {formatUserName(u)} — {u.department?.name ?? "Unassigned"}
            </option>
          ))}
        </select>
        <button
          className="standard-modal-btn standard-modal-btn-confirm"
          style={{ height: "32px", fontSize: "12px", padding: "0 12px" }}
          onClick={onAssign}
          disabled={!selectedUser || isAssignPending}
        >
          {isAssignPending ? (
            <span className="standard-modal-spinner" />
          ) : (
            <i className="bi bi-plus-lg" />
          )}
        </button>
      </div>

      {assignedUsers.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {assignedUsers.map((u: User) => (
            <div
              key={u.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "7px 10px",
                background: "var(--bg-subtle)",
                border: "1px solid var(--border-muted)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <UserAvatar user={u} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {formatUserName(u)}
                </p>
                {u.department?.name && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      margin: 0,
                    }}
                  >
                    {u.department.name}
                  </p>
                )}
              </div>
              <button
                className="btn-icon btn-delete"
                title="Remove from role"
                onClick={() => onRemove(u.id)}
                disabled={isRemovePending}
                style={{ width: "26px", height: "26px" }}
              >
                <i className="bi bi-x" style={{ fontSize: "15px" }} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
          No users assigned to this role yet.
        </p>
      )}
    </div>
  );
}

interface RoleRowProps {
  role: Role;
  isSelected: boolean;
  usersInRole: User[];
  isLastItem: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  isDeletePending: boolean;
  children?: React.ReactNode;
}

function RoleRow({
  role,
  isSelected,
  usersInRole,
  isLastItem,
  onToggleEdit,
  onDelete,
  isDeletePending,
  children,
}: RoleRowProps) {
  return (
    <div
      style={{
        borderBottom: isLastItem ? "none" : "1px solid var(--border-muted)",
        background: isSelected ? "var(--bg-subtle)" : "transparent",
        transition: "background 100ms ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "12px 14px",
        }}
      >
        <LevelBadge level={role.level ?? 4} />
        <span
          style={{
            flex: 1,
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
            minWidth: 0,
          }}
        >
          {role.name}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {PERMISSION_CONFIG.map(({ key, label, color }) => (
            <span key={key} title={label}>
              <PermissionDot active={role[key]} color={color} />
            </span>
          ))}
        </div>

        {usersInRole.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {usersInRole.slice(0, 3).map((u: User) => (
              <UserAvatar key={u.id} user={u} />
            ))}
            {usersInRole.length > 3 && (
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-full)",
                  padding: "0 5px",
                  lineHeight: "18px",
                }}
              >
                +{usersInRole.length - 3}
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button
            className="btn-icon"
            title="Edit role"
            onClick={onToggleEdit}
            style={{ color: isSelected ? "var(--brand)" : undefined }}
          >
            <i
              className={`bi ${isSelected ? "bi-pencil-fill" : "bi-pencil"}`}
              style={{ fontSize: "13px" }}
            />
          </button>
          {role.level !== 0 && (
            <button
              className="btn-icon btn-delete"
              title="Delete role"
              onClick={onDelete}
              disabled={isDeletePending}
            >
              <i className="bi bi-trash3" style={{ fontSize: "13px" }} />
            </button>
          )}
        </div>
      </div>
      {isSelected && children}
    </div>
  );
}

// Main orchestrator component

export const RolesSettings: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

  const { data: roles, refetch: refetchRoles } = trpc.roles.getRoles.useQuery();
  const { data: users, refetch: refetchUsers } =
    trpc.user.getUsersWithRoles.useQuery();

  const createRoleMutation = trpc.roles.createRole.useMutation();
  const updateRoleMutation = trpc.roles.updateRole.useMutation();
  const deleteRoleMutation = trpc.roles.deleteRole.useMutation();
  const assignRoleMutation = trpc.roles.assignRoleToUser.useMutation();
  const removeRoleMutation = trpc.roles.unassignRoleFromUser.useMutation();

  const handleCreate = (data: { name: string; level: number } & PermState) => {
    setErrorMessage(null);
    createRoleMutation.mutate(data, {
      onSuccess: () => {
        setShowCreateForm(false);
        refetchRoles();
      },
      onError: (e) => setErrorMessage(e.message),
    });
  };

  const handleUpdate = (data: { name: string; level: number } & PermState) => {
    if (!selectedRole) return;
    setErrorMessage(null);
    updateRoleMutation.mutate(
      { id: selectedRole.id, ...data },
      {
        onSuccess: () => {
          setSelectedRole(null);
          refetchRoles();
        },
        onError: (e) => setErrorMessage(e.message),
      },
    );
  };

  const confirmDelete = () => {
    if (!roleToDelete) return;
    deleteRoleMutation.mutate(roleToDelete, {
      onSuccess: () => {
        refetchRoles();
        if (selectedRole?.id === roleToDelete) setSelectedRole(null);
      },
      onError: (e) => setErrorMessage(e.message),
      onSettled: () => setRoleToDelete(null),
    });
  };

  const handleAssign = () => {
    if (!selectedRole || !selectedUser) return;
    assignRoleMutation.mutate(
      { userId: selectedUser, roleId: selectedRole.id },
      {
        onSuccess: () => {
          refetchUsers();
          setSelectedUser("");
        },
        onError: (e) => setErrorMessage(e.message),
      },
    );
  };

  const handleRemove = (userId: string) => {
    if (!selectedRole) return;
    removeRoleMutation.mutate(
      { userId, roleId: selectedRole.id },
      {
        onSuccess: () => refetchUsers(),
        onError: (e) => setErrorMessage(e.message),
      },
    );
  };

  const sortedRoles = [...(roles ?? [])].sort(
    (a, b) => (a.level ?? 4) - (b.level ?? 4),
  );

  return (
    <div className="card">
      <div
        className="card-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Roles</span>
        {!showCreateForm && !selectedRole && (
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            style={{ height: "28px", fontSize: "12px", padding: "0 12px" }}
            onClick={() => setShowCreateForm(true)}
          >
            <i className="bi bi-plus-lg" /> New role
          </button>
        )}
      </div>

      <div className="card-body" style={{ padding: "20px" }}>
        {errorMessage && (
          <div
            className="standard-modal-notice standard-modal-notice-error"
            style={{ marginBottom: "16px" }}
          >
            <i className="bi bi-exclamation-circle" /> <p>{errorMessage}</p>
          </div>
        )}

        {showCreateForm && (
          <div
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              marginBottom: "16px",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
                margin: "0 0 14px",
              }}
            >
              New role
            </p>
            <RoleForm
              onSave={handleCreate}
              onCancel={() => setShowCreateForm(false)}
              isPending={createRoleMutation.isPending}
            />
          </div>
        )}

        {selectedRole && (
          <div
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--brand-muted)",
              borderRadius: "var(--radius-lg)",
              padding: "18px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "14px",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--brand)",
                  margin: 0,
                }}
              >
                Editing: {selectedRole.name}
              </p>
              <LevelBadge level={selectedRole.level ?? 4} />
            </div>
            <RoleForm
              initialName={selectedRole.name}
              initialLevel={selectedRole.level ?? 4}
              initialPerms={{
                canManageUsers: selectedRole.canManageUsers,
                canManageRoles: selectedRole.canManageRoles,
                canManageDocuments: selectedRole.canManageDocuments,
              }}
              isExecutive={selectedRole.level === 0}
              isEdit
              onSave={handleUpdate}
              onCancel={() => setSelectedRole(null)}
              isPending={updateRoleMutation.isPending}
            />
          </div>
        )}

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          {sortedRoles.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "40px 24px",
                gap: "8px",
                color: "var(--text-muted)",
                fontSize: "13px",
              }}
            >
              <i
                className="bi bi-shield"
                style={{ fontSize: "24px", opacity: 0.25 }}
              />
              <span>No roles yet. Create the first one above.</span>
            </div>
          )}

          {sortedRoles.map((role, idx) => {
            const isSelected = selectedRole?.id === role.id;
            const usersInRole =
              users?.filter((u: User) =>
                u.roles.some((r: Role) => r.id === role.id),
              ) ?? [];
            const unassignedUsers =
              users?.filter(
                (u: User) => !u.roles.some((r: Role) => r.id === role.id),
              ) ?? [];

            return (
              <RoleRow
                key={role.id}
                role={role}
                isSelected={isSelected}
                usersInRole={usersInRole}
                isLastItem={idx === sortedRoles.length - 1}
                isDeletePending={deleteRoleMutation.isPending}
                onToggleEdit={() => {
                  setSelectedRole(isSelected ? null : role);
                  setShowCreateForm(false);
                  setErrorMessage(null);
                }}
                onDelete={() => setRoleToDelete(role.id)}
              >
                <AssignedUsersPanel
                  assignedUsers={usersInRole}
                  unassignedUsers={unassignedUsers}
                  selectedUser={selectedUser}
                  onSelectedUserChange={setSelectedUser}
                  onAssign={handleAssign}
                  onRemove={handleRemove}
                  isAssignPending={assignRoleMutation.isPending}
                  isRemovePending={removeRoleMutation.isPending}
                />
              </RoleRow>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginTop: "12px",
            padding: "8px 12px",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border-muted)",
            borderRadius: "var(--radius-md)",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Permissions
          </span>
          {PERMISSION_CONFIG.map(({ shortLabel, color }) => (
            <span
              key={shortLabel}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
                color: "var(--text-secondary)",
              }}
            >
              <PermissionDot active color={color} /> {shortLabel}
            </span>
          ))}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "var(--text-secondary)",
            }}
          >
            <PermissionDot active={false} color="transparent" /> Not granted
          </span>
        </div>
      </div>

      <ConfirmModal
        show={!!roleToDelete}
        title="Delete role"
        onConfirm={confirmDelete}
        onClose={() => setRoleToDelete(null)}
        isConfirming={deleteRoleMutation.isPending}
      >
        <p>
          Are you sure you want to delete this role? All user assignments will
          be removed.
        </p>
      </ConfirmModal>
    </div>
  );
};
