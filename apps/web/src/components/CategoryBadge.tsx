import React from "react";
import "./CategoryBadge.css";
export type CategoryType =
  | "DEPARTMENTAL"
  | "INSTITUTIONAL"
  | "INTERNAL"
  | "RESTRICTED"
  | "FOR_APPROVAL"
  | "EXTERNAL";
interface CategoryBadgeProps {
  category?: CategoryType | null;
}
export const CategoryBadge: React.FC<CategoryBadgeProps> = ({ category }) => {
  if (!category) {
    return null;
  }
  const badgeProps: Record<
    string,
    { label: string; className: string; icon: string }
  > = {
    INSTITUTIONAL: {
      label: "Institutional",
      className: "category-badge-public",
      icon: "bi-globe",
    },
    INTERNAL: {
      label: "Internal",
      className: "category-badge-campus",
      icon: "bi-building",
    },
    DEPARTMENTAL: {
      label: "Departmental",
      className: "category-badge-internal",
      icon: "bi-people-fill",
    },
    RESTRICTED: {
      label: "Restricted",
      className: "category-badge-restricted",
      icon: "bi-file-earmark-minus",
    },
    FOR_APPROVAL: {
      label: "For Approval",
      className: "category-badge-approval",
      icon: "bi-file-earmark-check-fill",
    },
    EXTERNAL: {
      label: "External",
      className: "category-badge-external",
      icon: "bi-box-arrow-up-right",
    },
  };
  const badgeConfig = badgeProps[category];
  if (!badgeConfig) {
    return null;
  }
  const { label, className, icon } = badgeConfig;
  return (
    <span className={`category-badge ${className}`}>
      <i className={`bi ${icon}`}></i>
      {label}
    </span>
  );
};
