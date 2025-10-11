import React, { useState } from "react";
// Corrected import path using the '@/' alias
import { trpc } from "@/trpc";
import { useUser } from "@clerk/clerk-react";

export function JoinOrganization() {
  const {
    data: organizations,
    isLoading,
    isError,
    error,
  } = trpc.getOrganizations.useQuery();
  const { user } = useUser();
  const [requestedOrg, setRequestedOrg] = useState<string | null>(null);

  const requestToJoin = trpc.requestToJoinOrganization.useMutation({
    onSuccess: (data, variables) => {
      setRequestedOrg(variables.organizationId);
    },
    onError: (err) => {
      alert(`Error requesting to join: ${err.message}`);
    },
  });

  if (isLoading)
    return <div className="container mt-4">Loading organizations...</div>;
  if (isError)
    return (
      <div className="container mt-4 alert alert-danger">
        Error: {error.message}
      </div>
    );

  // If the user is already in an organization, show a message.
  if (
    user?.organizationMemberships &&
    user.organizationMemberships.length > 0
  ) {
    return (
      <div className="container mt-4 text-center">
        <h2>You are already in an organization.</h2>
        <p>Your request to join will be reviewed by an administrator.</p>
      </div>
    );
  }

  // If the user has already made a request, show a pending message.
  if (requestedOrg) {
    const orgName =
      organizations?.find((o) => o.id === requestedOrg)?.name ||
      "the organization";
    return (
      <div className="container mt-4 text-center">
        <h2>Request Sent</h2>
        <p>Your request to join "{orgName}" has been sent for approval.</p>
        <p>An administrator will review your request shortly.</p>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="text-center">
        <h2>Join an Organization</h2>
        <p className="lead text-muted">Select an office to request access.</p>
      </div>
      <div className="list-group mt-4">
        {organizations?.map((org) => (
          <div
            key={org.id}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <div>
              <h5 className="mb-1">{org.name}</h5>
              {/* Corrected property name from 'membersCount' to 'memberCount' */}
              <small className="text-muted">{org.memberCount} member(s)</small>
            </div>
            <button
              className="btn btn-brand-primary"
              onClick={() => requestToJoin.mutate({ organizationId: org.id })}
              disabled={requestToJoin.isPending}
            >
              {requestToJoin.isPending &&
              requestToJoin.variables?.organizationId === org.id
                ? "Requesting..."
                : "Request to Join"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
