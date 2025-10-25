// apps/web/src/components/OwnershipGraph.tsx
import React, { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
// 1. ADDED: Import the tRPC output types
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";

// Define the shape of our data, now including 'document' type
type Node = { id: string; name: string; type: "user" | "office" | "document" };
type Link = { source: string; target: string };
type GraphData = { nodes: Node[]; links: Link[] };

// 2. REPLACED: Old types with new inferred types
type AppUser = AppRouterOutputs["documents"]["getAppUsers"][0];
type OrgDocument = AppRouterOutputs["documents"]["getDocuments"][0];
type UserDocument = AppRouterOutputs["documents"]["getDocumentsByUserId"][0];

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const transformRef = useRef<d3.ZoomTransform | null>(null);
  const [currentView, setCurrentView] = useState<"org" | "doc">("org");
  const [orgGraphData, setOrgGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [docGraphData, setDocGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [selectedUser, setSelectedUser] = useState<Node | null>(null);
  // 3. UPDATED: State to use the new UserDocument type
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);

  // 4. REPLACED: 'trpc.getUsers' with 'trpc.documents.getAppUsers'
  const {
    data: users,
    isLoading: isLoadingUsers,
    isError: isUsersError,
    error: usersError,
  } = trpc.documents.getAppUsers.useQuery();

  // 5. REPLACED: 'trpc.getAllDocumentsWithHolder' with 'trpc.documents.getDocuments'
  const {
    data: allDocuments,
    isLoading: isLoadingAllDocs,
    isError: isAllDocsError,
    error: allDocsError,
  } = trpc.documents.getDocuments.useQuery();

  // 6. REPLACED: 'trpc.getDocumentsHeldByUser' with 'trpc.documents.getDocumentsByUserId'
  const { data: documentsData, isLoading: isLoadingDocs } =
    trpc.documents.getDocumentsByUserId.useQuery(selectedUser?.id || "", {
      enabled: !!selectedUser,
    });

  // Effect to build the two different graph data structures
  useEffect(() => {
    if (users && users.length > 0) {
      // 1. Build Organization-Members graph data
      const orgNodes: Node[] = [{ id: "office", name: "LRC", type: "office" }];
      // 7. FIXED: 'any' error by typing 'user' and using 'user.name'
      users.forEach((user: AppUser) => {
        orgNodes.push({
          id: user.id,
          name: user.name || user.email || "User",
          type: "user",
        });
      });
      // 8. FIXED: 'any' error by typing 'user'
      const orgLinks: Link[] = users.map((user: AppUser) => ({
        source: user.id,
        target: "office",
      }));
      setOrgGraphData({ nodes: orgNodes, links: orgLinks });

      // 2. Build Members-Documents graph data
      if (allDocuments) {
        // 9. FIXED: 'any' error by typing 'user' and using 'user.name'
        const userNodes: Node[] = users.map((user: AppUser) => ({
          id: user.id,
          name: user.name || user.email || "User",
          type: "user",
        }));
        // 10. FIXED: 'any' error by typing 'doc'
        const docNodes: Node[] = allDocuments.map((doc: OrgDocument) => ({
          id: doc.id,
          name: doc.title, // Use document title for the name
          type: "document",
        }));
        // 11. FIXED: 'any' error by typing 'doc' and using 'doc.uploadedById'
        const docLinks: Link[] = allDocuments.map((doc: OrgDocument) => ({
          source: doc.id, // Link from document...
          target: doc.uploadedById, // ...to the user who uploaded it
        }));
        setDocGraphData({
          nodes: [...userNodes, ...docNodes],
          links: docLinks,
        });
      }
    }
  }, [users, allDocuments]);

  // Effect to update the documents in the side panel
  useEffect(() => {
    if (documentsData) {
      setUserDocuments(documentsData);
    }
  }, [documentsData]);

  const closeDetailsPanel = () => {
    setSelectedUser(null);
    d3.selectAll(".node-circle").classed("selected", false);
  };

  // Main D3 rendering effect (no changes in this section)
  useEffect(() => {
    const data = currentView === "org" ? orgGraphData : docGraphData;
    if (data.nodes.length === 0 || !svgRef.current?.parentElement) return;

    const { nodes, links } = data;
    const width = svgRef.current.parentElement.clientWidth;
    const height = svgRef.current.parentElement.clientHeight;
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);
    svg.selectAll("*").remove(); // Clear SVG for redraw

    const g = svg.append("g");
    const zoomThreshold = 2.0;

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 8])
      .on("start", () => svg.classed("grabbing", true))
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        transformRef.current = event.transform;

        if (event.transform.k > zoomThreshold && currentView !== "doc") {
          setCurrentView("doc");
        } else if (
          event.transform.k <= zoomThreshold &&
          currentView !== "org"
        ) {
          setCurrentView("org");
        }
      })
      .on("end", () => svg.classed("grabbing", false));

    svg.call(zoomBehavior).on("dblclick.zoom", null);

    if (transformRef.current) {
      const newTransform = d3.zoomIdentity
        .translate(transformRef.current.x, transformRef.current.y)
        .scale(1.0);
      svg.call(zoomBehavior.transform, newTransform);
      transformRef.current = newTransform;
    }

    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(currentView === "org" ? 150 : 80)
      )
      .force(
        "charge",
        d3.forceManyBody().strength(currentView === "org" ? -400 : -100)
      )
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
      .attr("r", (d) => {
        if (d.type === "office") return 25;
        if (d.type === "user") return 20;
        return 10;
      })
      .attr("class", (d) => `node-circle ${d.type}`);

    node
      .append("text")
      .text((d) => d.name)
      .attr("x", 26)
      .attr("y", 5);

    node.on("click", (event, d) => {
      event.stopPropagation();
      if (d.type === "user") {
        setSelectedUser(d);
        d3.selectAll(".node-circle").classed("selected", false);
        d3.select(event.currentTarget)
          .select(".node-circle")
          .classed("selected", true);
      } else {
        closeDetailsPanel();
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
  }, [currentView, orgGraphData, docGraphData]); // Redraw when view or data changes

  const isLoading = isLoadingUsers || isLoadingAllDocs;
  const isError = isUsersError || isAllDocsError;
  const error = usersError || allDocsError;

  if (isLoading)
    return <div className="graph-status-message">Loading graph data...</div>;
  if (isError)
    return (
      <div className="graph-status-message error">Error: {error?.message}</div>
    );
  if (!users || users.length === 0) {
    return (
      <div className="graph-status-message">
        <h4>No Users Found</h4>
        <p className="text-muted">Add users to see them in the graph.</p>
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
                {/* 12. FIXED: 'any' error by typing 'doc' */}
                {userDocuments.map((doc: UserDocument) => (
                  <li key={doc.id} className="list-group-item">
                    {doc.title}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No documents uploaded by this user.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
