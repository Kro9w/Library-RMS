// apps/web/src/components/OwnershipGraph.tsx
import { useRef, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import * as d3 from "d3";
import { trpc } from "../trpc";
import "./OwnershipGraph.css";
import { LoadingAnimation } from "./ui/LoadingAnimation";
import { FileIcon } from "./FileIcon";
import type { Node, LinkData, NodeType } from "../types/graph";

const truncateText = (name: string, type: NodeType, maxLength = 15) => {
  if (type !== "document" && name.length > maxLength) {
    return name.substring(0, maxLength) + "...";
  }
  return name;
};

const generateAcronym = (name: string) => {
  if (!name) return "";
  const ignoredWords = ["of", "and", "the", "in", "for", "at", "to"];
  const words = name.split(/[\s,.-]+/);
  return words
    .filter((w) => w.length > 0 && !ignoredWords.includes(w.toLowerCase()))
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
};

export function OwnershipGraph() {
  const [searchParams] = useSearchParams();
  const targetUserIdParam = searchParams.get("targetUserId");
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, LinkData> | null>(null);
  const gRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null);

  // --- State ---
  const [graphData, setGraphData] = useState<{
    nodes: Node[];
    links: LinkData[];
  }>({ nodes: [], links: [] });
  const [viewStack, setViewStack] = useState<Node[]>([]);
  const [selectedUserNode, setSelectedUserNode] = useState<Node | null>(null);
  const [userDocuments, setUserDocuments] = useState<any[]>([]);

  // Binder State
  const [activeTab, setActiveTab] = useState<"directory" | "details">(
    "directory",
  );
  const [isBinderOpen, setIsBinderOpen] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: currentUserData, isLoading: isLoadingCurrentUser } =
    trpc.user.getMe.useQuery();
  const {
    data: institutionHierarchy,
    isLoading: isLoadingHierarchy,
    isError,
    error,
  } = trpc.user.getInstitutionHierarchy.useQuery(undefined, {
    staleTime: 60000,
  });

  // O(1) Lookup Maps
  const { userMap } = useMemo(() => {
    const uMap = new Map<string, any>();
    const dMap = new Map<string, any>();
    const users: any[] = [];

    if (institutionHierarchy) {
      for (const c of institutionHierarchy.campuses) {
        for (const d of c.departments) {
          dMap.set(d.id, d);
          for (const u of d.users) {
            uMap.set(u.id, u);
            users.push({ ...u, institutionId: institutionHierarchy.id });
          }
        }
      }
    }
    return { userMap: uMap, deptMap: dMap, allUsers: users };
  }, [institutionHierarchy]);

  const isDocumentView =
    viewStack.length > 0 && viewStack[viewStack.length - 1].type === "user";

  // --- 1. INITIAL STATE ---
  useEffect(() => {
    if (institutionHierarchy && currentUserData && viewStack.length === 0) {
      const orgNode: Node = {
        id: institutionHierarchy.id,
        name: institutionHierarchy.acronym,
        type: "institution",
      };

      const initialStack: Node[] = [orgNode];
      const initialExpanded = new Set<string>();
      let targetFound = false;

      if (targetUserIdParam) {
        for (const campus of institutionHierarchy.campuses) {
          for (const dept of campus.departments) {
            const user = dept.users.find(
              (u: any) => u.id === targetUserIdParam,
            );
            if (user) {
              targetFound = true;
              initialExpanded.add(campus.id);
              initialExpanded.add(dept.id);

              const campusNode: Node = {
                id: campus.id,
                name: campus.name,
                type: "campus",
                parentId: institutionHierarchy.id,
                color: "var(--brand)",
              };
              initialStack.push(campusNode);

              const deptNode: Node = {
                id: dept.id,
                name: dept.name,
                type: "department",
                parentId: campus.id,
                color: "var(--brand)",
              };
              initialStack.push(deptNode);

              const name = !user.firstName
                ? user.email || "User"
                : `${user.firstName}, ${user.lastName ? user.lastName.charAt(0) : ""}.`;

              const userNode: Node = {
                id: user.id,
                name: name,
                type: "user",
                parentId: dept.id,
                email: user.email,
              };
              initialStack.push(userNode);
              setSelectedUserNode(userNode);
              setActiveTab("details");
              setIsBinderOpen(true);
              break;
            }
          }
          if (targetFound) break;
        }
      }

      if (!targetFound && currentUserData.campusId) {
        initialExpanded.add(currentUserData.campusId);

        const campus = institutionHierarchy.campuses.find(
          (c: any) => c.id === currentUserData.campusId,
        );
        if (campus) {
          const campusNode: Node = {
            id: campus.id,
            name: campus.name,
            type: "campus",
            parentId: institutionHierarchy.id,
            color: "var(--brand)",
          };
          initialStack.push(campusNode);

          if (currentUserData.departmentId) {
            initialExpanded.add(currentUserData.departmentId);

            const dept = campus.departments.find(
              (d: any) => d.id === currentUserData.departmentId,
            );

            if (dept) {
              const deptNode: Node = {
                id: dept.id,
                name: dept.name,
                type: "department",
                parentId: campus.id,
                color: "var(--brand)",
              };
              initialStack.push(deptNode);

              const user = dept.users.find(
                (u: any) => u.id === currentUserData.id,
              );

              if (user) {
                const name = !user.firstName
                  ? user.email || "User"
                  : `${user.firstName}, ${user.lastName ? user.lastName.charAt(0) : ""}.`;

                const userNode: Node = {
                  id: user.id,
                  name: name,
                  type: "user",
                  parentId: dept.id,
                  email: user.email,
                };
                initialStack.push(userNode);
                setSelectedUserNode(userNode);
                setActiveTab("details");
                setIsBinderOpen(true);
              }
            }
          }
        }
      }

      setViewStack(initialStack);
      setExpandedIds(initialExpanded);
    }
  }, [institutionHierarchy, currentUserData, targetUserIdParam]);

  // --- Compute Graph Data Synchronously ---
  useEffect(() => {
    if (!institutionHierarchy || viewStack.length === 0) {
      setGraphData({ nodes: [], links: [] });
      return;
    }

    const currentRoot = viewStack[viewStack.length - 1];
    const nodes: Node[] = [];
    const links: LinkData[] = [];

    const rootNodeForGraph: Node = {
      ...currentRoot,
      vx: 0,
      vy: 0,
      fx: undefined,
      fy: undefined,
    };
    nodes.push(rootNodeForGraph);

    const addNode = (n: Node) => {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 50 + Math.random() * 100;
      n.x = Math.cos(angle) * radius;
      n.y = Math.sin(angle) * radius;
      nodes.push(n);
    };

    if (currentRoot.type === "institution") {
      institutionHierarchy.campuses.forEach((c: any) => {
        addNode({
          id: c.id,
          name: c.name,
          type: "campus",
          parentId: currentRoot.id,
          color: "var(--brand)",
        });
      });
    } else if (currentRoot.type === "campus") {
      const campus = institutionHierarchy.campuses.find(
        (c: any) => c.id === currentRoot.id,
      );
      if (campus) {
        campus.departments.forEach((d: any) => {
          addNode({
            id: d.id,
            name: d.name,
            type: "department",
            parentId: currentRoot.id,
            color: "var(--brand)",
          });
        });
      }
    } else if (currentRoot.type === "department") {
      const campus = institutionHierarchy.campuses.find(
        (c: any) => c.id === viewStack[viewStack.length - 2]?.id,
      );
      if (campus) {
        const dept = campus.departments.find(
          (d: any) => d.id === currentRoot.id,
        );
        if (dept) {
          dept.users.forEach((u: any) => {
            const first = u.firstName;
            const last = u.lastName;
            const name = !first
              ? u.email || "User"
              : `${first}, ${last ? last.charAt(0) : ""}.`;
            addNode({
              id: u.id,
              name: name,
              type: "user",
              parentId: currentRoot.id,
              email: u.email,
            });
          });
        }
      }
    } else if (currentRoot.type === "user") {
      const user = userMap.get(currentRoot.id);
      if (user) {
        user.documents.forEach((doc: any) => {
          addNode({
            id: doc.id,
            name: doc.title,
            type: "document",
            parentId: user.id,
            uploadedById: user.id,
            color: doc.documentType?.color,
          });
        });
      }
    }

    nodes.forEach((n) => {
      if (n.id !== currentRoot.id) {
        links.push({
          source: rootNodeForGraph.id,
          target: n.id,
        });
      }
    });

    setGraphData({ nodes, links });
  }, [institutionHierarchy, viewStack, userMap]);

  // --- Event Handlers ---
  const handleNodeClick = (event: MouseEvent, d: Node) => {
    if (event.defaultPrevented) return;
    event.stopPropagation();

    const isRootUser = viewStack[viewStack.length - 1]?.type === "user";
    if (
      isRootUser &&
      d.type === "user" &&
      viewStack[viewStack.length - 1].id !== d.id
    ) {
      return;
    }

    const stackIndex = viewStack.findIndex((n) => n.id === d.id);
    if (stackIndex !== -1) {
      if (stackIndex === viewStack.length - 1) return;
      const newStack = viewStack.slice(0, stackIndex + 1);
      setViewStack(newStack);
      if (d.type !== "user") setSelectedUserNode(null);
      return;
    }

    if (d.type === "campus" || d.type === "department" || d.type === "user") {
      setViewStack((prev) => {
        if (prev[prev.length - 1]?.id === d.id) return prev;
        return [...prev, d];
      });

      if (d.type === "user") {
        setSelectedUserNode(d);
        setActiveTab("details");
        setIsBinderOpen(true);
      } else {
        setSelectedUserNode(null);
      }
    }
  };

  const handleBack = () => {
    if (viewStack.length > 1) {
      const newStack = viewStack.slice(0, viewStack.length - 1);
      setViewStack(newStack);
      const newRoot = newStack[newStack.length - 1];
      if (newRoot.type !== "user") {
        setSelectedUserNode(null);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newStack = viewStack.slice(0, index + 1);
    setViewStack(newStack);
    const newRoot = newStack[newStack.length - 1];
    if (newRoot.type !== "user") setSelectedUserNode(null);
  };

  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleTabClick = (tab: "directory" | "details") => {
    if (activeTab === tab) {
      setIsBinderOpen(!isBinderOpen);
    } else {
      setActiveTab(tab);
      setIsBinderOpen(true);
    }
  };

  useEffect(() => {
    if (selectedUserNode && userMap.size > 0) {
      const u = userMap.get(selectedUserNode.id);
      setUserDocuments(u ? u.documents : []);
    } else {
      setUserDocuments([]);
    }
  }, [selectedUserNode, userMap]);

  // --- D3 Simulation (Simplified Read-Only Graph) ---
  useEffect(() => {
    const svgElement = svgRef.current;
    if (graphData.nodes.length === 0 || !svgElement?.parentElement) {
      const svg = d3.select(svgElement);
      svg.selectAll("*").remove();
      simulationRef.current?.stop();
      return;
    }

    const { nodes, links } = graphData;
    const width = svgElement.parentElement.clientWidth;
    const height = svgElement.parentElement.clientHeight;
    const svg = d3.select(svgElement);

    if (!gRef.current) {
      svg.attr("width", width).attr("height", height);
      const g = svg.append("g");
      gRef.current = g;
      g.append("g").attr("class", "links");
      g.append("g").attr("class", "nodes");

      const zoomBehavior = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 5])
        .filter((event) => {
          // Prevent zoom from catching drag events on nodes
          if (
            (event.type === "mousedown" || event.type === "touchstart") &&
            event.target.tagName !== "svg"
          ) {
            return false;
          }
          return !event.ctrlKey && !event.button;
        })
        .on("start", () => svg.classed("grabbing", true))
        .on("zoom", (event) => g.attr("transform", event.transform))
        .on("end", () => svg.classed("grabbing", false));
      svg.call(zoomBehavior).on("dblclick.zoom", null);
    }

    if (!simulationRef.current) {
      simulationRef.current = d3
        .forceSimulation<Node, LinkData>()
        .force(
          "link",
          d3.forceLink<Node, LinkData>().id((d: any) => d.id),
        )
        .force("charge", d3.forceManyBody())
        .force("collide", d3.forceCollide())
        .force("center", d3.forceCenter(width / 2, height / 2));

      simulationRef.current.on("tick", () => {
        const g = gRef.current;
        if (!g) return;
        g.selectAll<SVGLineElement, LinkData>(".link")
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        g.selectAll<SVGGElement, Node>(".node").attr(
          "transform",
          (d: any) => `translate(${d.x},${d.y})`,
        );
      });
    }

    const simulation = simulationRef.current;

    const centerX = width / 2;
    const centerY = height / 2;

    const oldNodes = new Map<string, Node>();
    if (simulationRef.current) {
      simulationRef.current.nodes().forEach((n) => {
        oldNodes.set(n.id, n);
      });
    }

    nodes.forEach((n) => {
      const old = oldNodes.get(n.id);
      if (old) {
        n.x = old.x;
        n.y = old.y;
        n.vx = old.vx;
        n.vy = old.vy;
      }

      if (n.id === graphData.nodes[0]?.id) {
        n.x = centerX;
        n.y = centerY;
      } else if (typeof n.x === "undefined" || typeof n.y === "undefined") {
        n.x = centerX + (Math.random() - 0.5) * 50;
        n.y = centerY + (Math.random() - 0.5) * 50;
      }
    });

    simulation
      .force<d3.ForceLink<Node, LinkData>>("link")
      ?.distance(150)
      .strength(0.5);

    simulation.force<d3.ForceManyBody<Node>>("charge")?.strength((d) => {
      if (d.type === "document") return 0;
      if (d.type === "user") return -30;
      return -50;
    });

    simulation.force(
      "collide",
      d3.forceCollide<Node>().radius((d) => {
        if (d.type === "institution") return 50;
        if (d.type === "campus") return 45;
        if (d.type === "department") return 40;
        if (d.type === "user") return 35;
        return 25;
      }),
    );

    simulation.force("center", d3.forceCenter(width / 2, height / 2));
    simulation.alphaDecay(0.0228);

    const link = gRef
      .current!.select(".links")
      .selectAll<SVGLineElement, LinkData>("line.link")
      .data(links, (d: any) => `${d.source.id}-${d.target.id}`);
    link.exit().remove();
    const linkEnter = link.enter().append("line").attr("class", "link");
    link.merge(linkEnter);

    const node = gRef
      .current!.select(".nodes")
      .selectAll<SVGGElement, Node>("g.node")
      .data(nodes, (d) => d.id);

    node.exit().transition().duration(200).attr("opacity", 0).remove();

    const nodeEnter = node
      .enter()
      .append("g")
      .attr("class", (d) => `node ${d.type}`)
      .attr("data-id", (d) => d.id)
      .style("cursor", "pointer")
      .attr("opacity", 0);

    nodeEnter.transition().duration(200).attr("opacity", 1);

    // Outer circle for avatar drop shadow/border effect
    nodeEnter.append("circle").attr("class", "node-outer");

    // Inner circle for avatar tint
    nodeEnter.append("circle").attr("class", "node-inner");

    // Initials text centered inside avatar
    nodeEnter.append("text").attr("class", "node-initials");

    nodeEnter
      .append("text")
      .attr("class", "node-label")
      .attr("dy", 5)
      .attr("dx", 35);

    nodeEnter
      .on("mouseover", function (_e, d) {
        d3.select(this).raise().select(".node-label").text(d.name);
      })
      .on("mouseout", function (_e, d) {
        d3.select(this)
          .select(".node-label")
          .text(truncateText(d.name, d.type));
      });

    const nodeMerge = node.merge(nodeEnter);

    const drag = d3
      .drag<SVGGElement, Node>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodeMerge.call(drag);

    nodeMerge.on("click", (e, d) => handleNodeClick(e, d));

    const getRadius = (type: string) => {
      if (type === "institution") return 40;
      if (type === "campus") return 35;
      if (type === "department") return 30;
      if (type === "user") return 25;
      return 12; // document
    };

    nodeMerge
      .select(".node-outer")
      .attr("r", (d) => getRadius(d.type))
      .classed("selected", (d) => d.id === selectedUserNode?.id)
      .classed(
        "mother-node",
        (d) => d.id === viewStack[viewStack.length - 1]?.id,
      );

    nodeMerge
      .select(".node-inner")
      .attr("r", (d) => Math.max(0, getRadius(d.type) - 2)) // Slightly smaller for border effect
      .style("fill", (d) => {
        if (d.type === "document")
          return d.color ? `#${d.color}` : "var(--text)";
        return "var(--card-background)";
      });

    nodeMerge
      .select(".node-initials")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text((d) => {
        if (d.type === "document") return "";
        if (d.type === "department") {
          return generateAcronym(d.name).substring(0, 4); // Keep it within 4 letters for visual fit
        }

        // 1-2 letter initials
        const parts = d.name.split(/[\s,]+/);
        if (parts.length >= 2) {
          return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        }
        return d.name.substring(0, 2).toUpperCase();
      })
      .style("fill", (d) => {
        if (d.type === "institution") return "var(--text)";
        if (d.type === "campus" || d.type === "department")
          return "var(--brand)";
        if (d.type === "user") return "var(--accent)";
        return "transparent";
      })
      .style("font-size", (d) => {
        if (d.type === "institution") return "18px";
        if (d.type === "campus") return "16px";
        if (d.type === "department") {
          const len = generateAcronym(d.name).length;
          return len >= 4 ? "12px" : "14px";
        }
        if (d.type === "user") return "12px";
        return "10px";
      })
      .style("font-weight", "600")
      .style("pointer-events", "none");

    nodeMerge
      .select(".node-label")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => getRadius(d.type) + 15) // Position below node
      .attr("dx", 0)
      .text((d) => truncateText(d.name, d.type));

    simulation.nodes(nodes);
    simulation.force<d3.ForceLink<Node, LinkData>>("link")?.links(links);
    simulation.alpha(1).restart();
  }, [graphData]);

  if (isLoadingCurrentUser || isLoadingHierarchy) return <LoadingAnimation />;
  if (isError)
    return <div className="text-danger">Error: {error?.message}</div>;

  return (
    <div className="graph-container">
      {isDocumentView && (
        <div className={`binder-wrapper ${!isBinderOpen ? "collapsed" : ""}`}>
          <div className="binder-body">
            <div className="binder-content">
              {activeTab === "directory" && institutionHierarchy && (
                <div className="directory-tree">
                  {institutionHierarchy.campuses.map((campus: any) => (
                    <div key={campus.id} className="tree-item">
                      <div
                        className={`tree-header ${expandedIds.has(campus.id) ? "expanded" : ""}`}
                        onClick={() => toggleAccordion(campus.id)}
                      >
                        <i className="bi bi-caret-right-fill caret"></i>
                        <i className="bi bi-bank icon-type"></i>
                        <span>{campus.name}</span>
                      </div>

                      {expandedIds.has(campus.id) && (
                        <div className="tree-children">
                          {campus.departments.map((dept: any) => (
                            <div key={dept.id} className="tree-item">
                              <div
                                className={`tree-header ${expandedIds.has(dept.id) ? "expanded" : ""}`}
                                onClick={() => toggleAccordion(dept.id)}
                              >
                                <i className="bi bi-caret-right-fill caret"></i>
                                <i className="bi bi-building icon-type"></i>
                                <span>{dept.name}</span>
                              </div>

                              {expandedIds.has(dept.id) && (
                                <div className="tree-children">
                                  {dept.users.map((u: any) => (
                                    <div key={u.id} className="user-draggable">
                                      <div className="user-avatar-small">
                                        {u.firstName
                                          ? u.firstName.charAt(0)
                                          : u.email
                                            ? u.email.charAt(0).toUpperCase()
                                            : "U"}
                                      </div>
                                      <span>
                                        {u.firstName} {u.lastName}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {activeTab === "details" && (
                <div className="details-content">
                  {selectedUserNode ? (
                    <>
                      <div className="d-flex justify-content-between align-items-center">
                        <h4>{selectedUserNode.name}</h4>
                        <span className="badge bg-secondary">User</span>
                      </div>
                      <p className="text-muted small mb-3">
                        {selectedUserNode.email}
                      </p>
                      <hr />
                      <h5>Documents</h5>
                      {userDocuments.length > 0 ? (
                        <div className="document-list">
                          {userDocuments.map((doc: any) => (
                            <div key={doc.id} className="document-list-item">
                              <div className="doc-icon-wrapper">
                                <FileIcon
                                  fileType={doc.documentType?.name}
                                  fileName={doc.title}
                                />
                              </div>
                              <div className="doc-info">
                                <span className="doc-title">{doc.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted">No documents found.</p>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-muted mt-5">
                      <i className="bi bi-cursor display-4"></i>
                      <p className="mt-3">
                        Select a user node to view details.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="binder-tabs">
            <div
              className={`binder-tab ${activeTab === "directory" ? "active" : ""}`}
              onClick={() => handleTabClick("directory")}
              title="Directory"
            >
              <i className="bi bi-list-ul"></i> Directory
            </div>
            <div
              className={`binder-tab ${activeTab === "details" ? "active" : ""}`}
              onClick={() => handleTabClick("details")}
              title="Details"
            >
              <i className="bi bi-card-text"></i> Details
            </div>
          </div>
        </div>
      )}

      <div className="graph-canvas-wrapper">
        {viewStack.length > 1 && (
          <button
            className="btn-icon btn-back"
            onClick={handleBack}
            title="Go Back"
          >
            <i className="bi bi-arrow-left"></i>
          </button>
        )}
        <div className="info-tooltip-container">
          <i className="bi bi-info-circle"></i>
          <div className="info-tooltip-text">
            Navigation: Click nodes to drill down. Click Users to see documents.
          </div>
        </div>
        <svg ref={svgRef}></svg>

        <div className="breadcrumb-bar">
          {viewStack.map((node, index) => (
            <span key={node.id} className="breadcrumb-item-wrapper">
              <span
                className={`breadcrumb-item-text ${index === viewStack.length - 1 ? "active" : ""}`}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {index === 0 && node.type === "institution"
                  ? "University"
                  : node.name}
              </span>
              {index < viewStack.length - 1 && (
                <span className="breadcrumb-separator">›</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
