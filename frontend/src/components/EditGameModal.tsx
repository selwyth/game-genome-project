import { useEffect, useState } from "react";
import type { Game, Taxonomy } from "../types";
import { adminUpdateGame, adminVerifyGame, adminUnverifyGame, getTaxonomy } from "../api";

interface Props {
  game: Game;
  token: string;
  onClose: () => void;
  onSaved: (g: Game) => void;
}

export default function EditGameModal({ game, token, onClose, onSaved }: Props) {
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [fmt, setFmt] = useState(game.game_format ?? "");
  const [genres, setGenres] = useState<string[]>(game.genres ?? []);
  const [mechs, setMechs] = useState<string[]>(game.mechanisms ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getTaxonomy().then(setTaxonomy).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const updated = await adminUpdateGame(token, game.id, {
        game_format: fmt || null,
        genres,
        mechanisms: mechs,
      });
      onSaved(updated);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleVerified() {
    setSaving(true);
    setError("");
    try {
      const updated = game.verified
        ? await adminUnverifyGame(token, game.id)
        : await adminVerifyGame(token, game.id);
      onSaved(updated);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  function toggleList(list: string[], setList: (l: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-16 px-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">{game.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Format */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Game Format
            </label>
            <select
              value={fmt}
              onChange={(e) => setFmt(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— none —</option>
              {taxonomy?.formats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Genres */}
          <CheckboxGroup
            label="Genres"
            options={taxonomy?.genres ?? []}
            selected={genres}
            onToggle={(v) => toggleList(genres, setGenres, v)}
          />

          {/* Mechanisms */}
          <CheckboxGroup
            label="Mechanisms"
            options={taxonomy?.mechanisms ?? []}
            selected={mechs}
            onToggle={(v) => toggleList(mechs, setMechs, v)}
          />

          {game.ai_rationale && (
            <details className="text-sm text-slate-500">
              <summary className="cursor-pointer hover:text-slate-700">AI rationale</summary>
              <p className="mt-2 leading-relaxed">{game.ai_rationale}</p>
            </details>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-slate-50">
          <button
            onClick={toggleVerified}
            disabled={saving}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              game.verified
                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {game.verified ? "Mark as AI-generated" : "Mark as Human-verified"}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-200">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={selected.includes(opt) ? "text-slate-900 font-medium" : "text-slate-600"}>
              {opt}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
