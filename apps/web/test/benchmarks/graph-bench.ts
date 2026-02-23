import { performance } from "perf_hooks";
import type { Node, LinkData } from "../../src/types/graph";

// Mock Data Generator
function generateHierarchy(numCampuses: number, deptsPerCampus: number, usersPerDept: number, docsPerUser: number) {
  const campuses = [];
  for (let i = 0; i < numCampuses; i++) {
    const departments = [];
    for (let j = 0; j < deptsPerCampus; j++) {
      const users = [];
      for (let k = 0; k < usersPerDept; k++) {
        const documents = [];
        for (let l = 0; l < docsPerUser; l++) {
          documents.push({
            id: `doc-${i}-${j}-${k}-${l}`,
            title: `Document ${l}`,
            documentType: { color: "ffffff" }
          });
        }
        users.push({
          id: `user-${i}-${j}-${k}`,
          firstName: `User`,
          lastName: `${k}`,
          email: `user${k}@example.com`,
          documents
        });
      }
      departments.push({
        id: `dept-${i}-${j}`,
        name: `Department ${j}`,
        users
      });
    }
    campuses.push({
      id: `campus-${i}`,
      name: `Campus ${i}`,
      departments
    });
  }
  return {
    id: "org-1",
    acronym: "UNI",
    campuses
  };
}

// Logic to Benchmark
function buildMaps(orgHierarchy: any) {
  const uMap = new Map<string, any>();
  const dMap = new Map<string, any>();

  if (orgHierarchy) {
    for (const c of orgHierarchy.campuses) {
      for (const d of c.departments) {
        dMap.set(d.id, d);
        for (const u of d.users) {
          uMap.set(u.id, u);
        }
      }
    }
  }
  return { userMap: uMap, deptMap: dMap };
}

