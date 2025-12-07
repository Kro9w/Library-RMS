import { OwnershipGraph } from "../components/OwnershipGraph";

export function GraphView() {
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Document Ownership Graph</h2>
      </div>
      <p className="text-muted">
        Click on a user node to see their assigned documents. You can drag nodes
        and pan/zoom the canvas. Drag a document node onto a user to transfer
        ownership.
      </p>
      <div className="card" style={{ height: "75vh", overflow: "hidden" }}>
        <OwnershipGraph />
      </div>
    </div>
  );
}
