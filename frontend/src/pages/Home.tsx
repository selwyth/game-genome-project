import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { lookupGame, classifyGame } from "../api";
import type { Game } from "../types";
import GameCard from "../components/GameCard";

type State =
  | { phase: "idle" }
  | { phase: "not-found"; name: string }
  | { phase: "classifying" }
  | { phase: "done"; game: Game }
  | { phase: "error"; message: string };

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("game") ?? "");
  const [state, setState] = useState<State>({ phase: "idle" });
  const [uploadPassword, setUploadPassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-search when ?game= param is present
  useEffect(() => {
    const name = searchParams.get("game");
    if (name) {
      setQuery(name);
      doSearch(name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("game")]);

  async function doSearch(name: string) {
    if (!name.trim()) return;
    setState({ phase: "classifying" });
    try {
      const game = await lookupGame(name.trim());
      setState(game ? { phase: "done", game } : { phase: "not-found", name: name.trim() });
    } catch (err: unknown) {
      setState({ phase: "error", message: String(err) });
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchParams(query.trim() ? { game: query.trim() } : {});
    await doSearch(query);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (state.phase !== "not-found") return;
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setState({ phase: "classifying" });
    try {
      const game = await classifyGame(state.name, file, uploadPassword || undefined);
      setState({ phase: "done", game });
    } catch (err: unknown) {
      setState({ phase: "error", message: String(err) });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-1">Classify a Board Game</h1>
        <p className="text-slate-500">
          Look up any game to see its format, genres, and mechanisms.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setState({ phase: "idle" });
          }}
          placeholder="e.g. Pandemic"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={state.phase === "classifying"}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {state.phase === "classifying" ? "Looking up…" : "Search"}
        </button>
      </form>

      {state.phase === "not-found" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
          <p className="text-sm text-amber-800">
            <strong>{state.name}</strong> isn't in the database yet. Upload its rulebook (PDF)
            to classify it.
          </p>
          <form onSubmit={handleUpload} className="flex flex-col gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,application/pdf"
              required
              className="text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <input
              type="password"
              placeholder="Upload password"
              value={uploadPassword}
              onChange={(e) => setUploadPassword(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              className="self-start rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Classify with AI
            </button>
          </form>
        </div>
      )}

      {state.phase === "classifying" && (
        <div className="flex items-center gap-3 text-slate-500">
          <Spinner />
          <span className="text-sm">Looking up…</span>
        </div>
      )}

      {state.phase === "done" && <GameCard game={state.game} />}

      {state.phase === "error" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
