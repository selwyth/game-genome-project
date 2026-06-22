# GGP Board Game Classifier

## Setup

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env: set DATABASE_URL, ANTHROPIC_API_KEY, ADMIN_TOKEN, TAXONOMY_PATH
```

**SQLite (quick start):** leave `DATABASE_URL=sqlite:///./ggp.db` in `.env`.  
**Postgres:** set `DATABASE_URL=postgresql://user:password@localhost:5432/ggp`.

Start the server:
```bash
uvicorn app.main:app --reload
```

### 2. Backfill CSV

```bash
cd backend
python -m scripts.import_csv --csv /Users/davidfeng/GGP/Taxonomy\ of\ Board\ Games\ -\ gamelist.csv
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 — API calls proxy to the backend at :8000.

---

## Updating the Taxonomy

Edit `/Users/davidfeng/GGP/taxonomy.yaml` and save. The backend reloads it on the next
classification request — no restart needed. The admin edit modal's dropdowns also reflect
the updated list on next page load.

---

## Admin

Visit http://localhost:5173/admin and enter the `ADMIN_TOKEN` from your `.env`.

- **Filter** by All / Unverified / Verified, or search by name.
- **Edit** a game: click Edit → adjust format/genres/mechanisms via checkboxes → Save.
- **Verify** a game: click "Mark as Human-verified" in the edit modal.
- The public view immediately shows the updated badge after verification.

---

## Project Structure

```
backend/
  app/
    main.py          # FastAPI app + CORS
    config.py        # Settings (reads .env)
    database.py      # SQLAlchemy engine + session
    models.py        # Game model
    taxonomy.py      # Loads taxonomy.yaml, builds prompt block
    routes/
      games.py       # GET /api/games/lookup, POST /api/games/classify
      admin.py       # CRUD under /api/admin/games (token-protected)
    services/
      classifier.py  # Calls Claude with taxonomy prompt + tool_use
      pdf_extractor.py
  scripts/
    import_csv.py    # One-time backfill from CSV

frontend/
  src/
    pages/
      Home.tsx       # Search + classify flow
      Admin.tsx      # Admin dashboard with token login
    components/
      GameCard.tsx       # Public result display
      EditGameModal.tsx  # Admin edit/verify modal
      VerifiedBadge.tsx  # AI-generated / Human-verified badge
    api.ts           # All fetch calls
    types.ts         # Shared TypeScript types
```
