import React from "react";

interface Props {
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function UserInitialsAvatar({
  firstName,
  lastName,
  imageUrl,
  size = 36,
  className = "",
  style,
}: Props) {
  const initials =
    [firstName?.[0], lastName?.[0]].filter(Boolean).join("").toUpperCase() ||
    "?";

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    ...style,
  };

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={`${firstName} ${lastName}`}
        className={className}
        style={{ ...baseStyle, objectFit: "cover" }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        ...baseStyle,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--brand-subtle)",
        color: "var(--brand)",
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 700,
        border: "1px solid var(--brand-muted)",
      }}
    >
      {initials}
    </div>
  );
}
