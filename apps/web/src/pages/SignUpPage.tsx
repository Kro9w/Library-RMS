// apps/web/src/pages/SignUpPage.tsx
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
import { TRPCClientError } from "@trpc/client";

export default function SignUpPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validate: {
      name: (value) => (value.length < 2 ? "Name is too short" : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) =>
        value.length < 6 ? "Password must be at least 6 characters" : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      await signUp(values.name, values.email, values.password);
      // On success, auth provider will fetch dbUser,
      // and router will redirect to /join-organization
      navigate("/join-organization");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already in use.");
      } else if (err instanceof TRPCClientError) {
        setError(err.message);
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
      <Title ta="center">Create your account</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Already have an account?{" "}
        <Anchor size="sm" component={Link} to="/login">
          Sign in
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          {error && (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Sign Up Failed"
              color="red"
              withCloseButton
              onClose={() => setError(null)}
              mb="md"
            >
              {error}
            </Alert>
          )}
          <TextInput
            label="Name"
            placeholder="Your name"
            required
            {...form.getInputProps("name")}
          />
          <TextInput
            label="Email"
            placeholder="you@email.com"
            required
            mt="md"
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
            Sign up
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
