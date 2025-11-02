import React from "react";
import { OwnershipGraph } from "../components/OwnershipGraph";

export function GraphView() {
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Document Ownership Graph</h1>
      </div>
      <p className="text-muted">
        Click on a user node to see their assigned documents. You can drag nodes
        and pan/zoom the canvas. Drag a document node onto a user to transfer
        ownership.
      </p>
      <OwnershipGraph />
    </div>
  );
}
