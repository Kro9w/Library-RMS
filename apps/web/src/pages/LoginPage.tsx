// apps/web/src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import AuthLayout from "../components/AuthLayout";
import "./Auth.css";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const syncUser = trpc.user.syncUser.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (authError) throw authError;

      if (data.user) {
        // Sync the user in our DB
        // We need to parse the metadata which should contain the name parts
        const meta = data.user.user_metadata || {};

        // Handle cases where we might still have old metadata or need to split display_name
        let firstName = meta.first_name;
        let middleName = meta.middle_name;
        let lastName = meta.last_name;

        if (!firstName && meta.display_name) {
          const parts = meta.display_name.split(" ");
          if (parts.length > 1) {
            firstName = parts[0];
            lastName = parts.slice(1).join(" "); // Rough approximation
          } else {
            firstName = parts[0];
            lastName = "."; // Placeholder
          }
        }

        // Fallback if completely missing
        if (!firstName) firstName = "User";
        if (!lastName) lastName = ".";

        syncUser.mutate({
          email: data.user.email!,
          firstName,
          middleName,
          lastName,
        });
      } else {
        throw new Error("Login successful but no user data received.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Login">
      <div className="auth-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="form-control"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="form-control"
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Logging in..." : "Login"}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </form>
        <p className="auth-footer-link">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
