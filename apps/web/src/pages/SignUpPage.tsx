// apps/web/src/pages/SignUpPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { trpc } from "../trpc";
import AuthLayout from "../components/AuthLayout";
import "./Auth.css";

const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // New Name Fields
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

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
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            // Keeping display_name for backward compat or if needed by other tools
            display_name: `${firstName} ${
              middleName ? middleName + " " : ""
            }${lastName}`,
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
          firstName,
          middleName: middleName || undefined,
          lastName,
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
      <div className="signup-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="d-flex gap-2">
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              disabled={loading}
              className="form-control"
            />
            <input
              type="text"
              placeholder="Middle Name (Optional)"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              disabled={loading}
              className="form-control"
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              disabled={loading}
              className="form-control"
            />
          </div>

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
    </AuthLayout>
  );
};

export default SignUpPage;
