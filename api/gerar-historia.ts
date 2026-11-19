/// <reference types="node" />
import { Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  createGeminiClient,
  GEMINI_MODEL,
  isRateLimitError,
  parseJsonBody,
  verifySupabaseAuth,
} from "./_lib/serverUtils";

const LOG_PREFIX = "[api/gerar-historia]";

const SYSTEM_INSTRUCTION =
  "Você é um arquivista especialista em cultura geek. Escreva em português do Brasil, com tom de arquivo histórico, uma entrada de lore FIEL AO CÂNONE OFICIAL do universo informado. Não invente fatos. Se não houver informação canônica suficiente sobre o tema, diga isso claramente no texto. 'resumo': uma frase de até 160 caracteres. 'conteudo': de 3 a 5 parágrafos separados por uma linha em branco, sem títulos, sem markdown.";

interface GenerateStoryBody {
  universo?: unknown;
  titulo?: unknown;
  categoria?: unknown;
  orientacoes?: unknown;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  // 1. Authenticate caller via Supabase Bearer JWT
  const authResult = await verifySupabaseAuth(req, LOG_PREFIX);
  if (authResult.ok === false) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  // 2. Validate request body
  const parsed = parseJsonBody<GenerateStoryBody>(req.body);
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
  const ai = createGeminiClient(LOG_PREFIX);
  if (!ai) {
    return res.status(500).json({ error: "Serviço de IA indisponível." });
  }

  try {
    const promptLines = [
      `Universo: ${universo}`,
      `Título do registro: ${titulo}`,
      `Categoria: ${categoria}`,
    ];
    if (orientacoes) {
      promptLines.push(`Orientações adicionais do arquivista: ${orientacoes}`);
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
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
      console.error(`${LOG_PREFIX} Resposta vazia do Gemini.`);
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
      console.error(`${LOG_PREFIX} Estrutura JSON inesperada:`, rawText);
      return res.status(500).json({ error: "Formato inválido retornado pela IA." });
    }

    return res.status(200).json({
      resumo: generated.resumo.trim(),
      conteudo: generated.conteudo.trim(),
    });
  } catch (error) {
    console.error(`${LOG_PREFIX} Erro ao gerar história com Gemini:`, error);

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
