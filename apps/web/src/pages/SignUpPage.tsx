// apps/web/src/pages/SignUpPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import AuthLayout from "../components/AuthLayout";
// --- 1. THIS IS THE FIX ---
import "./Auth.css"; // Import the new unified CSS file

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const syncUser = trpc.user.syncUser.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // 1. Sign up with Supabase
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      // 2. Handle email confirmation
      if (data.user && !data.session) {
        alert("Signup successful! Please check your email to confirm.");
        navigate("/login");
        setLoading(false);
        return;
      }

      // 3. If auto-confirmed or no confirmation required, sync user
      if (data.user && data.session) {
        await syncUser.mutateAsync({
          email: data.user.email!,
          name: data.user.user_metadata.display_name,
        });
      } else {
        throw new Error("Signup successful but no session data received.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign Up">
      {/* --- 2. APPLY NEW CLASSES --- */}
      <div className="signup-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            disabled={loading}
            className="form-control"
          />
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
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className="form-control"
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? "Signing up..." : "Sign Up"}
          </button>
          {error && <p className="auth-error">{error}</p>}
        </form>
        <p className="auth-footer-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
      {/* --- END OF FIX --- */}
    </AuthLayout>
  );
};

export default SignUpPage;
