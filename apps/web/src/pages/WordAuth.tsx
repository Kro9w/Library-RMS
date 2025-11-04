// apps/web/src/pages/WordAuth.tsx
import React, { useEffect } from "react";
import { supabase } from "../supabase";

const WordAuth: React.FC = () => {
  useEffect(() => {
    const handleAuth = async () => {
      // Check if there is an active session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // If logged in, redirect to the callback with the token
        window.location.assign(
          `/word-auth-callback.html#access_token=${session.access_token}`
        );
      } else {
        // If not logged in, redirect to the login page
        window.location.assign("/login?for_word=true");
      }
    };

    handleAuth();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      <p>Please wait, authenticating...</p>
    </div>
  );
};

export default WordAuth;
