// apps/web/src/components/Roles/RolePill.tsx
import React from "react";
import "./RolePill.css";

interface RolePillProps {
  roleName: string;
  onRemove?: () => void;
}

const RolePill: React.FC<RolePillProps> = ({ roleName, onRemove }) => {
  return (
    <div className="role-pill" data-role-name={roleName}>
      <span className="role-dot"></span>
      {roleName}
      {onRemove && (
        <button className="remove-role-btn" onClick={onRemove}>
          &times;
        </button>
      )}
    </div>
  );
};

export default RolePill;
