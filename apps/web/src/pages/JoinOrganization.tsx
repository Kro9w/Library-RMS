import React, { useState } from "react";
import { trpc } from "../trpc";
import { useNavigate } from "react-router-dom";
// 1. FIX: Removed 'useAuth' import

const JoinOrganization: React.FC = () => {
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");
  const navigate = useNavigate();
  // 2. FIX: Get tRPC utils
  const utils = trpc.useUtils();

  const createOrg = trpc.user.createOrganization.useMutation({
    onSuccess: () => {
      // 3. FIX: Invalidate 'getMe' query to refetch user data
      utils.user.getMe.invalidate();
      navigate("/"); // Redirect to dashboard
    },
    // 4. FIX: Add type to error
    onError: (error: any) => {
      alert(`Error creating organization: ${error.message}`);
    },
  });

  const joinOrg = trpc.user.joinOrganization.useMutation({
    onSuccess: () => {
      // 5. FIX: Invalidate 'getMe' query to refetch user data
      utils.user.getMe.invalidate();
      navigate("/"); // Redirect to dashboard
    },
    // 6. FIX: Add type to error
    onError: (error: any) => {
      alert(`Error joining organization: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createOrg.mutate({ orgName });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    joinOrg.mutate({ orgId });
  };

  return (
    <div className="join-org-container">
      <h2>Join or Create an Organization</h2>
      <div className="form-section">
        <h3>Create New Organization</h3>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Organization Name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          {/* 7. FIX: Use 'isPending' instead of 'isLoading' */}
          <button type="submit" disabled={createOrg.isPending}>
            {createOrg.isPending ? "Creating..." : "Create"}
          </button>
        </form>
      </div>

      <div className="form-section">
        <h3>Join Existing Organization</h3>
        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Organization ID (Invite Code)"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
          />
          {/* 8. FIX: Use 'isPending' instead of 'isLoading' */}
          <button type="submit" disabled={joinOrg.isPending}>
            {joinOrg.isPending ? "Joining..." : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinOrganization;
