export const getActionDetails = (action: string) => {
  const lowerCaseAction = action.toLowerCase();

  if (lowerCaseAction.includes("create") || lowerCaseAction.includes("add")) {
    return { label: "Created", badgeClass: "bg-success" };
  }
  if (
    lowerCaseAction.includes("delete") ||
    lowerCaseAction.includes("destroy")
  ) {
    return { label: "Deleted", badgeClass: "bg-danger" };
  }
  if (lowerCaseAction.includes("sent")) {
    return { label: "Sent", badgeClass: "bg-info " };
  }
  if (lowerCaseAction.includes("receive")) {
    return { label: "Received", badgeClass: "bg-primary" };
  }
  if (lowerCaseAction.includes("join")) {
    return { label: "Joined", badgeClass: "bg-success" };
  }
  if (lowerCaseAction.includes("assign")) {
    return { label: "Assigned", badgeClass: "bg-success" };
  }
  if (
    lowerCaseAction.includes("remove") ||
    lowerCaseAction.includes("unassign") ||
    lowerCaseAction.includes("discard")
  ) {
    return { label: "Removed", badgeClass: "bg-danger" };
  }
  if (lowerCaseAction.includes("check")) {
    return { label: "Checked", badgeClass: "bg-warning " };
  }
  if (lowerCaseAction.includes("disposition")) {
    return { label: "Disposition", badgeClass: "bg-dark text-white" };
  }
  if (lowerCaseAction.includes("legal hold")) {
    return { label: "Legal Hold", badgeClass: "bg-warning " };
  }

  return { label: "Updated", badgeClass: "bg-secondary" };
};
