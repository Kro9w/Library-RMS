// apps/web/src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  Auth,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { trpc } from "../trpc";
// CORRECTED IMPORT:
import { AppRouterOutputs } from "../../../api/src/trpc/trpc.router";
import { LoadingOverlay } from "@mantine/core";

// This is the type of the user from our Prisma database
// CORRECTED TYPE DEFINITION:
type DbUser = AppRouterOutputs["user"]["getMe"];

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (name: string, email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
  refetchDbUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // tRPC query to get our database user
  const {
    data: dbUser,
    isLoading: isDbUserLoading,
    refetch: refetchDbUser,
  } = trpc.user.getMe.useQuery(undefined, {
    enabled: !!user, // Only run if we have a Firebase user
    retry: false,
    staleTime: Infinity,
  });

  // tRPC mutation for creating the user in our DB
  const createUserMutation = trpc.user.create.useMutation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (name: string, email: string, pass: string) => {
    // 1. Create user in Firebase
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      pass
    );

    // 2. Create user in our database via tRPC
    // This requires the user to be signed in, so Firebase automatically
    // signs them in, and our tRPC client will pick up the token.
    try {
      await createUserMutation.mutateAsync({ name, email });
      // Manually refetch the dbUser query
      refetchDbUser();
    } catch (error) {
      // Handle error (e.g., user already exists in DB but not in Firebase, or vice-versa)
      console.error("Failed to create user in database:", error);
      // Maybe delete the firebase user?
      await userCredential.user.delete();
      throw new Error("Failed to create user record.");
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    // dbUser will be cleared automatically by the query being disabled
  };

  // Show a global loader while we wait for auth state OR db user
  if (loading || (!!user && isDbUserLoading)) {
    return (
      <LoadingOverlay
        visible
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser: dbUser ?? null,
        loading: loading || (!!user && isDbUserLoading),
        signIn,
        signUp,
        signOut,
        refetchDbUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
