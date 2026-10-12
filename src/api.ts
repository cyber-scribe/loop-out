import { ResetRequest, ResetResponse, HealthResponse } from './types';

// Support deployable separate backend via VITE_API_BASE_URL if configured, otherwise relative /api
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function checkHealth(): Promise<HealthResponse> {
  const url = `${API_BASE}/api/health`;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function generateReset(request: ResetRequest): Promise<ResetResponse> {
  const url = `${API_BASE}/api/generate-reset`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    let detailMsg = 'Unable to generate reset activity at this time.';
    try {
      const errJson = await res.json();
      if (errJson && errJson.detail) {
        detailMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(detailMsg);
  }

  return res.json();
}
