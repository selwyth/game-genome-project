import { useState, useEffect, useCallback } from "react";
import { adminListGames } from "../api";
import type { Game, PaginatedGames } from "../types";
import VerifiedBadge from "../components/VerifiedBadge";
import EditGameModal from "../components/EditGameModal";

const TOKEN_KEY = "ggp_admin_token";

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? "");
  const [authed, setAuthed] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  const [data, setData] = useState<PaginatedGames | null>(null);
  const [filter, setFilter] = useState<"all" | "verified" | "unverified">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Game | null>(null);
  const [creating, setCreating] = useState(false);

  const PAGE_SIZE = 50;

  const load = useCallback(async (tok: string) => {
    setLoading(true);
    setError("");
    try {
      const verifiedParam =
        filter === "verified" ? true : filter === "unverified" ? false : undefined;
      const result = await adminListGames(tok, {
        verified: verifiedParam,
        search: search || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setData(result);
      setAuthed(true);
    } catch (e: unknown) {
      if (String(e).includes("unauthorized")) {
        setAuthed(false);
        setError("Invalid token.");
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [filter, search, page]);

  useEffect(() => {
    if (token && authed) load(token);
  }, [token, authed, load]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const t = tokenInput.trim();
    sessionStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    load(t);
  }

  function handleGameSaved(updated: Game) {
    if (creating) {
      setData((prev) => prev ? { ...prev, total: prev.total + 1, items: [updated, ...prev.items] } : prev);
      setCreating(false);
    } else {
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((g) => (g.id === updated.id ? updated : g)) } : prev
      );
      setEditing(updated);
    }
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-16 space-y-4">
        <h1 className="text-2xl font-bold">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            placeholder="Admin token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Game Admin</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCreating(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Add Game
          </button>
          <button
            onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setAuthed(false); setToken(""); }}
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search games…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex rounded-lg overflow-hidden border border-slate-300 text-sm">
          {(["all", "unverified", "verified"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 capitalize ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {data && (
          <span className="text-sm text-slate-500">{data.total} games</span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : data && data.items.length === 0 ? (
        <p className="text-sm text-slate-500">No games found.</p>
      ) : data ? (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Format</th>
                <th className="px-4 py-3 text-left">Genres</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((game) => (
                <tr key={game.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{game.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{game.game_format ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {game.genres?.slice(0, 2).join(", ") ?? "—"}
                    {(game.genres?.length ?? 0) > 2 && ` +${game.genres!.length - 2}`}
                  </td>
                  <td className="px-4 py-3">
                    <VerifiedBadge verified={game.verified} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(game)}
                      className="text-blue-600 hover:underline text-xs font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded px-3 py-1.5 border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          >
            ← Prev
          </button>
          <span className="text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded px-3 py-1.5 border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
          >
            Next →
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditGameModal
          game={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={handleGameSaved}
        />
      )}

      {/* Create modal */}
      {creating && (
        <EditGameModal
          game={null}
          token={token}
          onClose={() => setCreating(false)}
          onSaved={handleGameSaved}
        />
      )}
    </div>
  );
}
