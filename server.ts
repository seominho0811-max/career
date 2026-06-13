import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: CORS-free proxy to fetch data from GAS Web App
  app.get('/api/proxy', async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: "Missing or invalid 'url' parameter" });
    }

    try {
      console.log(`[Proxy] Fetching from Google Apps Script: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          error: `Google Apps Script returned status ${response.status}: ${response.statusText}` 
        });
      }

      const contentType = response.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          return res.status(422).json({ 
            error: "Received non-JSON content from Google Apps Script. Is the URL correct?",
            rawText: text.substring(0, 1000)
          });
        }
      }

      return res.json(data);
    } catch (error: any) {
      console.error('[Proxy Error]:', error);
      return res.status(500).json({ 
        error: `서버 측 프록시 요청 중 오류 발생: ${error.message}` 
      });
    }
  });

  // Vite middleware for development / static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Web application running at http://localhost:${PORT}`);
  });
}

startServer();
