import { config as loadEnv } from 'dotenv';
import express from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { spawn, ChildProcess } from 'child_process';
import { Server } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.join(__dirname, '.env') });

function readPort(name: string, fallback: number): number {
  const value = process.env[name];
  const port = value ? Number(value) : fallback;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }
  return port;
}

const PORT = readPort('PORT', 3000);
const PYTHON_PORT = readPort('PYTHON_PORT', PORT === 8000 ? 8001 : 8000);
const BACKEND_STARTUP_TIMEOUT_MS = Number(process.env.BACKEND_STARTUP_TIMEOUT_MS || 30000);
const BACKEND_HEALTHCHECK_INTERVAL_MS = Number(process.env.BACKEND_HEALTHCHECK_INTERVAL_MS || 250);

if (PORT === PYTHON_PORT) {
  throw new Error('PORT and PYTHON_PORT must be different.');
}
if (
  !Number.isFinite(BACKEND_STARTUP_TIMEOUT_MS) ||
  BACKEND_STARTUP_TIMEOUT_MS < 1000 ||
  !Number.isFinite(BACKEND_HEALTHCHECK_INTERVAL_MS) ||
  BACKEND_HEALTHCHECK_INTERVAL_MS < 50
) {
  throw new Error('Backend startup timeout and health-check interval must be valid positive numbers.');
}

const backendHealthUrl = `http://127.0.0.1:${PYTHON_PORT}/api/health`;
const isProduction =
  process.env.npm_lifecycle_event === 'start' ||
  (process.env.npm_lifecycle_event !== 'dev' && process.env.NODE_ENV === 'production');
let pythonProcess: ChildProcess | null = null;
let pythonSpawnError: Error | null = null;
let pythonExit: { code: number | null; signal: NodeJS.Signals | null } | null = null;
let httpServer: Server | null = null;
let viteServer: ViteDevServer | null = null;
let shuttingDown = false;

function isHttpError(error: unknown): error is Error & { status: number } {
  return error instanceof Error && 'status' in error && typeof error.status === 'number';
}

function startPythonBackend(): ChildProcess {
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  console.log(`[Server] Starting FastAPI with ${pythonBin} on port ${PYTHON_PORT}...`);
  const child = spawn(
    pythonBin,
    ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(PYTHON_PORT)],
    {
      cwd: __dirname,
      stdio: 'inherit',
      env: { ...process.env, PYTHON_PORT: String(PYTHON_PORT) },
    },
  );

  child.on('error', (error) => {
    pythonSpawnError = error;
    console.error('[Server] Failed to start FastAPI backend:', error);
  });
  child.on('exit', (code, signal) => {
    pythonExit = { code, signal };
    if (!shuttingDown) {
      console.error(`[Server] FastAPI backend exited unexpectedly (code ${code}, signal ${signal}).`);
      if (httpServer?.listening) void shutdown(1);
    }
  });

  pythonProcess = child;
  return child;
}

async function waitForBackendReady(): Promise<void> {
  const deadline = Date.now() + BACKEND_STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (pythonSpawnError) {
      throw new Error(`Could not spawn FastAPI backend: ${pythonSpawnError.message}`);
    }
    if (pythonExit) {
      throw new Error(
        `FastAPI backend exited before becoming ready (code ${pythonExit.code}, signal ${pythonExit.signal}).`,
      );
    }

    try {
      const response = await fetch(backendHealthUrl, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        console.log('[Server] FastAPI backend is ready.');
        return;
      }
    } catch {
      // The service is expected to refuse connections until Uvicorn is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, BACKEND_HEALTHCHECK_INTERVAL_MS));
  }

  throw new Error(`FastAPI backend did not become ready within ${BACKEND_STARTUP_TIMEOUT_MS}ms.`);
}

async function stopPythonBackend(): Promise<void> {
  const child = pythonProcess;
  if (!child || child.exitCode !== null || child.signalCode !== null) return;

  const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
  child.kill();
  let timeoutId: NodeJS.Timeout | undefined;
  const timeout = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, 5000);
  });
  await Promise.race([closed, timeout]);
  if (timeoutId) clearTimeout(timeoutId);

  if (child.exitCode === null && child.signalCode === null) {
    console.error('[Server] FastAPI did not stop gracefully; terminating it.');
    child.kill('SIGKILL');
    await closed;
  }
}

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('[Server] Shutting down...');

  if (httpServer?.listening) {
    await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
  }
  if (viteServer) await viteServer.close();
  await stopPythonBackend();
  process.exitCode = exitCode;
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));

async function main(): Promise<void> {
  try {
    startPythonBackend();
    await waitForBackendReady();

    const app = express();
    app.use(express.json({ limit: '16kb' }));

    app.all('/api/*', async (req, res) => {
      try {
        const hasBody = !['GET', 'HEAD'].includes(req.method);
        const upstreamRes = await fetch(`http://127.0.0.1:${PYTHON_PORT}${req.originalUrl}`, {
          method: req.method,
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/json',
            Accept: req.headers.accept || 'application/json',
          },
          body: hasBody ? JSON.stringify(req.body) : undefined,
          signal: AbortSignal.timeout(15000),
        });

        res.status(upstreamRes.status);
        upstreamRes.headers.forEach((value, key) => {
          if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key)) {
            res.setHeader(key, value);
          }
        });
        res.send(await upstreamRes.text());
      } catch (error) {
        console.error('[Server] API proxy request failed:', error);
        if (!res.headersSent) {
          res.status(502).json({ detail: 'FastAPI backend request failed. Please retry in a moment.' });
        }
      }
    });

    app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = isHttpError(error) ? error.status : 500;
      if (status >= 500) {
        console.error('[Server] Request processing failed:', error);
      } else {
        console.warn(`[Server] Rejected malformed request (HTTP ${status}).`);
      }
      res.status(status).json({
        detail: status === 413
          ? 'Request body is too large.'
          : status === 400
            ? 'Request body must be valid JSON.'
            : 'Internal server error.',
      });
    });

    if (isProduction) {
      const staticDirectory = path.join(__dirname, 'dist');
      app.use(express.static(staticDirectory));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(staticDirectory, 'index.html'));
      });
    } else {
      viteServer = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(viteServer.middlewares);
    }

    httpServer = app.listen(PORT, '0.0.0.0');
    await new Promise<void>((resolve, reject) => {
      httpServer?.once('listening', resolve);
      httpServer?.once('error', reject);
    });
    const address = httpServer.address();
    const listeningPort = typeof address === 'object' && address ? address.port : PORT;
    console.log(`[Server] LoopOut listening on http://0.0.0.0:${listeningPort}`);
  } catch (error) {
    console.error('[Server] Startup failed:', error);
    await shutdown(1);
  }
}

void main();
