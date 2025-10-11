import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";

// Define the shape of our data for clarity
type Node = { id: string; name: string; type: "user" | "office" };
type Link = { source: string; target: string };
type GraphData = { nodes: Node[]; links: Link[] };
type Document = { id: string; title: string };

// This type now matches the simplified structure from our tRPC API
type User = {
  id: string;
  firstName: string | null;
  email: string | undefined;
};

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);

  // Directly get the 'users' array from the useQuery hook
  const { data: users, isLoading, isError, error } = trpc.getUsers.useQuery();

  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedUser, setSelectedUser] = useState<Node | null>(null);
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const { data: documentsData, isLoading: isLoadingDocs } =
    trpc.getDocumentsByUserId.useQuery(selectedUser?.id || "", {
      enabled: !!selectedUser,
    });

  useEffect(() => {
    if (users && users.length > 0) {
      const nodes: Node[] = [{ id: "office", name: "LRC", type: "office" }];

      // Use the new, simplified User type
      users.forEach((user: User) => {
        nodes.push({
          id: user.id,
          // Use the correct properties for the user's name
          name: user.firstName || user.email || "User",
          type: "user",
        });
      });

      // Use the new, simplified User type here as well
      const links: Link[] = users.map((user: User) => ({
        source: user.id,
        target: "office",
      }));

      setGraphData({ nodes, links });
    }
  }, [users]);

  useEffect(() => {
    if (documentsData) {
      setUserDocuments(documentsData);
    }
  }, [documentsData]);

  const closeDetailsPanel = () => {
    setSelectedUser(null);
    d3.selectAll(".node-circle").classed("selected", false);
  };

  useEffect(() => {
    if (graphData && svgRef.current) {
      const { nodes, links } = graphData;
      if (!svgRef.current.parentElement) return;

      const width = svgRef.current.parentElement.clientWidth;
      const height = svgRef.current.parentElement.clientHeight;

      const svg = d3
        .select(svgRef.current)
        .attr("width", width)
        .attr("height", height);

      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .on("start", () => svg.classed("grabbing", true))
        .on("zoom", (event) => g.attr("transform", event.transform))
        .on("end", () => svg.classed("grabbing", false));

      svg.call(zoomBehavior).on("dblclick.zoom", null);

      svg.on("click", (event) => {
        if (event.target === svg.node()) {
          closeDetailsPanel();
        }
      });

      svg.selectAll("*").remove();
      const g = svg.append("g");

      const simulation = d3
        .forceSimulation(nodes as d3.SimulationNodeDatum[])
        .force(
          "link",
          d3
            .forceLink(links)
            .id((d: any) => d.id)
            .distance(150)
        )
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = g
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter()
        .append("line");
      const node = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(nodes)
        .enter()
        .append("g")
        .call(
          d3
            .drag<SVGGElement, any>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

      node
        .append("circle")
        .attr("r", (d) => (d.type === "office" ? 20 : 15))
        .attr("class", (d) => `node-circle ${d.type}`);
      node
        .append("text")
        .text((d) => d.name)
        .attr("x", 22)
        .attr("y", 5);

      node.on("click", (event, d) => {
        event.stopPropagation();
        if (d.type === "user") {
          setSelectedUser(d);
          d3.selectAll(".node-circle").classed("selected", false);
          d3.select(event.currentTarget)
            .select(".node-circle")
            .classed("selected", true);
        }
      });

      simulation.on("tick", () => {
        link
          .attr("x1", (d) => (d.source as any).x)
          .attr("y1", (d) => (d.source as any).y)
          .attr("x2", (d) => (d.target as any).x)
          .attr("y2", (d) => (d.target as any).y);
        node.attr(
          "transform",
          (d) => `translate(${(d as any).x},${(d as any).y})`
        );
      });

      function dragstarted(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event: any, d: any) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event: any, d: any) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }
    }
  }, [graphData]);

  if (isLoading)
    return <div className="graph-status-message">Loading user data...</div>;
  if (isError)
    return (
      <div className="graph-status-message error">Error: {error.message}</div>
    );
  if (!users || users.length === 0) {
    return (
      <div className="graph-status-message">
        <h4>No Users Found</h4>
        <p className="text-muted">
          Add users in your Clerk dashboard to see them in the graph.
        </p>
      </div>
    );
  }

  return (
    <div className="graph-container">
      <div className="graph-canvas-wrapper">
        <svg ref={svgRef}></svg>
      </div>
      <div className={`details-panel ${selectedUser ? "visible" : ""}`}>
        {selectedUser && (
          <>
            <div className="d-flex justify-content-between align-items-center">
              <h4>Documents for {selectedUser.name}</h4>
              <button
                className="btn-close"
                onClick={closeDetailsPanel}
              ></button>
            </div>
            <hr />
            {isLoadingDocs ? (
              <p>Loading documents...</p>
            ) : userDocuments.length > 0 ? (
              <ul className="list-group">
                {userDocuments.map((doc) => (
                  <li key={doc.id} className="list-group-item">
                    {doc.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No documents assigned to this user.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
