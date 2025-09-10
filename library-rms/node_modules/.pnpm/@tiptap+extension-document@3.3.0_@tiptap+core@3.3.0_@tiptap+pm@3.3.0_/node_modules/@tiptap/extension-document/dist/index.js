// src/document.ts
import { Node } from "@tiptap/core";
var Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+"
});

// src/index.ts
var index_default = Document;
export {
  Document,
  index_default as default
};
//# sourceMappingURL=index.js.map