// apps/web/src/components/OwnershipGraph.tsx
import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import type { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { Link } from "react-router-dom";
import { SendDocumentModal } from "./SendDocumentModal";
import { LoadingAnimation } from "./ui/LoadingAnimation";

type NodeType = "user" | "organization" | "document";

type Node = d3.SimulationNodeDatum & {
  id: string;
  name: string;
  type: NodeType;
  organizationId?: string;
  email?: string;
  color?: string;
};

type Link = d3.SimulationLinkDatum<Node> & { isDetached?: boolean };

type TransferDetails = {
  docNode: Node;
  userNode: Node;
  link: Link;
};

type GraphData = { nodes: Node[]; links: Link[] };
type AppUser = AppRouterOutputs["documents"]["getAllUsers"][0];
type OrgDocument = AppRouterOutputs["documents"]["getAllDocs"][0];
type Org = AppRouterOutputs["documents"]["getAllOrgs"][0];
type UserDocument = AppRouterOutputs["documents"]["getDocumentsByUserId"][0];

const truncateText = (name: string, type: NodeType, maxLength = 10) => {
  if (type !== "document" || name.length <= maxLength) {
    return name;
  }
  return name.substring(0, maxLength) + "...";
};

export function OwnershipGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  const dropTargetNodeRef = useRef<Node | null>(null);

  const [currentView, setCurrentView] = useState<"org" | "doc">("org");
  const [selectedOrg, setSelectedOrg] = useState<
    AppRouterOutputs["user"]["getMe"]["organization"] | null
  >(null);
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [selectedUserNode, setSelectedUserNode] = useState<Node | null>(null);
  const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);

  const [dropTargetNode, setDropTargetNode] = useState<Node | null>(null);

  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const [expandedUserNodeId, setExpandedUserNodeId] = useState<string | null>(
    null
  );

  const utils = trpc.useContext();

  const { data: currentUserData, isLoading: isLoadingCurrentUser } =
    trpc.user.getMe.useQuery();

  const allOrgsQuery = trpc.documents.getAllOrgs.useQuery();
  const allUsersQuery = trpc.documents.getAllUsers.useQuery();
  const allDocsQuery = trpc.documents.getAllDocs.useQuery();

  const { data: documentsData, isLoading: isLoadingDocsForPanel } =
    trpc.documents.getDocumentsByUserId.useQuery(selectedUserNode?.id || "", {
      enabled: !!selectedUserNode,
    });

  useEffect(() => {
    const allUsers = allUsersQuery.data;
    const allDocuments = allDocsQuery.data;
    const allOrgs = allOrgsQuery.data;

    if (currentView === "org" && allOrgs && allUsers) {
      const orgNodes: Node[] = allOrgs.map((org: Org) => ({
        id: org.id,
        name: org.acronym,
        type: "organization",
      }));

      const userNodes: Node[] = allUsers.map((user: AppUser) => ({
        id: user.id,
        name: user.name || user.email || "User",
        type: "user",
        organizationId: user.organizationId ?? undefined,
        email: user.email,
      }));

      const userLinks: Link[] = userNodes.flatMap((userNode) => {
        if (!userNode.organizationId) return [];
        const orgNode = orgNodes.find(
          (org) => org.id === userNode.organizationId
        );
        if (!orgNode) return [];
        return [
          {
            source: userNode,
            target: orgNode,
          } as Link,
        ];
      });

      let finalNodes = [...orgNodes, ...userNodes];
      let finalLinks = [...userLinks];

      if (expandedUserNodeId && allDocuments) {
        const expandedUserNode = userNodes.find(
          (u) => u.id === expandedUserNodeId
        );

        if (expandedUserNode) {
          const userDocs = allDocuments.filter(
            (d: OrgDocument) => d.uploadedById === expandedUserNodeId
          );

          const docNodes: Node[] = userDocs.map((doc: OrgDocument) => ({
            id: doc.id,
            name: doc.title,
            type: "document",
            color: doc.documentType?.color,
          }));

          const docLinks: Link[] = docNodes.map((docNode) => ({
            source: docNode,
            target: expandedUserNode,
          }));

          finalNodes = [...finalNodes, ...docNodes];
          finalLinks = [...finalLinks, ...docLinks];
        }
      }

      setGraphData({
        nodes: finalNodes,
        links: finalLinks,
      });
      setSelectedOrg(null);
    } else if (
      currentView === "doc" &&
      selectedOrg &&
      allUsers &&
      allDocuments
    ) {
      const orgUsers = allUsers.filter(
        (u: { organizationId: any }) => u.organizationId === selectedOrg.id
      );
      const orgDocs = allDocuments.filter(
        (d: OrgDocument) => d.organizationId === selectedOrg.id
      );

      const userNodes: Node[] = orgUsers.map((user: AppUser) => ({
        id: user.id,
        name: user.name || user.email || "User",
        type: "user",
        organizationId: user.organizationId ?? undefined,
        email: user.email,
      }));
      const docNodes: Node[] = orgDocs.map((doc: OrgDocument) => ({
        id: doc.id,
        name: doc.title,
        type: "document",
        color: doc.documentType?.color,
      }));

      const nodes = [...userNodes, ...docNodes];
      const docLinks: Link[] = orgDocs
        .map((doc: OrgDocument) => {
          const sourceNode = nodes.find((n) => n.id === doc.id);
          const targetNode = nodes.find((n) => n.id === doc.uploadedById);
          if (sourceNode && targetNode) {
            return {
              source: sourceNode,
              target: targetNode,
            };
          }
          return null;
        })
        .filter((l: Link | null): l is Link => l !== null);
      setGraphData({
        nodes,
        links: docLinks,
      });
    } else {
      setGraphData({ nodes: [], links: [] });
    }
  }, [
    currentView,
    selectedOrg,
    allOrgsQuery.data,
    allUsersQuery.data,
    allDocsQuery.data,
    expandedUserNodeId,
  ]);

  useEffect(() => {
    if (documentsData) {
      setUserDocuments(documentsData);
    } else {
      setUserDocuments([]);
    }
  }, [documentsData]);

  const closeDetailsPanel = () => {
    setSelectedUserNode(null);
    d3.selectAll(".node-circle.selected").classed("selected", false);
  };

  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return;
    event.stopPropagation();

    if (d.type === "organization") {
      const orgData = allOrgsQuery.data?.find(
        (org: { id: string }) => org.id === d.id
      );
      if (orgData) {
        setSelectedOrg(orgData as any);
        setCurrentView("doc");
        setExpandedUserNodeId(null);
        closeDetailsPanel();
      }
    } else if (d.type === "user" && currentView === "org") {
      if (expandedUserNodeId === d.id) {
        setExpandedUserNodeId(null);
      } else {
        setExpandedUserNodeId(d.id);
      }
      closeDetailsPanel();
    } else if (d.type === "user" && currentView === "doc") {
      setSelectedUserNode(d);
      setExpandedUserNodeId(null);
      d3.selectAll(".node-circle.selected").classed("selected", false);
      d3.select(event.currentTarget as SVGGElement)
        .select(".node-circle")
        .classed("selected", true);
    } else {
      closeDetailsPanel();
    }
  };

  const handleBackClick = () => {
    setCurrentView("org");
    setSelectedOrg(null);
    setExpandedUserNodeId(null);
    closeDetailsPanel();
  };

  useEffect(() => {
    const svgElement = svgRef.current;
    if (graphData.nodes.length === 0 || !svgElement?.parentElement) {
      const svg = d3.select(svgElement);
      svg.selectAll("*").remove();
      simulationRef.current?.stop();
      simulationRef.current = null;
      gRef.current = null;
      return;
    }

    const nodes = graphData.nodes;
    const links = graphData.links;

    const width = svgElement.parentElement.clientWidth;
    const height = svgElement.parentElement.clientHeight;
    const svg = d3.select(svgElement);

    if (!simulationRef.current) {
      svg.attr("width", width).attr("height", height);
      svg.selectAll("*").remove();

      const defs = svg.append("defs");
      const filter = defs.append("filter").attr("id", "gooey");
      filter
        .append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", "8")
        .attr("result", "blur");
      filter
        .append("feColorMatrix")
        .attr("in", "blur")
        .attr("mode", "matrix")
        .attr("values", "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -9")
        .attr("result", "goo");
      filter.append("feBlend").attr("in", "SourceGraphic").attr("in2", "goo");

      const g = svg.append("g");
      gRef.current = g;

      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");
      g.append("g")
        .attr("class", "gooey-container")
        .style("filter", "url(#gooey)");

      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 5])
        .on("start", () => svg.classed("grabbing", true))
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        })
        .on("end", () => svg.classed("grabbing", false));
      svg.call(zoomBehavior).on("dblclick.zoom", null);

      const simulation = d3
        .forceSimulation<Node, Link>()
        .force(
          "link",
          d3.forceLink<Node, Link>([]).id((d: any) => d.id)
        )
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide());

      simulationRef.current = simulation;

      simulation.on("tick", () => {
        g.selectAll<SVGLineElement, Link>(".link")
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        g.selectAll<SVGGElement, Node>(".node").attr(
          "transform",
          (d: any) => `translate(${d.x},${d.y})`
        );
      });
    }

    const simulation = simulationRef.current;
    const g = gRef.current;
    if (!g) return;

    simulation
      .force<d3.ForceLink<Node, Link>>("link")
      ?.distance((l: any) => {
        if (l.source.type === "user" && l.target.type === "organization") {
          return 100;
        }
        if (l.source.type === "document" && l.target.type === "user") {
          return 70;
        }
        return currentView === "org" ? 100 : 70;
      })
      .strength(0.6);

    simulation
      .force<d3.ForceManyBody<Node>>("charge")
      ?.strength((d: d3.SimulationNodeDatum) => {
        const node = d as Node;
        if ((node as any)._isDragging) return 0;
        if (currentView === "org") {
          if (node.type === "organization") return -1;
          if (node.type === "user") return -1;
          return 10;
        } else {
          if (node.type === "document") return 0;
          if (node.type === "user") return -50;
          return -50;
        }
      });

    simulation
      .force<d3.ForceCollide<Node>>("collide")
      ?.radius((d: any) => {
        if ((d as Node).type === "organization") return 45;
        if ((d as Node).type === "user") return 30;
        return 20;
      })
      .strength(0.4);

    const link = g
      .select(".links")
      .selectAll<SVGLineElement, Link>("line.link")
      .data(links, (d: any) => `${d.source.id}-${d.target.id}`);

    link.exit().remove();

    const linkEnter = link.enter().append("line").attr("class", "link");

    const linkMerge = link.merge(linkEnter);

    linkMerge.classed("link-detached", (d) => !!d.isDetached);

    const node = g
      .select(".nodes")
      .selectAll<SVGGElement, Node>("g.node")
      .data(nodes, (d: any) => d.id);

    node.exit().remove();

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("data-id", (d) => d.id)
      .style("cursor", (d: any) => {
        const n = d as Node;
        if (n.type === "organization") return "pointer";
        if (n.type === "user") return "pointer";
        if (n.type === "document") return "grab";
        return "default";
      })
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      )
      .on("click", (event, d: any) => handleNodeClick(event, d as Node))
      .on("mouseover", function (_event, d: any) {
        d3.select(this).raise();
        d3.select(this)
          .select("text")
          .text((d as Node).name);
      })
      .on("mouseout", function (_event, d: any) {
        d3.select(this)
          .select("text")
          .text(truncateText((d as Node).name, (d as Node).type));
      });

    nodeEnter
      .append("circle")
      .attr("r", (d: any) => {
        if ((d as Node).type === "organization") return 35;
        if ((d as Node).type === "user") return 25;
        return 12;
      })
      .attr("class", (d: any) => `node-circle ${(d as Node).type}`)
      .style("fill", (d: any) => {
        if ((d as Node).type === "document" && d.color) {
          return `#${d.color}`;
        }
        return null;
      });

    nodeEnter
      .append("text")
      .text((d: any) => truncateText((d as Node).name, (d as Node).type))
      .attr("x", (d: any) => {
        const node = d as Node;
        if (node.type === "organization") return 40;
        if (node.type === "user") return 30;
        if (node.type === "document") return 15;
        return 30;
      })
      .attr("y", 5)
      .attr("class", "node-label");

    const nodeMerge = node.merge(nodeEnter);

    nodeMerge
      .select<SVGCircleElement>(".node-circle")
      .classed("selected", (d: any) => d.id === selectedUserNode?.id)
      .classed("expanded", (d: any) => d.id === expandedUserNodeId);

    nodeMerge
      .select<SVGTextElement>("text")
      .text((d: any) => truncateText((d as Node).name, (d as Node).type));

    simulation.nodes(nodes);
    const activeLinks = links.filter((l) => !l.isDetached);
    simulation.force<d3.ForceLink<Node, Link>>("link")?.links(activeLinks);
    simulation.alpha(0.3).restart();

    function dragstarted(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      event.sourceEvent.stopPropagation();
      if (!event.active) simulation.alphaTarget(0.1).restart();

      (d as any)._isDragging = true;
      d.fx = d.x;
      d.fy = d.y;

      const node = d as Node;
      if (node.type !== "document" || !currentUserData) return;

      const linkData = graphData.links.find(
        (l) => (l.source as Node).id === d.id
      );
      if (!linkData) return;

      const ownerNode = linkData.target as Node;
      if (ownerNode.id !== currentUserData.id) return;

      linkData.isDetached = true;
      (d as any)._activeLink = linkData;

      setGraphData({ ...graphData });
      simulation.alpha(0.1).restart();
      d3.select(event.sourceEvent.currentTarget).raise();
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      d.fx = event.x;
      d.fy = event.y;

      const activeLink = (d as any)._activeLink;
      if (!activeLink) return;

      let target: Node | null = null;
      const threshold = 80;
      const originalOwnerId = (activeLink.target as Node).id;

      for (const u of nodes) {
        if (u.type !== "user" || u.id === originalOwnerId) continue;
        if (!u.x || !u.y || !d.fx || !d.fy) continue;
        const dx = u.x - d.fx;
        const dy = u.y - d.fy;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < threshold) {
          target = u;
          break;
        }
      }

      const isNearTarget = target !== null;
      if (!g) return;

      const docNodeElement = g.selectAll<SVGGElement, Node>(
        `g.node[data-id='${d.id}']`
      );
      const targetNodeElement = g.selectAll<SVGGElement, Node>(
        `g.node[data-id='${target?.id}']`
      );

      if (
        isNearTarget &&
        !docNodeElement.empty() &&
        !targetNodeElement.empty()
      ) {
        if (g.select(".tether").empty()) {
          d3.select(".gooey-container").append(() => docNodeElement.node());
          d3.select(".gooey-container").append(() => targetNodeElement.node());
          d3.select(".gooey-container")
            .append("line")
            .attr("class", "tether")
            .attr("x1", d.x)
            .attr("y1", d.y)
            .attr("x2", target?.x || 0)
            .attr("y2", target?.y || 0);
        } else {
          g.select(".tether")
            .attr("x1", d.x)
            .attr("y1", d.y)
            .attr("x2", target?.x || 0)
            .attr("y2", target?.y || 0);
        }
        docNodeElement
          .select(".node-circle")
          .classed("armed-for-drop", true)
          .classed("drop-magnet", true);
        targetNodeElement.select(".node-circle").classed("drop-magnet", true);

        simulation.force(
          "magnet",
          d3
            .forceLink([
              { source: d, target: target } as d3.SimulationLinkDatum<Node>,
            ])
            .strength(0.8)
            .distance(20)
        );
      } else {
        g?.selectAll(".gooey-container g.node").each(function () {
          g?.select(".nodes").append(() => this);
        });
        g.select(".tether").remove();
        d3.selectAll(".node-circle.drop-magnet").classed("drop-magnet", false);
        d3.selectAll(".node-circle.armed-for-drop").classed(
          "armed-for-drop",
          false
        );
        simulation.force("magnet", null);
      }

      dropTargetNodeRef.current = target;
      setDropTargetNode(target);
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, any, any>, d: any) {
      if (!event.active) simulation.alphaTarget(0);

      (d as any)._isDragging = false;
      d.fx = null;
      d.fy = null;

      const targetUser = dropTargetNodeRef.current;
      const draggedDoc = d as Node;
      const activeLink = (d as any)._activeLink;

      if (targetUser && draggedDoc.type === "document" && activeLink) {
        setSelectedDocId(draggedDoc.id);
        setTargetUserId(targetUser.id);
        setIsSendModalOpen(true);
      } else if (activeLink) {
        activeLink.isDetached = false;
        setGraphData({ ...graphData });
        simulation.alpha(0.1).restart();
      }

      (d as any)._activeLink = null;
      dropTargetNodeRef.current = null;
      setDropTargetNode(null);
      d3.selectAll(".node-circle.armed-for-drop").classed(
        "armed-for-drop",
        false
      );
      g?.selectAll(".gooey-container g.node").each(function () {
        g?.select(".nodes").append(() => this);
      });
      g?.select(".tether").remove();
      d3.selectAll(".node-circle.drop-magnet").classed("drop-magnet", false);
      simulation.force("magnet", null);
    }
  }, [
    graphData,
    currentView,
    selectedUserNode,
    currentUserData,
    expandedUserNodeId,
    handleNodeClick,
  ]);

  useEffect(() => {
    return () => {
      simulationRef.current?.stop();
      simulationRef.current = null;
      gRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll(".node-circle.user")
      .classed("drop-target", (d: any) => d.id === dropTargetNode?.id);
  }, [dropTargetNode]);

  const isLoading =
    isLoadingCurrentUser ||
    allOrgsQuery.isLoading ||
    allUsersQuery.isLoading ||
    allDocsQuery.isLoading;
  const isError =
    allOrgsQuery.isError || allUsersQuery.isError || allDocsQuery.isError;
  const error = allOrgsQuery.error || allUsersQuery.error || allDocsQuery.error;

  if (isLoading) return <LoadingAnimation />;
  if (isError)
    return (
      <div className="graph-status-message error">Error: {error?.message}</div>
    );

  return (
    <div className="graph-container">
      <div className="graph-canvas-wrapper">
        {currentView === "doc" && (
          <button
            className="btn-icon btn-back"
            onClick={handleBackClick}
            title="Go Back"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
        )}
        <svg ref={svgRef}></svg>
      </div>
      <div
        className={`details-panel ${
          selectedUserNode && currentView === "doc" ? "visible" : ""
        }`}
      >
        {selectedUserNode && (
          <>
            <div className="d-flex justify-content-between align-items-center">
              <h4>Documents for {selectedUserNode.name}</h4>
              <button
                className="btn-close"
                onClick={closeDetailsPanel}
              ></button>
            </div>
            <hr />
            {isLoadingDocsForPanel ? (
              <LoadingAnimation />
            ) : userDocuments.length > 0 ? (
              <ul className="list-group">
                {userDocuments.map((doc: UserDocument) => (
                  <li key={doc.id} className="list-group-item">
                    <Link to={`/documents/${doc.id}`}>{doc.title}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No documents uploaded by this user.</p>
            )}
          </>
        )}
      </div>

      {selectedDocId && (
        <SendDocumentModal
          show={isSendModalOpen}
          onClose={() => {
            setIsSendModalOpen(false);
            setTargetUserId(null);
            const linkData = graphData.links.find(
              (l) => (l.source as Node).id === selectedDocId
            );
            if (linkData) {
              linkData.isDetached = false;
              setGraphData({ ...graphData });
              simulationRef.current?.alpha(0.1).restart();
            }
          }}
          documentId={selectedDocId}
          initialRecipientId={targetUserId}
        />
      )}
    </div>
  );
}
