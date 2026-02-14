import React from "react";

interface StatusBadgeProps {
  status: string | null | undefined;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (!status) return null;

  let badgeClass = "bg-secondary";
  let label = status;

  switch (status) {
    case "Active":
      badgeClass = "bg-success";
      break;
    case "Inactive":
      badgeClass = "bg-secondary";
      break;
    case "Ready":
      badgeClass = "bg-warning text-dark";
      label = "Ready for Disposition";
      break;
    case "Archived":
      badgeClass = "bg-info text-dark";
      break;
    case "Destroyed":
      badgeClass = "bg-danger";
      break;
    default:
      badgeClass = "bg-secondary";
      break;
  }

  return <span className={`badge ${badgeClass}`}>{label}</span>;
};
