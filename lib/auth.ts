import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser;
  created_at: string;
};

export type SignInResult = {
  user: AuthUser | null;
  error: string | null;
};

type AuthListener = (session: AuthSession | null) => void;

function mapSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
    },
    created_at: session.user.created_at ?? new Date().toISOString(),
  };
}

export function onAuthStateChange(listener: AuthListener): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(mapSession(session));
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function getSession(): Promise<AuthSession | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("[LoreVerse] Erro em getSession:", error);
    return null;
  }

  return mapSession(data.session);
}

export async function signIn(
  email: string,
  password: string
): Promise<SignInResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    console.error("[LoreVerse] Erro em signIn:", error);
    return {
      user: null,
      error: "E-mail ou senha incorretos.",
    };
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? email.trim(),
    },
    error: null,
  };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[LoreVerse] Erro em signOut:", error);
    throw new Error("Não foi possível acessar o arquivo. Tente novamente.");
  }
}
