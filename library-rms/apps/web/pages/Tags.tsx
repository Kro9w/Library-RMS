// /pages/Tags.tsx
export function Tags() {
  // Mock data - replace with tRPC query
  const tags = [
    { id: "tag1", name: "finance" },
    { id: "tag2", name: "urgent" },
    { id: "tag3", name: "report" },
    { id: "tag4", name: "quarterly" },
  ];

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Manage Tags</h1>
        <button className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>Create New Tag
        </button>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Tag Name</th>
            <th className="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tags.map((tag) => (
            <tr key={tag.id}>
              <td>
                <span className="badge bg-primary fs-6">{tag.name}</span>
              </td>
              <td className="text-end">
                <button className="btn btn-sm btn-warning me-2">
                  <i className="bi bi-pencil"></i>
                </button>
                <button className="btn btn-sm btn-danger">
                  <i className="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
