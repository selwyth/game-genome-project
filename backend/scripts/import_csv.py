"""
Import games from the GGP CSV into the database.

Usage (from backend/):
    python -m scripts.import_csv --csv /path/to/gamelist.csv

Games with at least one genre or mechanism are imported as verified=True.
Games with no classifications are imported as verified=False with nulls.
Duplicate names (case-insensitive) are skipped.
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal, Base, engine
from app.models import Game

# Map CSV GameFormat codes to the taxonomy's full format names
FORMAT_MAP = {
    "IPII": "IPII (Competitive)",
    "PPII": "PPII (Competitive Collaboration)",
    "PIIP-1": "PIIP-1 (Cooperative)",
    "PIIP-2": "PIIP-2 (Cooperative-Coordinative)",
    "IPPI-K": "IPPI-K (Semi-Cooperative)",
    "IIPI-K": "IIPI-K (Partnerships)",
    "IPPI-D": "IPPI-D (Alliances)",
    "PPPI-D": "IPPI-D (Alliances)",
    "**P*-H": "**P*-H (Hidden Loyalties)",
}


def parse_row(row: dict) -> dict | None:
    name = row.get("Name", "").strip()
    if not name:
        return None

    bgg_id_raw = row.get("Game_ID", "").strip()
    bgg_id = int(bgg_id_raw) if bgg_id_raw.isdigit() else None

    fmt_code = row.get("GameFormat", "").strip()
    game_format = FORMAT_MAP.get(fmt_code) if fmt_code else None

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
        existing = {g.name.lower(): g for g in db.query(Game).all()}
        inserted = updated = skipped = 0

        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                data = parse_row(row)
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
