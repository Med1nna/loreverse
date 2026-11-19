/// <reference types="node" />
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const FALLBACK_SUPABASE_URL = "https://ajmnwyrhbdfhuwnptedy.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1IwVVrUqdBcXpAIfm0mW8Q_fByeq_W2";

const SYSTEM_INSTRUCTION =
  "Você é um arquivista especialista em cultura geek. Escreva em português do Brasil, com tom de arquivo histórico, uma entrada de lore FIEL AO CÂNONE OFICIAL do universo informado. Não invente fatos. Se não houver informação canônica suficiente sobre o tema, diga isso claramente no texto. 'resumo': uma frase de até 160 caracteres. 'conteudo': de 3 a 5 parágrafos separados por uma linha em branco, sem títulos, sem markdown.";

interface GenerateStoryBody {
  universo?: unknown;
  titulo?: unknown;
  categoria?: unknown;
  orientacoes?: unknown;
}

function isRateLimitError(error: unknown): boolean {
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

function parseBody(body: unknown): GenerateStoryBody {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as GenerateStoryBody;
    } catch {
      return {};
    }
  }
  if (typeof body === "object") {
    return body as GenerateStoryBody;
  }
  return {};
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  // 1. Authenticate caller via Supabase Bearer JWT
  const authHeader = req.headers.authorization;
  if (
    typeof authHeader !== "string" ||
    !authHeader.startsWith("Bearer ")
  ) {
    return res.status(401).json({ error: "Token de autenticação ausente." });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return res.status(401).json({ error: "Token de autenticação inválido." });
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
      console.error("[api/gerar-historia] Falha na verificação do token:", authError);
      return res.status(401).json({ error: "Sessão inválida ou expirada." });
    }
  } catch (err) {
    console.error("[api/gerar-historia] Erro ao validar sessão Supabase:", err);
    return res.status(401).json({ error: "Não foi possível validar a sessão." });
  }

  // 2. Validate request body
  const parsed = parseBody(req.body);
  const universo =
    typeof parsed.universo === "string" ? parsed.universo.trim() : "";
  const titulo = typeof parsed.titulo === "string" ? parsed.titulo.trim() : "";
  const categoria =
    typeof parsed.categoria === "string" ? parsed.categoria.trim() : "";
  const orientacoes =
    typeof parsed.orientacoes === "string" ? parsed.orientacoes.trim() : "";

  if (!universo || !titulo || !categoria) {
    return res.status(400).json({
      error: "Campos obrigatórios ausentes: universo, titulo e categoria.",
    });
  }

  // 3. Call Gemini server-side only
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("[api/gerar-historia] GEMINI_API_KEY não configurada.");
    return res.status(500).json({ error: "Serviço de IA indisponível." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const promptLines = [
      `Universo: ${universo}`,
      `Título do registro: ${titulo}`,
      `Categoria: ${categoria}`,
    ];
    if (orientacoes) {
      promptLines.push(`Orientações adicionais do arquivista: ${orientacoes}`);
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: promptLines.join("\n"),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumo: {
              type: Type.STRING,
              description: "Uma frase de até 160 caracteres resumindo a entrada.",
            },
            conteudo: {
              type: Type.STRING,
              description:
                "De 3 a 5 parágrafos separados por uma linha em branco, sem títulos e sem markdown.",
            },
          },
          required: ["resumo", "conteudo"],
        },
      },
    });

    const rawText = (response.text ?? "").trim();
    if (!rawText) {
      console.error("[api/gerar-historia] Resposta vazia do Gemini.");
      return res.status(500).json({ error: "Resposta inválida da IA." });
    }

    const generated = JSON.parse(rawText) as {
      resumo?: unknown;
      conteudo?: unknown;
    };

    if (
      typeof generated.resumo !== "string" ||
      typeof generated.conteudo !== "string" ||
      !generated.resumo.trim() ||
      !generated.conteudo.trim()
    ) {
      console.error("[api/gerar-historia] Estrutura JSON inesperada:", rawText);
      return res.status(500).json({ error: "Formato inválido retornado pela IA." });
    }

    return res.status(200).json({
      resumo: generated.resumo.trim(),
      conteudo: generated.conteudo.trim(),
    });
  } catch (error) {
    console.error("[api/gerar-historia] Erro ao gerar história com Gemini:", error);

    if (isRateLimitError(error)) {
      return res.status(429).json({
        error: "Limite gratuito da IA atingido.",
      });
    }

    return res.status(500).json({
      error: "Erro interno ao gerar história.",
    });
  }
}
