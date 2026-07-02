import type { Game, SimilarGame, PaginatedGames, TagDetail, Taxonomy } from "./types";

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

// ── Public ────────────────────────────────────────────────────────────────────

export async function searchGames(q: string): Promise<string[]> {
  if (!q.trim()) return [];
  const res = await fetch(`${BASE}/games/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function lookupGame(name: string): Promise<Game | null> {
  const res = await fetch(`${BASE}/games/lookup?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function classifyGame(name: string, bggId: number, rulebook: File, uploadPassword?: string): Promise<Game> {
  const body = new FormData();
  body.append("name", name);
  body.append("bgg_id", String(bggId));
  body.append("rulebook", rulebook);
  if (uploadPassword) body.append("upload_password", uploadPassword);
  const res = await fetch(`${BASE}/games/classify`, { method: "POST", body });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? res.statusText);
  }
  return res.json();
}

export async function getTaxonomy(): Promise<Taxonomy> {
  const res = await fetch(`${BASE}/games/taxonomy`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getSimilarGames(gameId: number): Promise<SimilarGame[]> {
  const res = await fetch(`${BASE}/games/${gameId}/similar`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTagDetail(tagType: "genre" | "mechanism", tagName: string): Promise<TagDetail> {
  const res = await fetch(`${BASE}/games/tags/${tagType}/${encodeURIComponent(tagName)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Admin ─────────────────────────────────────────────────────────────────────

function adminHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function adminListGames(
  token: string,
  opts: { verified?: boolean; search?: string; page?: number; page_size?: number }
): Promise<PaginatedGames> {
  const params = new URLSearchParams();
  if (opts.verified !== undefined) params.set("verified", String(opts.verified));
  if (opts.search) params.set("search", opts.search);
  if (opts.page) params.set("page", String(opts.page));
  if (opts.page_size) params.set("page_size", String(opts.page_size));
  const res = await fetch(`${BASE}/admin/games?${params}`, {
    headers: adminHeaders(token),
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminCreateGame(
  token: string,
  data: { name: string; bgg_id: number; game_format?: string | null; genres?: string[]; mechanisms?: string[] }
): Promise<Game> {
  const res = await fetch(`${BASE}/admin/games`, {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail ?? res.statusText);
  }
  return res.json();
}

export async function adminUpdateGame(
  token: string,
  id: number,
  data: { name?: string; bgg_id?: number; game_format?: string | null; genres?: string[]; mechanisms?: string[] }
): Promise<Game> {
  const res = await fetch(`${BASE}/admin/games/${id}`, {
    method: "PUT",
    headers: adminHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminVerifyGame(token: string, id: number): Promise<Game> {
  const res = await fetch(`${BASE}/admin/games/${id}/verify`, {
    method: "POST",
    headers: adminHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function adminUnverifyGame(token: string, id: number): Promise<Game> {
  const res = await fetch(`${BASE}/admin/games/${id}/unverify`, {
    method: "POST",
    headers: adminHeaders(token),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
