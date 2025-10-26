import React from "react";
// import { useAuth } from '../context/AuthContext'; // Remove this
import { useUser } from "@supabase/auth-helpers-react"; // Add this
import { trpc } from "../trpc"; // Add this
import { Navigate } from "react-router-dom";

const Account: React.FC = () => {
  // const { user }_ = useAuth(); // Remove this
  const authUser = useUser(); // This is the Supabase auth user

  // Get the user profile from *your* database
  // FIX: Removed the stray '_' from the end of this line
  const { data: dbUser, isLoading } = trpc.user.getMe.useQuery();

  if (isLoading) {
    return <div>Loading account details...</div>;
  }

  // authUser is from Supabase, dbUser is from your public.User table
  if (!authUser || !dbUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="account-container">
      <h2>My Account</h2>
      <div className="account-details">
        <p>
          <strong>Display Name:</strong>
          {/* Use 'name' to match the schema */}
          {dbUser.name || "Not set"}
        </p>
        <p>
          <strong>Email:</strong>
          {dbUser.email}
        </p>
        <p>
          <strong>Role:</strong>
          {dbUser.role}
        </p>
        <p>
          <strong>Organization:</strong>
          {dbUser.organization?.name || "Not part of an organization"}
        </p>
        {/* TODO: Add logic to update user details.
            This would call supabase.auth.updateUser() AND
            a tRPC mutation to update your public.User table. */}
      </div>
    </div>
  );
};

export default Account;
