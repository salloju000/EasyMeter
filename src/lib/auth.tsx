import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isFirebaseEnabled, onAuthStateChange, signInWithGoogle, signOutGoogle } from "./firebase";
import { toast } from "@/hooks/use-toast";

interface AuthContextValue {
  user: { displayName: string | null; email: string | null } | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextValue["user"]>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseEnabled()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        setUser({ displayName: firebaseUser.displayName, email: firebaseUser.email });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    if (!isFirebaseEnabled()) {
      toast({
        title: "Firebase disabled",
        description: "Enable Firebase configuration before signing in.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Google sign-in failed", error);
      toast({
        title: "Sign-in failed",
        description: "Unable to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await signOutGoogle();
    } catch (error) {
      console.error("Sign-out failed", error);
      toast({
        title: "Sign-out failed",
        description: "Unable to sign out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
