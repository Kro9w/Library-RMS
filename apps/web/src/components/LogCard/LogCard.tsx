// apps/web/src/components/LogCard/LogCard.tsx
import React from "react";
import RolePill from "../Roles/RolePill";
import { UserAvatar } from "../UserAvatar";
import "./LogCard.css";
import { UserNameFields, formatUserName } from "../../utils/user";

interface Log {
  id: string;
  user: UserNameFields;
  action: string;
  organization: {
    name: string;
  };
  userRole: string;
  createdAt: string;
}

interface LogCardProps {
  log: Log;
}

const getActionType = (action: string) => {
  const lowerCaseAction = action.toLowerCase();
  if (
    lowerCaseAction.includes("create") ||
    lowerCaseAction.includes("upload") ||
    lowerCaseAction.includes("add") ||
    lowerCaseAction.includes("assign")
  ) {
    return "success";
  }
  if (
    lowerCaseAction.includes("delete") ||
    lowerCaseAction.includes("remove") ||
    lowerCaseAction.includes("unassign")
  ) {
    return "danger";
  }
  return "default";
};

const LogCard: React.FC<LogCardProps> = ({ log }) => {
  const actionType = getActionType(log.action);

  return (
    <div className={`log-card log-card-${actionType}`}>
      <div className="log-card-header">
        <div className="log-card-user">
          <UserAvatar user={log.user} size={40} />
          <div className="log-card-user-info">
            <span className="log-card-user-name">
              {formatUserName(log.user)}
            </span>
            <span className="log-card-org-name">{log.organization.name}</span>
          </div>
        </div>
        <div className="log-card-role">
          <RolePill roleName={log.userRole} />
        </div>
      </div>
      <div className="log-card-body">
        <p className="log-card-message">{log.action}</p>
      </div>
      <div className="log-card-footer">
        <span className="log-card-timestamp">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default LogCard;
