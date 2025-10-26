import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { trpc } from "../trpc";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Keep navigate import
  const syncUser = trpc.user.syncUser.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email,
          password,
        }
      );

      if (authError) {
        throw authError;
      }

      if (data.user) {
        // 2. Sync user with our backend
        // Wait for syncUser to complete
        await syncUser.mutateAsync({
          email: data.user.email!,
          name: data.user.user_metadata?.display_name,
        });

        // 3. Removed navigation. App.tsx will handle the redirect.
        // navigate('/');
      } else {
        // Handle case where signIn succeeds but user is null
        throw new Error("Login successful but no user data received.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in");
      setLoading(false); // Ensure loading is stopped on error
    }
    // No finally block needed here as loading should only stop on error or completion
    // The component will unmount/rerender on successful login/sync/redirect by App.tsx
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading} // Disable inputs while loading
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading} // Disable inputs while loading
        />
        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
    </div>
  );
};

export default LoginPage;
