"""
Import games from the GGP CSV into the database.

Usage (from backend/):
    python -m scripts.import_csv --csv /path/to/gamelist.csv [--upsert]

Games with at least one genre or mechanism are imported as verified=True.
Games with no classifications are imported as verified=False with nulls.
Duplicate names (case-insensitive) are skipped unless --upsert is passed.
GameFormat values must match taxonomy.yaml format names exactly.
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, Base, engine
from app.models import Game
from app.taxonomy import format_names


def parse_row(row: dict, valid_formats: set[str]) -> dict | None:
    name = row.get("Name", "").strip()
    if not name:
        return None

    bgg_id_raw = row.get("Game_ID", "").strip()
    bgg_id = int(bgg_id_raw) if bgg_id_raw.isdigit() else None

    fmt = row.get("GameFormat", "").strip()
    if fmt and fmt not in valid_formats:
        print(f"  WARNING: unknown GameFormat '{fmt}' for '{name}' — skipping format.")
        fmt = None
    game_format = fmt or None

    genres = [
        v.strip() for k in ["Genre1", "Genre2", "Genre3", "Genre4", "Genre5"]
        if (v := row.get(k, "").strip())
    ]
    mechanisms = [
        v.strip() for k in ["Mech1", "Mech2", "Mech3", "Mech4", "Mech5"]
        if (v := row.get(k, "").strip())
    ]

    has_data = bool(genres or mechanisms or game_format)

    return {
        "name": name,
        "bgg_id": bgg_id,
        "game_format": game_format,
        "genres": genres or None,
        "mechanisms": mechanisms or None,
        "verified": has_data,
    }


def run(csv_path: str, upsert: bool = False):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        valid_formats = set(format_names())
        existing = {g.name.lower(): g for g in db.query(Game).all()}
        inserted = updated = skipped = 0

        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data = parse_row(row, valid_formats)
                if not data:
                    continue
                key = data["name"].lower()
                if key in existing:
                    if upsert:
                        game = existing[key]
                        game.bgg_id = data["bgg_id"]
                        game.game_format = data["game_format"]
                        game.genres = data["genres"]
                        game.mechanisms = data["mechanisms"]
                        game.verified = data["verified"]
                        updated += 1
                    else:
                        skipped += 1
                    continue
                game = Game(**data)
                db.add(game)
                existing[key] = game
                inserted += 1

        db.commit()
        if upsert:
            print(f"Imported {inserted} new, updated {updated} existing games.")
        else:
            print(f"Imported {inserted} games, skipped {skipped} duplicates.")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, help="Path to gamelist CSV")
    parser.add_argument("--upsert", action="store_true", help="Update existing games instead of skipping them")
    args = parser.parse_args()
    run(args.csv, upsert=args.upsert)
