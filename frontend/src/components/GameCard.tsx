import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Game } from "../types";
import { getSimilarGames } from "../api";
import VerifiedBadge from "./VerifiedBadge";

export default function GameCard({ game }: { game: Game }) {
  const [similar, setSimilar] = useState<Game[] | null>(null);

  useEffect(() => {
    setSimilar(null);
    getSimilarGames(game.id)
      .then(setSimilar)
      .catch(() => setSimilar([]));
  }, [game.id]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-2xl font-bold">{game.name}</h2>
        <VerifiedBadge verified={game.verified} />
      </div>

      {game.game_format && (
        <Section label="Game Format">
          <span className="text-slate-700">{game.game_format}</span>
        </Section>
      )}

      {game.genres && game.genres.length > 0 && (
        <Section label="Genres">
          <TagList tags={game.genres} tagType="genre" color="blue" />
        </Section>
      )}

      {game.mechanisms && game.mechanisms.length > 0 && (
        <Section label="Mechanisms">
          <TagList tags={game.mechanisms} tagType="mechanism" color="purple" />
        </Section>
      )}

      {!game.verified && game.ai_rationale && (
        <details className="text-sm text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700">AI rationale</summary>
          <p className="mt-2 leading-relaxed">{game.ai_rationale}</p>
        </details>
      )}

      <Section label="Similar Games">
        {similar === null ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : similar.length === 0 ? (
          <p className="text-xs text-slate-400">None found.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {similar.map((g) => (
              <SimilarGameChip key={g.id} game={g} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function SimilarGameChip({ game }: { game: Game }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/?game=${encodeURIComponent(game.name)}`)}
      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
    >
      {game.name}
    </button>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function TagList({
  tags,
  tagType,
  color,
}: {
  tags: string[];
  tagType: "genre" | "mechanism";
  color: "blue" | "purple";
}) {
  const cls =
    color === "blue"
      ? "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
      : "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100";
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <Link
          key={t}
          to={`/tag/${tagType}/${encodeURIComponent(t)}`}
          className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${cls}`}
        >
          {t}
        </Link>
      ))}
    </div>
  );
}
