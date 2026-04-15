import { useState, useEffect } from "react";
import { trpc } from "../../trpc";

export function DepartmentDocumentTypesSettings() {
  const { data: user } = trpc.user.getMe.useQuery();
  const utils = trpc.useUtils();

  const departmentId = user?.departmentId;

  // Use the unfiltered endpoint to get all possible types
  const { data: allDocumentTypes, isLoading: loadingAll } =
    trpc.documentTypes.getAllUnfiltered.useQuery();

  const { data: departmentDocumentTypes, isLoading: loadingDeptTypes } =
    trpc.documentTypes.getForDepartment.useQuery(
      { departmentId: departmentId! },
      { enabled: !!departmentId },
    );

  const updateMutation = trpc.documentTypes.updateDepartmentTypes.useMutation({
    onSuccess: () => {
      utils.documentTypes.getForDepartment.invalidate({
        departmentId: departmentId!,
      });
      utils.documentTypes.getAll.invalidate();
    },
  });

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (departmentDocumentTypes) {
      setSelectedTypes(new Set(departmentDocumentTypes.map((t: any) => t.id)));
    }
  }, [departmentDocumentTypes]);

  if (!departmentId) {
    return (
      <div className="alert alert-warning">
        You are not assigned to a department.
      </div>
    );
  }

  if (loadingAll || loadingDeptTypes) {
    return <div>Loading...</div>;
  }

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTypes(newSet);
  };

  const handleToggleSeries = (seriesId: string, isAllSelected: boolean) => {
    const seriesTypeIds =
      allDocumentTypes
        ?.filter((t: any) => t.recordsSeriesId === seriesId)
        .map((t: any) => t.id) || [];

    const newSet = new Set(selectedTypes);
    if (isAllSelected) {
      seriesTypeIds.forEach((id: string) => newSet.delete(id));
    } else {
      seriesTypeIds.forEach((id: string) => newSet.add(id));
    }
    setSelectedTypes(newSet);
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      departmentId,
      documentTypeIds: Array.from(selectedTypes),
    });
  };

  const isWhitelistEmpty = selectedTypes.size === 0;

  // Group types by series
  const groupedTypes = allDocumentTypes?.reduce((acc: any, type: any) => {
    const seriesId = type.recordsSeriesId || "unassigned";
    const seriesName = type.recordsSeries?.name || "Uncategorized Series";
    if (!acc[seriesId]) {
      acc[seriesId] = { name: seriesName, types: [] };
    }
    acc[seriesId].types.push(type);
    return acc;
  }, {});

  return (
    <div className="settings-section">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">Department Document Types</h4>
          <p className="text-muted small mb-0">
            Select the document types that your department handles. If none are
            selected, all document types will be available in dropdowns by
            default. This helps declutter the upload and edit screens.
          </p>
        </div>
        <button
          className="btn btn-primary btn-sm d-flex align-items-center gap-2"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <span className="spinner-border spinner-border-sm" />
          ) : (
            <i className="bi bi-check-lg" />
          )}
          Save Types
        </button>
      </div>

      {isWhitelistEmpty && (
        <div className="alert alert-info py-2 small mb-3">
          <i className="bi bi-info-circle me-2" />
          No document types are currently selected. <strong>
            All types
          </strong>{" "}
          will be shown in dropdowns.
        </div>
      )}

      {allDocumentTypes?.length === 0 ? (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4 text-center text-muted">
            No document types exist in the system.
          </div>
        </div>
      ) : (
        <div className="d-flex flex-column gap-4">
          {Object.entries(groupedTypes || {}).map(
            ([seriesId, group]: [string, any]) => {
              const isAllSelected = group.types.every((t: any) =>
                selectedTypes.has(t.id),
              );

              return (
                <div key={seriesId} className="card shadow-sm border-0">
                  <div className="card-header bg-light border-bottom-0 d-flex justify-content-between align-items-center py-3">
                    <h6
                      className="mb-0 fw-bold"
                      style={{ color: "var(--brand)" }}
                    >
                      {group.name}
                    </h6>
                    <button
                      className="btn btn-sm btn-link text-decoration-none p-0"
                      onClick={() =>
                        handleToggleSeries(seriesId, isAllSelected)
                      }
                    >
                      {isAllSelected ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <div className="card-body p-0">
                    <div className="list-group list-group-flush">
                      {group.types.map((type: any) => (
                        <label
                          key={type.id}
                          className="list-group-item d-flex align-items-center gap-3 list-group-item-action border-0 py-3"
                          style={{ cursor: "pointer" }}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input flex-shrink-0 mt-0"
                            style={{ width: "1.2rem", height: "1.2rem" }}
                            checked={selectedTypes.has(type.id)}
                            onChange={() => handleToggle(type.id)}
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2">
                              <span
                                className="rounded-circle d-inline-block"
                                style={{
                                  width: "10px",
                                  height: "10px",
                                  backgroundColor: type.color?.startsWith("#")
                                    ? type.color
                                    : `#${type.color}` || "#ccc",
                                }}
                              />
                              <strong className="mb-0">{type.name}</strong>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
