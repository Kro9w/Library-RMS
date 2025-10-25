// apps/web/src/pages/JoinOrganization.tsx
import {
  Container,
  Title,
  Paper,
  TextInput,
  Button,
  Text,
  Alert,
  Divider,
  SimpleGrid,
} from "@mantine/core";
import { useForm } from "@mantine/form"; // This will work after pnpm add
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { IconAlertCircle } from "@tabler/icons-react";
import { trpc } from "../trpc";
import { TRPCClientError } from "@trpc/client";

export default function JoinOrganization() {
  const { dbUser, refetchDbUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const createOrgMutation = trpc.user.createOrganization.useMutation();
  const joinOrgMutation = trpc.user.joinOrganization.useMutation();

  const createForm = useForm({
    initialValues: { name: "" },
    validate: {
      // 1. FIXED: Explicitly typed 'value' as string
      name: (value: string) => (value.length < 2 ? "Name is too short" : null),
    },
  });

  const joinForm = useForm({
    initialValues: { name: "" },
    validate: {
      // 1. FIXED: Explicitly typed 'value' as string
      name: (value: string) => (value.length < 2 ? "Name is too short" : null),
    },
  });

  const handleCreate = async (values: typeof createForm.values) => {
    setError(null);
    try {
      await createOrgMutation.mutateAsync({ name: values.name });
      await refetchDbUser(); // Refetch user to get new org ID
      navigate("/"); // Redirect to dashboard
    } catch (err: any) {
      if (err instanceof TRPCClientError) {
        setError(err.message);
      } else {
        setError("Failed to create organization.");
      }
    }
  };

  const handleJoin = async (values: typeof joinForm.values) => {
    setError(null);
    try {
      await joinOrgMutation.mutateAsync({ organizationName: values.name });
      await refetchDbUser(); // Refetch user to get new org ID
      navigate("/"); // Redirect to dashboard
    } catch (err: any) {
      if (err instanceof TRPCClientError) {
        setError(err.message);
      } else {
        setError("Failed to join organization.");
      }
    }
  };

  return (
    <Container size={800} my={40}>
      <Title ta="center">Welcome, {dbUser?.name}!</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        To continue, please create a new organization or join an existing one.
      </Text>

      {error && (
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error"
          color="red"
          withCloseButton
          onClose={() => setError(null)}
          mt="md"
        >
          {error}
        </Alert>
      )}

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <form onSubmit={createForm.onSubmit(handleCreate)}>
            <Title order={3}>Create Organization</Title>
            <TextInput
              label="Organization Name"
              placeholder="My University Library"
              required
              mt="md"
              {...createForm.getInputProps("name")}
            />
            <Button
              type="submit"
              fullWidth
              mt="xl"
              // 2. FIXED: Changed 'isLoading' to 'isPending'
              loading={createOrgMutation.isPending}
            >
              Create
            </Button>
          </form>

          <div>
            <Divider
              my="xs"
              label="OR"
              labelPosition="center"
              orientation="horizontal"
            />

            <form onSubmit={joinForm.onSubmit(handleJoin)}>
              <Title order={3}>Join Organization</Title>
              <TextInput
                label="Organization Name"
                placeholder="Existing Organization Name"
                required
                mt="md"
                {...joinForm.getInputProps("name")}
              />
              <Button
                type="submit"
                fullWidth
                mt="xl"
                variant="default"
                // 2. FIXED: Changed 'isLoading' to 'isPending'
                loading={joinOrgMutation.isPending}
              >
                Join
              </Button>
            </form>
          </div>
        </SimpleGrid>
      </Paper>
    </Container>
  );
}
