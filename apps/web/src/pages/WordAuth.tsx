// apps/web/src/pages/WordAuth.tsx
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../supabase";
import LoginPage from "./LoginPage";
import AuthLayout from "../components/AuthLayout";
import { LoadingAnimation } from "../components/ui/LoadingAnimation";
import "./Auth.css";

/* global Office */

const WordAuth: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const [fileName, setFileName] = useState(queryParams.get("fileName") || "");
  const [controlNumber, setControlNumber] = useState(
    queryParams.get("controlNumber") || ""
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendMessageToParent = (message: object) => {
    Office.context.ui.messageParent(JSON.stringify(message), {
      targetOrigin: "https://localhost:3000",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (session) {
      sendMessageToParent({
        status: "success",
        token: session.access_token,
        data: { fileName, controlNumber },
      });
    } else {
      sendMessageToParent({
        status: "error",
        error: "Not authenticated.",
      });
    }
  };

  if (isLoading) {
    return <LoadingAnimation />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <AuthLayout title="Send to Folio">
      <div className="auth-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fileName">File Name</label>
            <input
              id="fileName"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="form-control"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="controlNumber">Control Number</label>
            <input
              id="controlNumber"
              type="text"
              value={controlNumber}
              onChange={(e) => setControlNumber(e.target.value)}
              className="form-control"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Confirm and Send
          </button>
        </form>
      </div>
    </AuthLayout>
  );
};

export default WordAuth;
