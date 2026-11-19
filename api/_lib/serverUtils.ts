/// <reference types="node" />
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

const FALLBACK_SUPABASE_URL = "https://ajmnwyrhbdfhuwnptedy.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1IwVVrUqdBcXpAIfm0mW8Q_fByeq_W2";

export const GEMINI_MODEL = "gemini-flash-latest";

export type AuthCheckResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: string };

export async function verifySupabaseAuth(
  req: VercelRequest,
  logPrefix: string
): Promise<AuthCheckResult> {
  const authHeader = req.headers?.authorization;
  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      error: "Token de autenticação ausente.",
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Token de autenticação inválido.",
    };
  }

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error(`${logPrefix} Falha na verificação do token:`, authError);
      return {
        ok: false,
        status: 401,
        error: "Sessão inválida ou expirada.",
      };
    }

    return { ok: true, userId: userData.user.id };
  } catch (err) {
    console.error(`${logPrefix} Erro ao validar sessão Supabase:`, err);
    return {
      ok: false,
      status: 401,
      error: "Não foi possível validar a sessão.",
    };
  }
}

export function createGeminiClient(logPrefix: string): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error(`${logPrefix} GEMINI_API_KEY não configurada.`);
    return null;
  }

  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error(`${logPrefix} Erro ao inicializar cliente Gemini:`, err);
    return null;
  }
}

export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    status?: number;
    statusCode?: number;
    code?: number | string;
    message?: string;
  };
  if (
    err.status === 429 ||
    err.statusCode === 429 ||
    err.code === 429 ||
    err.code === "RESOURCE_EXHAUSTED"
  ) {
    return true;
  }
  const msg = String(err.message ?? "");
  return msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
}

export function parseJsonBody<T extends object>(
  body: unknown
): Partial<T> {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body);
      return parsed && typeof parsed === "object"
        ? (parsed as Partial<T>)
        : {};
    } catch {
      return {};
    }
  }
  if (typeof body === "object") {
    return body as Partial<T>;
  }
  return {};
}
