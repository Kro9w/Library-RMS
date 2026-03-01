import React from "react";
import "./ClassificationBadge.css";

export type ClassificationType =
  | "INSTITUTIONAL"
  | "CAMPUS"
  | "INTERNAL"
  | "CONFIDENTIAL";

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
  const badgeProps = {
    INSTITUTIONAL: {
      label: "Institutional",
      className: "classification-badge-public",
      icon: "bi-globe",
    },
    CAMPUS: {
      label: "Campus",
      className: "classification-badge-campus",
      icon: "bi-building",
    },
    INTERNAL: {
      label: "Internal",
      className: "classification-badge-internal",
      icon: "bi-people-fill",
    },
    CONFIDENTIAL: {
      label: "Confidential",
      className: "classification-badge-restricted",
      icon: "bi-incognito",
    },
  };

  const { label, className, icon } = badgeProps[classification];

  return (
    <span className={`classification-badge ${className}`}>
      <i className={`bi ${icon}`}></i>
      {label}
    </span>
  );
};
