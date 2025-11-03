// apps/web/src/pages/DocumentTypesSettings.tsx
import { useState } from "react";
import { DocumentTypesModal } from "../components/DocumentTypes/DocumentTypesModal";
import { trpc } from "../trpc";

export function DocumentTypesSettings() {
  const { data: user } = trpc.user.getMe.useQuery();

  const canManageDocuments =
    user?.roles.some(
      (userRole: { role: { canManageDocuments: any } }) =>
        userRole.role.canManageDocuments
    ) || false;

  return (
    <div className="card mt-4">
      {canManageDocuments && (
        <>
          <div className="card">
            <div className="card-header">Document Types</div>
            <div className="card-body">
              <h5>Manage Document Types</h5>
              <p>
                Create, edit, and delete document types, and assign them colors.
              </p>
              <button
                className="btn btn-primary"
                data-bs-toggle="modal"
                data-bs-target="#documentTypesModal"
              >
                Manage Document Types
              </button>
            </div>
          </div>
          <DocumentTypesModal />
        </>
      )}
    </div>
  );
}