function computeGraphData(
  orgHierarchy: any,
  userMap: Map<string, any>,
  deptMap: Map<string, any>,
  viewStack: Node[],
  tempNodes: Node[] = [],
  bubbleNode: Node | null = null,
  bubbleDocuments: Node[] = []
) {
    if (!orgHierarchy || viewStack.length === 0)
      return { nodes: [], links: [] };

    const currentRoot = viewStack[viewStack.length - 1];
    let nodes: Node[] = [];
    const links: LinkData[] = [];

    const bubbleDocIds = new Set(bubbleDocuments.map((d) => d.id));

    // Mother Node (Starts at Center, Movable)
    const rootNodeForGraph: Node = {
      ...currentRoot,
      vx: 0,
      vy: 0,
      fx: undefined,
      fy: undefined,
    };
    nodes.push(rootNodeForGraph);

    // Children Generator Helper
    const addNode = (n: Node) => {
      const angle = Math.random() * 2 * Math.PI;
      const radius = 50 + Math.random() * 100;
      n.x = Math.cos(angle) * radius;
      n.y = Math.sin(angle) * radius;
      nodes.push(n);
    };

    if (currentRoot.type === "organization") {
      orgHierarchy.campuses.forEach((c: any) => {
        addNode({
          id: c.id,
          name: c.name,
          type: "campus",
          parentId: currentRoot.id,
          color: "var(--primary)",
        });
      });
    } else if (currentRoot.type === "campus") {
      const campus = orgHierarchy.campuses.find(
        (c: any) => c.id === currentRoot.id,
      );
      if (campus) {
        campus.departments.forEach((d: any) => {
          addNode({
            id: d.id,
            name: d.name,
            type: "department",
            parentId: currentRoot.id,
            color: "var(--primary)",
          });
        });
      }
    } else if (currentRoot.type === "department") {
      const dept = deptMap.get(currentRoot.id);
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
    } else if (currentRoot.type === "user") {
      // Find user
      const user = userMap.get(currentRoot.id);

      if (user) {
        user.documents.forEach((doc: any) => {
          if (bubbleDocIds.has(doc.id)) return;
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
    
    // ... (rest of logic: bubble, temp nodes, links) ...
    // Since this is a benchmark for "graph calculation", the most expensive part is iterating users/docs.
    // I will include the rest of the logic for completeness.
    
    // --- Merge Bubble Node ---
    if (bubbleNode) {
      nodes.push(bubbleNode);
      bubbleDocuments.forEach((doc) => {
        if (!nodes.some((n) => n.id === doc.id)) {
          const bubbleDoc = { ...doc, isContainedInBubble: true };
          if (
            (typeof bubbleDoc.x === "undefined" ||
              typeof bubbleDoc.y === "undefined") &&
            bubbleNode.x &&
            bubbleNode.y
          ) {
            bubbleDoc.x = bubbleNode.x;
            bubbleDoc.y = bubbleNode.y;
          }
          nodes.push(bubbleDoc);
        }
      });
    }

    // --- Merge Temp Nodes ---
    const existingIds = new Set(nodes.map((n) => n.id));
    const validTempNodes = tempNodes.filter((n) => !existingIds.has(n.id));

    validTempNodes.forEach((tn) => {
      nodes.push(tn);
      const fullUser = userMap.get(tn.id);

      if (fullUser && fullUser.documents) {
        fullUser.documents.forEach((doc: any) => {
          if (bubbleDocIds.has(doc.id)) return;
          const angle = Math.random() * 2 * Math.PI;
          const radius = 30; 
          nodes.push({
            id: doc.id,
            name: doc.title,
            type: "document",
            parentId: tn.id,
            uploadedById: fullUser.id,
            color: doc.documentType?.color,
            x: (tn.x || 0) + Math.cos(angle) * radius,
            y: (tn.y || 0) + Math.sin(angle) * radius,
          });

          links.push({
            source: tn.id,
            target: doc.id,
            isDetached: false,
          });
        });
      }
    });

    nodes.forEach((n) => {
      const isTempNode = tempNodes.some((tn) => tn.id === n.id);
      const isTempDoc = tempNodes.some((tn) => tn.id === n.parentId); 
      const isBubble = n.type === "bubble";
      const isBubbleDoc = n.isContainedInBubble;

      if (
        n.id !== currentRoot.id &&
        !isTempNode &&
        !isTempDoc &&
        !isBubble &&
        !isBubbleDoc
      ) {
        links.push({
          source: rootNodeForGraph.id,
          target: n.id,
          isDetached: false, 
        });
      }
    });

    return { nodes, links };
}


const MODERATE_SIZE = {
    campuses: 5,
    depts: 20,
    users: 500,
    docs: 50
}

console.log(`Generating hierarchy...`);
const hierarchy = generateHierarchy(MODERATE_SIZE.campuses, MODERATE_SIZE.depts, MODERATE_SIZE.users, MODERATE_SIZE.docs);
const totalUsers = MODERATE_SIZE.campuses * MODERATE_SIZE.depts * MODERATE_SIZE.users;
console.log(`Generated ${totalUsers} users.`);

console.log(`Building Maps...`);
const startMap = performance.now();
const { userMap, deptMap } = buildMaps(hierarchy);
const endMap = performance.now();
console.log(`Map Build Time: ${(endMap - startMap).toFixed(2)}ms`);

// Test Case 1: Department View (Many Users)
const deptNode: Node = {
    id: "dept-0-0",
    name: "Department 0",
    type: "department",
    parentId: "campus-0"
};
const viewStackDept: Node[] = [deptNode];

console.log(`Benchmarking Graph Calculation (Department View - ${MODERATE_SIZE.users} users)...`);
const startCalc = performance.now();
const ITERATIONS = 1000;
for(let i=0; i<ITERATIONS; i++) {
    computeGraphData(hierarchy, userMap, deptMap, viewStackDept);
}
const endCalc = performance.now();
console.log(`Avg Calculation Time (Dept View): ${((endCalc - startCalc)/ITERATIONS).toFixed(4)}ms`);
console.log(`Total Time for ${ITERATIONS} runs: ${(endCalc - startCalc).toFixed(2)}ms`);

// Test Case 2: User View (Documents)
const userNode: Node = {
    id: "user-0-0-0",
    name: "User 0",
    type: "user",
    parentId: "dept-0-0"
};
const viewStackUser: Node[] = [userNode];

console.log(`Benchmarking Graph Calculation (User View - ${MODERATE_SIZE.docs} docs)...`);
const startCalcUser = performance.now();
for(let i=0; i<ITERATIONS; i++) {
    computeGraphData(hierarchy, userMap, deptMap, viewStackUser);
}
const endCalcUser = performance.now();
console.log(`Avg Calculation Time (User View): ${((endCalcUser - startCalcUser)/ITERATIONS).toFixed(4)}ms`);
