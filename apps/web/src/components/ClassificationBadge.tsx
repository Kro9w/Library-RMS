import React from "react";
import "./ClassificationBadge.css";
export type ClassificationType =
  | "DEPARTMENTAL"
  | "INSTITUTIONAL"
  | "INTERNAL"
  | "CONFIDENTIAL"
  | "FOR_APPROVAL";
interface ClassificationBadgeProps {
  classification?: ClassificationType | null;
}
export const ClassificationBadge: React.FC<ClassificationBadgeProps> = ({
  classification,
}) => {
  if (!classification) {
    return null;
  }
  // Define properties mapping to custom CSS classes
  const badgeProps: Record<
    string,
    { label: string; className: string; icon: string }
  > = {
    INSTITUTIONAL: {
      label: "Institutional",
      className: "classification-badge-public",
      icon: "bi-globe",
    },
    INTERNAL: {
      label: "Internal",
      className: "classification-badge-campus",
      icon: "bi-building",
    },
    DEPARTMENTAL: {
      label: "Departmental",
      className: "classification-badge-internal",
      icon: "bi-people-fill",
    },
    CONFIDENTIAL: {
      label: "Confidential",
      className: "classification-badge-restricted",
      icon: "bi-incognito",
    },
    FOR_APPROVAL: {
      label: "For Approval",
      className: "classification-badge-approval",
      icon: "bi-file-earmark-check-fill",
    },
  };
  const badgeConfig = badgeProps[classification];
  if (!badgeConfig) {
    return null;
  }
  const { label, className, icon } = badgeConfig;
  return (
    <span className={`classification-badge ${className}`}>
      <i className={`bi ${icon}`}></i>
      {label}
    </span>
  );
};
