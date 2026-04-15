import React, { useState, useMemo } from "react";
import { trpc } from "../trpc";
import "./StandardModal.css";
import "./PendingDispositionsModal.css";

interface PendingDispositionsModalProps {
  show: boolean;
  onClose: () => void;
}

export const PendingDispositionsModal: React.FC<
  PendingDispositionsModalProps
> = ({ show, onClose }) => {
  const {
    data: documents,
    isLoading,
    refetch,
  } = trpc.documents.getPendingDispositions.useQuery(undefined, {
    enabled: show,
  });

  const approveMutation = trpc.documents.approveManyDispositions.useMutation({
    onSuccess: () => {
      refetch();
      onClose();
    },
    onError: (error) => {
      alert(`Failed to approve dispositions: ${error.message}`);
    },
  });

  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const handleSelect = (id: string) => {
    const next = new Set(selectedDocs);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedDocs(next);
  };

  const handleSelectAllGroup = (
    groupDocs: { id: string }[],
    isAllSelected: boolean,
  ) => {
    const next = new Set(selectedDocs);
    groupDocs.forEach((doc: any) => {
      if (isAllSelected) {
        next.delete(doc.id);
      } else {
        next.add(doc.id);
      }
    });
    setSelectedDocs(next);
  };

  const groupedDocs = useMemo(() => {
    if (!documents) return [];

    const groups = new Map<string, any[]>();
    documents.forEach((doc: any) => {
      const seriesName =
        doc.documentType?.recordsSeries?.name || "Uncategorized";
      if (!groups.has(seriesName)) {
        groups.set(seriesName, []);
      }
      groups.get(seriesName)!.push(doc);
    });

    return Array.from(groups.entries()).map(([series, docs]) => ({
      series,
      docs,
    }));
  }, [documents]);

  if (!show) return null;

  return (
    <div className="standard-modal-backdrop">
      <div className="standard-modal-dialog" style={{ maxWidth: "600px" }}>
        <div className="standard-modal-header">
          <div className="standard-modal-icon">
            <i className="bi bi-archive" />
          </div>
          <div className="standard-modal-header-text">
            <h3 className="standard-modal-title">Approve Dispositions</h3>
            <p className="standard-modal-subtitle">
              Review and approve document dispositions by Records Series.
            </p>
          </div>
          <button
            className="standard-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="bi bi-x" />
          </button>
        </div>

        <div className="standard-modal-body pending-disp-body">
          {isLoading ? (
            <div className="text-center p-4">Loading...</div>
          ) : groupedDocs.length === 0 ? (
            <div className="text-center text-muted p-4">
              No pending dispositions to approve.
            </div>
          ) : (
            <div className="pending-disp-groups">
              {groupedDocs.map((group) => {
                const isAllSelected =
                  group.docs.length > 0 &&
                  group.docs.every((doc: any) => selectedDocs.has(doc.id));
                const isIndeterminate =
                  !isAllSelected &&
                  group.docs.some((doc: any) => selectedDocs.has(doc.id));

                return (
                  <div key={group.series} className="pending-disp-group">
                    <div className="pending-disp-group-header">
                      <label className="d-flex align-items-center gap-2 mb-0 fw-bold">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = isIndeterminate;
                          }}
                          onChange={() =>
                            handleSelectAllGroup(group.docs, isAllSelected)
                          }
                        />
                        {group.series}{" "}
                        <span className="badge bg-secondary ms-2">
                          {group.docs.length}
                        </span>
                      </label>
                    </div>
                    <ul className="list-group list-group-flush pending-disp-list">
                      {group.docs.map((doc: any) => (
                        <li
                          key={doc.id}
                          className="list-group-item d-flex justify-content-between align-items-center"
                        >
                          <label className="d-flex align-items-center gap-2 mb-0 w-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedDocs.has(doc.id)}
                              onChange={() => handleSelect(doc.id)}
                            />
                            <div className="text-truncate">
                              <span className="fw-medium">
                                {doc.controlNumber || doc.title}
                              </span>
                              <br />
                              <small className="text-muted">
                                Action:{" "}
                                {doc.lifecycle?.dispositionActionSnapshot}
                              </small>
                            </div>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="standard-modal-footer">
          <button
            className="standard-modal-btn standard-modal-btn-ghost"
            onClick={onClose}
            disabled={approveMutation.isPending}
          >
            Cancel
          </button>
          <button
            className="standard-modal-btn standard-modal-btn-confirm"
            onClick={() =>
              approveMutation.mutate({ documentIds: Array.from(selectedDocs) })
            }
            disabled={selectedDocs.size === 0 || approveMutation.isPending}
          >
            {approveMutation.isPending ? (
              <>
                <span className="standard-modal-spinner" /> Approving...
              </>
            ) : (
              <>
                <i className="bi bi-check-lg" /> Approve{" "}
                {selectedDocs.size > 0 ? `(${selectedDocs.size})` : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
