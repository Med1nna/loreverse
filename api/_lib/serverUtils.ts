/// <reference types="node" />
import {
  GoogleGenAI,
  type GenerateContentConfig,
  type GenerateContentResponse,
} from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

const FALLBACK_SUPABASE_URL = "https://ajmnwyrhbdfhuwnptedy.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1IwVVrUqdBcXpAIfm0mW8Q_fByeq_W2";

export const GEMINI_PRIMARY_MODEL = "gemini-flash-lite-latest";
export const GEMINI_FALLBACK_MODEL = "gemini-flash-latest";

const GEMINI_TOTAL_TIMEOUT_MS = 45_000;
const RETRY_DELAYS_MS = [2000, 4000];

export const GEMINI_OVERLOADED_MESSAGE =
  "A IA do Google está sobrecarregada no momento. Tente novamente em alguns instantes.";

export class GeminiTimeoutError extends Error {
  constructor() {
    super("timeout");
    this.name = "GeminiTimeoutError";
  }
}

export class GeminiOverloadedError extends Error {
  cause?: unknown;
  constructor(cause?: unknown) {
    super(GEMINI_OVERLOADED_MESSAGE);
    this.name = "GeminiOverloadedError";
    this.cause = cause;
  }
}

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

export function isTransientOverloadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    status?: number | string;
    statusCode?: number | string;
    code?: number | string;
    message?: string;
  };

  const statusNum = Number(err.status ?? err.statusCode ?? err.code);
  if (statusNum === 503 || statusNum === 500) {
    return true;
  }

  const codeStr = String(err.code ?? err.status ?? "").toUpperCase();
  if (codeStr === "UNAVAILABLE" || codeStr === "INTERNAL") {
    return true;
  }

  const msg = String(err.message ?? "").toUpperCase();
  return (
    msg.includes("503") ||
    msg.includes("500") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("HIGH DEMAND") ||
    msg.includes("OVERLOADED")
  );
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new GeminiTimeoutError());
  }

  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new GeminiTimeoutError());
    };

    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function generateContentResilient(
  ai: GoogleGenAI,
  params: {
    contents: string;
    config?: GenerateContentConfig;
  },
  logPrefix: string
): Promise<GenerateContentResponse> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new GeminiTimeoutError());
    }, GEMINI_TOTAL_TIMEOUT_MS);
  });

  const invokeModel = (model: string) =>
    ai.models.generateContent({
      model,
      contents: params.contents,
      config: {
        ...params.config,
        thinkingConfig: { thinkingBudget: 0 },
        abortSignal: controller.signal,
      },
    });

  const workPromise = (async (): Promise<GenerateContentResponse> => {
    let lastOverloadError: unknown = null;

    // Primary model: initial attempt + up to 2 retries (2s, 4s) on 503/500/UNAVAILABLE
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      if (controller.signal.aborted) {
        throw new GeminiTimeoutError();
      }

      try {
        return await invokeModel(GEMINI_PRIMARY_MODEL);
      } catch (err) {
        if (controller.signal.aborted || err instanceof GeminiTimeoutError) {
          throw new GeminiTimeoutError();
        }
        if (isRateLimitError(err)) {
          throw err;
        }
        if (!isTransientOverloadError(err)) {
          throw err;
        }

        lastOverloadError = err;
        const delayMs = RETRY_DELAYS_MS[attempt];
        if (delayMs !== undefined) {
          console.warn(
            `${logPrefix} Modelo ${GEMINI_PRIMARY_MODEL} indisponível (tentativa ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}). Aguardando ${delayMs}ms...`
          );
          await abortableSleep(delayMs, controller.signal);
        }
      }
    }

    // Fallback model: single attempt
    if (controller.signal.aborted) {
      throw new GeminiTimeoutError();
    }

    console.warn(
      `${logPrefix} Retentativas esgotadas em ${GEMINI_PRIMARY_MODEL}. Tentando modelo fallback ${GEMINI_FALLBACK_MODEL}...`
    );

    try {
      return await invokeModel(GEMINI_FALLBACK_MODEL);
    } catch (err) {
      if (controller.signal.aborted || err instanceof GeminiTimeoutError) {
        throw new GeminiTimeoutError();
      }
      if (isRateLimitError(err)) {
        throw err;
      }
      if (isTransientOverloadError(err)) {
        throw new GeminiOverloadedError(err);
      }
      if (lastOverloadError) {
        throw new GeminiOverloadedError(err);
      }
      throw err;
    }
  })();

  try {
    return await Promise.race([workPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    // Suppress potential late rejection if timeout won the race
    workPromise.catch(() => {});
  }
}

export function parseJsonBody<T extends object>(body: unknown): Partial<T> {
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
