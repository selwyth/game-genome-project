"""
Export games from the database to CSV.

Usage (from backend/):
    python -m scripts.export_csv --out /path/to/gamelist.csv

The output format matches the import_csv expected columns so you can
edit and re-import with --upsert.
"""
import argparse
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models import Game

COLUMNS = [
    "Game_ID", "Name", "GameFormat",
    "Genre1", "Genre2", "Genre3", "Genre4", "Genre5",
    "Mech1", "Mech2", "Mech3", "Mech4", "Mech5",
    "Verified", "AI_Rationale",
]


def run(out_path: str):
    db = SessionLocal()
    try:
        games = db.query(Game).order_by(Game.name).all()
        with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=COLUMNS)
            writer.writeheader()
            for g in games:
                genres = g.genres or []
                mechs = g.mechanisms or []
                writer.writerow({
                    "Game_ID": g.bgg_id or "",
                    "Name": g.name,
                    "GameFormat": g.game_format or "",
                    "Genre1": genres[0] if len(genres) > 0 else "",
                    "Genre2": genres[1] if len(genres) > 1 else "",
                    "Genre3": genres[2] if len(genres) > 2 else "",
                    "Genre4": genres[3] if len(genres) > 3 else "",
                    "Genre5": genres[4] if len(genres) > 4 else "",
                    "Mech1": mechs[0] if len(mechs) > 0 else "",
                    "Mech2": mechs[1] if len(mechs) > 1 else "",
                    "Mech3": mechs[2] if len(mechs) > 2 else "",
                    "Mech4": mechs[3] if len(mechs) > 3 else "",
                    "Mech5": mechs[4] if len(mechs) > 4 else "",
                    "Verified": "TRUE" if g.verified else "FALSE",
                    "AI_Rationale": g.ai_rationale or "",
                })
        print(f"Exported {len(games)} games to {out_path}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="Path to write CSV")
    args = parser.parse_args()
    run(args.out)
