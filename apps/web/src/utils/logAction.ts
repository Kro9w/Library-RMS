export const getActionDetails = (action: string) => {
  const lowerCaseAction = action.toLowerCase();

  let label = "Updated";
  let badgeClass = "bg-secondary";

  if (lowerCaseAction.includes("create") || lowerCaseAction.includes("add")) {
    label = "Created";
    badgeClass = "bg-success";
  } else if (lowerCaseAction.includes("delete") || lowerCaseAction.includes("destroy")) {
    label = "Deleted";
    badgeClass = "bg-danger";
  } else if (lowerCaseAction.includes("sent")) {
    label = "Sent";
    badgeClass = "bg-info text-dark";
  } else if (lowerCaseAction.includes("receive")) {
    label = "Received";
    badgeClass = "bg-primary";
  } else if (lowerCaseAction.includes("join")) {
    label = "Joined";
    badgeClass = "bg-success";
  } else if (lowerCaseAction.includes("assign")) {
    label = "Assigned";
    badgeClass = "bg-success";
  } else if (lowerCaseAction.includes("remove") || lowerCaseAction.includes("unassign") || lowerCaseAction.includes("discard")) {
    label = "Removed";
    badgeClass = "bg-danger";
  } else if (lowerCaseAction.includes("check")) {
    label = "Checked";
    badgeClass = "bg-warning text-dark";
  } else if (lowerCaseAction.includes("disposition")) {
    label = "Disposition";
    badgeClass = "bg-dark text-white";
  } else if (lowerCaseAction.includes("legal hold")) {
    label = "Legal Hold";
    badgeClass = "bg-warning text-dark";
  }

  return { label, badgeClass };
};
