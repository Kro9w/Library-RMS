"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
function Message({ children, type }) {
    return (0, jsx_runtime_1.jsx)("div", { className: `react-pdf__message react-pdf__message--${type}`, children: children });
}
exports.default = Message;
