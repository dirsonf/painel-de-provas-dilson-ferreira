/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Direct download route for the standalone single-file HTML version
  app.get('/api/download-singlefile-html', (_req, res) => {
    const singleFilePath = path.resolve(__dirname, 'dist-singlefile/painel-de-provas-dilson-ferreira.html');
    const fallbackPath = path.resolve(__dirname, 'dist-singlefile/index.html');
    const targetFile = fs.existsSync(singleFilePath) ? singleFilePath : fallbackPath;

    if (fs.existsSync(targetFile)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.download(targetFile, 'painel-de-provas-dilson-ferreira.html');
    } else {
      res.status(404).json({ error: 'Arquivo HTML único ainda não foi gerado.' });
    }
  });

  // API endpoint for creative AI suggestions and prompts for photo usage
  app.post('/api/ai-suggestions', async (req, res) => {
    try {
      const { prompt } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(200).json({ 
          content: 'Dicas geradas pelo modo estúdio Dilson Ferreira com sucesso.',
          isFallback: true 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      return res.json({ content: response.text });
    } catch (error: any) {
      console.warn('AI suggestions error:', error?.message);
      return res.status(500).json({ error: error?.message || 'Falha ao gerar sugestões com IA' });
    }
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: false,
      allowedHosts: [
        'painel-de-provas-dilson-ferreira.ai.studio',
        '.ai.studio',
        'dilsonferreira.com.br',
        'www.dilsonferreira.com.br',
        '.run.app',
      ],
    },
    appType: 'spa'
  });

  app.use(vite.middlewares);

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Dilson Ferreira Photo Studio server running on http://0.0.0.0:${port}`);
  });
}

startServer();
