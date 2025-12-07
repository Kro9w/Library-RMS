import React, { useState } from "react";
import { trpc } from "../trpc";
import { useNavigate } from "react-router-dom";
import AuthLayout from '../components/AuthLayout';
import './JoinOrganization.css';

const JoinOrganization: React.FC = () => {
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState("");
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const createOrg = trpc.user.createOrganization.useMutation({
    onSuccess: () => {
      utils.user.getMe.invalidate();
      navigate("/");
    },
    onError: (error: any) => {
      alert(`Error creating organization: ${error.message}`);
    },
  });

  const joinOrg = trpc.user.joinOrganization.useMutation({
    onSuccess: () => {
      utils.user.getMe.invalidate();
      navigate("/");
    },
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
    <AuthLayout title="Join or Create an Organization">
      <div className="join-org-container">
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
            <button type="submit" className="btn-primary" disabled={createOrg.isPending}>
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
            <button type="submit" className="btn-secondary" disabled={joinOrg.isPending}>
              {joinOrg.isPending ? "Joining..." : "Join"}
            </button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
};

export default JoinOrganization;
