// apps/web/src/pages/Account.tsx
// import { UserProfile } from '@clerk/clerk-react'; // Removed
import { Container, Title, Paper, Text, Button } from "@mantine/core";
import { useAuth } from "../context/AuthContext";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useState } from "react";

export function Account() {
  const { user, dbUser } = useAuth();
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = () => {
    if (user?.email) {
      sendPasswordResetEmail(auth, user.email)
        .then(() => {
          setResetSent(true);
        })
        .catch((error) => {
          console.error("Error sending password reset:", error);
          alert("Failed to send password reset email.");
        });
    }
  };

  if (!user || !dbUser) {
    return null;
  }

  return (
    <Container size="sm" mt="lg">
      <Title order={1} mb="lg">
        My Account
      </Title>
      {/* <UserProfile path="/account" routing="path" /> */}

      {/* Added replacement for UserProfile */}
      <Paper shadow="sm" p="lg" withBorder>
        <Text>
          <strong>Name:</strong> {dbUser.name}
        </Text>
        <Text mt="sm">
          <strong>Email:</strong> {dbUser.email}
        </Text>
        <Text mt="sm">
          <strong>Organization:</strong> {dbUser.organization?.name || "N/A"}
        </Text>
        <Text mt="sm">
          <strong>Firebase UID:</strong> {user.uid}
        </Text>

        <Button mt="xl" onClick={handlePasswordReset} disabled={resetSent}>
          {resetSent
            ? "Password Reset Email Sent"
            : "Send Password Reset Email"}
        </Button>
      </Paper>
    </Container>
  );
}
