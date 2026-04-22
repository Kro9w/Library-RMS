import React from "react";

type DocumentType =
  | {
      name: string;
      color: string;
    }
  | null
  | undefined;

interface DocumentTypePillProps {
  documentType: DocumentType;
}

export const DocumentTypePill: React.FC<DocumentTypePillProps> = ({
  documentType,
}) => {
  if (!documentType) {
    return (
      <span
        className="doc-type-pill"
        style={
          {
            "--type-color": "#6c757d",
            backgroundColor: "#e9ecef",
            color: "#495057",
          } as React.CSSProperties
        }
      >
        <span
          className="doc-type-pill-dot"
          style={{ backgroundColor: "var(--type-color)" }}
        />
        Uncategorized
      </span>
    );
  }

  const validColor = documentType.color.startsWith("#")
    ? documentType.color
    : `#${documentType.color}`;

  return (
    <span
      className="doc-type-pill"
      style={
        {
          "--type-color": validColor,
          backgroundColor: `${validColor}33`,
          color: validColor,
        } as React.CSSProperties
      }
    >
      <span
        className="doc-type-pill-dot"
        style={{ backgroundColor: `var(--type-color)` }}
      />
      {documentType.name}
    </span>
  );
};
