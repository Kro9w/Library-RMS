import React, { useEffect, useState } from "react";
import { trpc } from "../trpc";
import { useUser } from "@supabase/auth-helpers-react";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

type User = AppRouterOutputs["documents"]["getAppUsers"][0];
type Tag = AppRouterOutputs["documents"]["getTags"][0];
type UserRole = AppRouterOutputs["roles"]["getUserRoles"][0];
type Organization = AppRouterOutputs["documents"]["getAllOrgs"][0];

interface SendDocumentModalProps {
  show: boolean;
  onClose: () => void;
  documentId: string;
  initialRecipientId?: string | null;
}

export const SendDocumentModal: React.FC<SendDocumentModalProps> = ({
  show,
  onClose,
  documentId,
  initialRecipientId,
}) => {
  const [recipientId, setRecipientId] = useState(initialRecipientId || "");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { data: users } = trpc.documents.getAppUsers.useQuery();
  const { data: orgs } = trpc.documents.getAllOrgs.useQuery();
  const { data: tags } = trpc.documents.getTags.useQuery();
  const { data: globalTags } = trpc.documents.getGlobalTags.useQuery();
  const { data: recipientRoles } = trpc.roles.getUserRoles.useQuery(
    recipientId,
    {
      enabled: !!recipientId,
    }
  );
  const sendDocumentMutation = trpc.documents.sendDocument.useMutation();
  const user = useUser();

  useEffect(() => {
    if (show) {
      setRecipientId(initialRecipientId || "");
      if (initialRecipientId && users) {
        const initialRecipient = users.find(
          (u: { id: string }) => u.id === initialRecipientId
        );
        if (initialRecipient) {
          setSelectedOrgId(initialRecipient.organizationId);
        }
      } else {
        setSelectedOrgId(null);
      }
    }
  }, [show, initialRecipientId, users]);

  const handleSend = async () => {
    if (!documentId || !recipientId) return;

    await sendDocumentMutation.mutateAsync({
      documentId,
      recipientId,
      tagIds: selectedTags,
    });

    onClose();
  };

  const handleTagChange = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: "block" }} tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Send Document</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor="organization" className="form-label">
                  Organization
                </label>
                <select
                  id="organization"
                  className="form-select"
                  value={selectedOrgId || ""}
                  onChange={(e) => {
                    setSelectedOrgId(e.target.value);
                    setRecipientId("");
                  }}
                >
                  <option value="">Select an organization...</option>
                  {orgs?.map((org: Organization) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="recipient" className="form-label">
                  Recipient
                </label>
                <select
                  id="recipient"
                  className="form-select"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  disabled={!selectedOrgId}
                >
                  <option value="">Select a recipient...</option>
                  {users
                    ?.filter(
                      (user: { organizationId: string | null }) =>
                        user.organizationId === selectedOrgId
                    )
                    .map((user: User) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Tags</label>
              <div className="d-flex flex-wrap">
                {tags?.map((tag: Tag) => (
                  <div key={tag.id} className="form-check me-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value={tag.id}
                      id={`tag-${tag.id}`}
                      checked={selectedTags.includes(tag.id)}
                      onChange={() => handleTagChange(tag.id)}
                    />
                    <label
                      className="form-check-label"
                      htmlFor={`tag-${tag.id}`}
                    >
                      {tag.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label">Global Tags</label>
              <div className="d-flex flex-wrap">
                {globalTags
                  ?.filter((tag: Tag) => {
                    const canManageDocuments = recipientRoles?.some(
                      (role) => role.role.canManageDocuments
                    );

                    if (canManageDocuments) {
                      return ["for review", "communication"].includes(tag.name);
                    }
                    return tag.name === "communication";
                  })
                  .map((tag: Tag) => (
                    <div key={tag.id} className="form-check me-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        value={tag.id}
                        id={`global-tag-${tag.id}`}
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => handleTagChange(tag.id)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`global-tag-${tag.id}`}
                      >
                        {tag.name}
                      </label>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSend}
              disabled={!recipientId}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
