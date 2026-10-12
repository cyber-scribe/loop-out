# LoopOut

LoopOut helps you step away from screens with one personalized, five-minute offline activity when you feel overwhelmed.

Describe how you feel, optionally choose an environment or activity type, then put the device down. There are no accounts, streaks, or timers.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: FastAPI
- AI: open-weight model via Groq’s OpenAI-compatible API (`AI_API_BASE_URL`, default Groq)

If `AI_API_KEY` is empty, LoopOut uses curated fallback activities.

## Run locally

**Prerequisites:** Node.js 20.19+ (or 22.12+) and Python 3.10+

1. Install frontend dependencies:

   ```bash
   npm install
   ```

2. Install backend dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Copy `.env.example` to `.env` and set `AI_API_KEY` if you want live AI suggestions. Leave it empty to use fallback activities.

4. Start the app (Vite frontend plus FastAPI via the Node server):

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

You can also run the API on its own:

```bash
uvicorn backend.main:app --reload --port 8000
```

## Tests and build

```bash
npm run build
npm run lint
pytest backend/tests/
```

On Windows, if `python3` is not available, start FastAPI with `python -m uvicorn` as in the command above.
