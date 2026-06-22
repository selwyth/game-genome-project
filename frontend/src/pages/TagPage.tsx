import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTagDetail } from "../api";
import type { TagDetail } from "../types";
import VerifiedBadge from "../components/VerifiedBadge";

export default function TagPage() {
  const { tagType, tagName } = useParams<{ tagType: string; tagName: string }>();
  const [data, setData] = useState<TagDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tagType || !tagName) return;
    setData(null);
    setError("");
    getTagDetail(tagType as "genre" | "mechanism", decodeURIComponent(tagName))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [tagType, tagName]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-slate-400">Loading…</p>;
  }

  const label = data.tag_type === "genre" ? "Genre" : "Mechanism";
  const tagColor =
    data.tag_type === "genre"
      ? "bg-blue-50 text-blue-800 border-blue-200"
      : "bg-purple-50 text-purple-800 border-purple-200";

  return (
    <div className="space-y-8">
      <div>
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-700">
          ← Back
        </Link>
        <div className="mt-3 flex items-center gap-3">
          <span className={`rounded border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${tagColor}`}>
            {label}
          </span>
          <h1 className="text-3xl font-bold">{data.name}</h1>
        </div>
        <p className="mt-3 text-slate-600 leading-relaxed max-w-2xl">{data.description}</p>
      </div>

      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          {data.games.length} game{data.games.length !== 1 ? "s" : ""} with this tag
        </h2>
        {data.games.length === 0 ? (
          <p className="text-sm text-slate-500">No games in the database have this tag yet.</p>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Format</th>
                  <th className="px-4 py-3 text-left">
                    {data.tag_type === "genre" ? "Other Genres" : "Other Mechanisms"}
                  </th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.games.map((game) => {
                  const others =
                    data.tag_type === "genre"
                      ? (game.genres ?? []).filter((g) => g !== data.name)
                      : (game.mechanisms ?? []).filter((m) => m !== data.name);
                  return (
                    <tr key={game.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          to={`/?game=${encodeURIComponent(game.name)}`}
                          className="hover:text-blue-600 hover:underline"
                        >
                          {game.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{game.game_format ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {others.slice(0, 3).map((t) => (
                            <Link
                              key={t}
                              to={`/tag/${data.tag_type}/${encodeURIComponent(t)}`}
                              className={`rounded border px-1.5 py-0.5 text-xs ${
                                data.tag_type === "genre"
                                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                              }`}
                            >
                              {t}
                            </Link>
                          ))}
                          {others.length > 3 && (
                            <span className="text-xs text-slate-400">+{others.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <VerifiedBadge verified={game.verified} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
