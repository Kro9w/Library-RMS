// apps/web/src/pages/LoginPage.tsx
import {
  Container,
  Title,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Anchor,
  Alert,
  Center,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IconAlertCircle } from "@tabler/icons-react";

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length < 6 ? "Password must be at least 6 characters" : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      await signIn(values.email, values.password);
      // On success, the AuthProvider and router logic will handle redirection
      navigate("/");
    } catch (err: any) {
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Center>
        <img
          src="/folio.svg"
          alt="Folio"
          style={{ width: 100, marginBottom: 20 }}
        />
      </Center>
      <Title ta="center">Welcome back!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Do not have an account yet?{" "}
        <Anchor size="sm" component={Link} to="/signup">
          Create account
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          {error && (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Login Failed"
              color="red"
              withCloseButton
              onClose={() => setError(null)}
              mb="md"
            >
              {error}
            </Alert>
          )}
          <TextInput
            label="Email"
            placeholder="you@email.com"
            required
            {...form.getInputProps("email")}
          />
          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            mt="md"
            {...form.getInputProps("password")}
          />
          <Button type="submit" fullWidth mt="xl" loading={loading}>
            Sign in
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
