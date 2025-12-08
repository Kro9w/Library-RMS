import { OwnershipGraph } from "../components/OwnershipGraph";

export function GraphView() {
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Document Ownership Graph</h2>
      </div>
      <div className="card" style={{ height: "75vh", overflow: "hidden" }}>
        <OwnershipGraph />
      </div>
    </div>
  );
}
