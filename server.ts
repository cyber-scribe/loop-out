import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const PYTHON_PORT = 8000;

let pythonProcess: ChildProcess | null = null;

function startPythonBackend() {
  console.log('[Server] Spawning Python FastAPI backend on port ' + PYTHON_PORT + '...');
  const pythonBin = process.platform === 'win32' ? 'python' : 'python3';
  pythonProcess = spawn(pythonBin, [
    '-m', 'uvicorn',
    'backend.main:app',
    '--host', '127.0.0.1',
    '--port', String(PYTHON_PORT)
  ], {
    stdio: 'inherit'
  });

  pythonProcess.on('error', (err) => {
    console.error('[Server] Failed to start Python backend:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Server] Python backend exited with code ${code} (${signal})`);
  });
}

// Cleanup on process termination
process.on('SIGINT', () => {
  if (pythonProcess) pythonProcess.kill('SIGINT');
  process.exit();
});
process.on('SIGTERM', () => {
  if (pythonProcess) pythonProcess.kill('SIGTERM');
  process.exit();
});

async function main() {
  startPythonBackend();

  // Wait a moment for python backend to bind
  await new Promise((r) => setTimeout(r, 1200));

  const app = express();
  app.use(express.json());

  // Proxy /api/* to the FastAPI server
  app.all('/api/*', async (req, res) => {
    const targetUrl = `http://127.0.0.1:${PYTHON_PORT}${req.originalUrl}`;
    try {
      const hasBody = !['GET', 'HEAD'].includes(req.method);
      const upstreamRes = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'Content-Type': req.headers['content-type'] || 'application/json',
          'Accept': req.headers['accept'] || 'application/json',
        },
        body: hasBody ? JSON.stringify(req.body) : undefined,
      });

      const bodyText = await upstreamRes.text();
      res.status(upstreamRes.status);
      upstreamRes.headers.forEach((val, key) => {
        if (key !== 'content-encoding' && key !== 'content-length' && key !== 'transfer-encoding') {
          res.setHeader(key, val);
        }
      });
      res.send(bodyText);
    } catch (err) {
      console.error('[Proxy Error]', err);
      res.status(502).json({
        detail: 'FastAPI backend unavailable or starting up. Please retry in a moment.'
      });
    }
  });

  // Mount Vite middleware in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve built static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] LoopOut full-stack app listening on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
