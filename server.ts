/// <reference types="node" />
import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import gerarHistoriaHandler from "./api/gerar-historia";

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();
  app.use(express.json());

  // Mount Vercel serverless handler locally for AI Studio preview & local dev
  app.all("/api/gerar-historia", async (req, res) => {
    try {
      await gerarHistoriaHandler(
        req as unknown as VercelRequest,
        res as unknown as VercelResponse
      );
    } catch (error) {
      console.error("[server] Erro inesperado em /api/gerar-historia:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Erro interno ao gerar história." });
      }
    }
  });

  if (isProd) {
    const distDir = path.resolve(process.cwd(), "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req, res) => {
      const indexHtml = path.join(distDir, "index.html");
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send("Build not found.");
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LoreVerse server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
