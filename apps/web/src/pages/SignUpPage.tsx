import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import AuthLayout from '../components/AuthLayout';
import './SignUpPage.css';

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const syncUser = trpc.user.syncUser.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign up with Supabase
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName, // This becomes user_metadata.display_name
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // 2. Handle email confirmation
      if (data.user && !data.session) {
        alert("Signup successful! Please check your email to confirm.");
        navigate("/login"); // Still navigate to login if confirmation needed
        setLoading(false); // Stop loading here
        return;
      }

      // 3. If auto-confirmed or no confirmation required, sync user
      if (data.user && data.session) {
        // Wait for syncUser to complete
        await syncUser.mutateAsync({
          email: data.user.email!,
          name: data.user.user_metadata.display_name,
        });

        // 4. Removed navigation. App.tsx will handle the redirect.
        // navigate('/');
      } else {
        // Handle case where signup seems successful but no user/session
        throw new Error("Signup successful but no session data received.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
      setLoading(false); // Ensure loading is stopped on error
    }
    // No finally block needed here as loading should only stop on error or completion
    // The component will unmount/rerender on successful signup/sync/redirect by App.tsx
  };

  return (
    <AuthLayout title="Sign Up">
      <div className="signup-container">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default SignUpPage;
