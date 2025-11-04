// apps/web/src/pages/LoginPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import AuthLayout from "../components/AuthLayout";
// --- 1. THIS IS THE FIX ---
import "./Auth.css"; // Import the new unified CSS file

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
        syncUser.mutate({
          email: data.user.email!,
          name: data.user.user_metadata?.display_name,
        });

        // After a successful login, the onAuthStateChange listener in WordAuth.tsx
        // or the main App.tsx will handle the next steps.
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
      {/* --- 2. APPLY NEW CLASSES --- */}
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
      {/* --- END OF FIX --- */}
    </AuthLayout>
  );
};

export default LoginPage;
