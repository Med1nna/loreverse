/// <reference types="node" />
import { Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createGeminiClient,
  GEMINI_OVERLOADED_MESSAGE,
  GeminiOverloadedError,
  GeminiTimeoutError,
  generateContentResilient,
  isRateLimitError,
  isTransientOverloadError,
  parseJsonBody,
  verifySupabaseAuth,
} from "./_lib/serverUtils.js";

const LOG_PREFIX = "[api/gerar-universo]";
const MAX_TEMAS = 6;
const MAX_RESUMO_CHARS = 140;

const VALID_CATEGORIAS = new Set([
  "Personagem",
  "Evento",
  "Local",
  "Facção",
  "Era",
]);

const SYSTEM_INSTRUCTION =
  "Você é um arquivista especialista em cultura geek. Para o universo informado, escreva em português do Brasil uma 'descricao' de 1 a 2 frases e liste no máximo 6 'temas' de lore MAIS IMPORTANTES e FIÉIS AO CÂNONE OFICIAL, variando as categorias (pelo menos um Personagem, um Evento e um Local). 'resumo' com até 140 caracteres. Não invente fatos. Se o universo não existir ou for desconhecido, retorne temas vazio.";

export const config = {
  maxDuration: 60,
};

interface GenerateUniverseBody {
  nome?: unknown;
  orientacoes?: unknown;
}

interface RawTema {
  titulo?: unknown;
  categoria?: unknown;
  resumo?: unknown;
}

interface ValidTema {
  titulo: string;
  categoria: "Personagem" | "Evento" | "Local" | "Facção" | "Era";
  resumo: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Método não permitido." });
    }

    // 1. Authenticate caller via Supabase Bearer JWT
    const authResult = await verifySupabaseAuth(req, LOG_PREFIX);
    if (authResult.ok === false) {
      return res.status(authResult.status).json({ error: authResult.error });
    }

    // 2. Validate request body (guard against Vercel req.body JSON getter throwing)
    let rawBody: unknown;
    try {
      rawBody = req.body;
    } catch {
      return res.status(400).json({ error: "Corpo JSON inválido." });
    }

    const parsed = parseJsonBody<GenerateUniverseBody>(rawBody);
    const nome = typeof parsed.nome === "string" ? parsed.nome.trim() : "";
    const orientacoes =
      typeof parsed.orientacoes === "string" ? parsed.orientacoes.trim() : "";

    if (!nome) {
      return res.status(400).json({
        error: "Campo obrigatório ausente: nome.",
      });
    }

    // 3. Call Gemini server-side only (no database writes) with retries, fallback, and 45s timeout
    const ai = createGeminiClient(LOG_PREFIX);
    if (!ai) {
      return res.status(500).json({ error: "Serviço de IA indisponível." });
    }

    const promptLines = [`Universo: ${nome}`];
    if (orientacoes) {
      promptLines.push(`Orientações adicionais do arquivista: ${orientacoes}`);
    }

    const response = await generateContentResilient(
      ai,
      {
        contents: promptLines.join("\n"),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              descricao: {
                type: Type.STRING,
                description: "Descrição de 1 a 2 frases do universo em português do Brasil.",
              },
              temas: {
                type: Type.ARRAY,
                description:
                  "Lista de no máximo 6 temas de lore mais importantes e fiéis ao cânone oficial, ou lista vazia se o universo não existir ou for desconhecido.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    titulo: {
                      type: Type.STRING,
                      description: "Título canônico do tema.",
                    },
                    categoria: {
                      type: Type.STRING,
                      enum: ["Personagem", "Evento", "Local", "Facção", "Era"],
                      description: "Categoria catalográfica do tema.",
                    },
                    resumo: {
                      type: Type.STRING,
                      description: "Resumo curto de até 140 caracteres.",
                    },
                  },
                  required: ["titulo", "categoria", "resumo"],
                },
              },
            },
            required: ["descricao", "temas"],
          },
        },
      },
      LOG_PREFIX
    );

    const rawText = (response.text ?? "").trim();
    if (!rawText) {
      console.error(`${LOG_PREFIX} Resposta vazia do Gemini.`);
      return res.status(500).json({ error: "Resposta inválida da IA." });
    }

    const generated = JSON.parse(rawText) as {
      descricao?: unknown;
      temas?: unknown;
    };

    if (
      typeof generated.descricao !== "string" ||
      !Array.isArray(generated.temas)
    ) {
      console.error(`${LOG_PREFIX} Estrutura JSON inesperada:`, rawText);
      return res
        .status(500)
        .json({ error: "Formato inválido retornado pela IA." });
    }

    const temas: ValidTema[] = [];
    const seenTitles = new Set<string>();

    for (const item of generated.temas as RawTema[]) {
      if (temas.length >= MAX_TEMAS) break;
      if (!item || typeof item !== "object") continue;
      const titulo = typeof item.titulo === "string" ? item.titulo.trim() : "";
      const categoria =
        typeof item.categoria === "string" ? item.categoria.trim() : "";
      let resumo = typeof item.resumo === "string" ? item.resumo.trim() : "";
      if (resumo.length > MAX_RESUMO_CHARS) {
        resumo = `${resumo.slice(0, MAX_RESUMO_CHARS - 1).trimEnd()}…`;
      }

      if (!titulo || !VALID_CATEGORIAS.has(categoria)) continue;
      const normalizedKey = titulo.toLowerCase();
      if (seenTitles.has(normalizedKey)) continue;
      seenTitles.add(normalizedKey);

      temas.push({
        titulo,
        categoria: categoria as ValidTema["categoria"],
        resumo,
      });
    }

    return res.status(200).json({
      descricao: generated.descricao.trim(),
      temas,
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Erro ao gerar universo com Gemini:`, error);

    if (res.headersSent) {
      return;
    }

    if (error instanceof GeminiTimeoutError) {
      return res.status(503).json({ error: "timeout" });
    }

    if (error instanceof GeminiOverloadedError || isTransientOverloadError(error)) {
      return res.status(503).json({ error: GEMINI_OVERLOADED_MESSAGE });
    }

    if (isRateLimitError(error)) {
      return res.status(429).json({
        error: "Limite gratuito da IA atingido.",
      });
    }

    return res.status(500).json({
      error: "Erro interno ao pesquisar universo.",
    });
  }
}
