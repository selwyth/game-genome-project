from functools import lru_cache
import yaml
from app.config import settings


@lru_cache(maxsize=1)
def _load() -> dict:
    with open(settings.taxonomy_path) as f:
        return yaml.safe_load(f)


def get_taxonomy() -> dict:
    """Return taxonomy, reloading from disk each call (cache invalidated on import)."""
    # Clear cache so edits to taxonomy.yaml take effect without restart.
    _load.cache_clear()
    return _load()


def format_names() -> list[str]:
    return [f["name"] for f in get_taxonomy()["formats"]]


def genre_names() -> list[str]:
    return [g["name"] for g in get_taxonomy()["genres"]["entries"]]


def mechanism_names() -> list[str]:
    return [m["name"] for m in get_taxonomy()["mechanisms"]["entries"]]


def taxonomy_prompt_block() -> str:
    """Render taxonomy as a compact reference for the classifier prompt."""
    t = get_taxonomy()
    lines = ["=== GAME FORMATS (pick exactly one) ==="]
    for f in t["formats"]:
        lines.append(f"  {f['name']}: {f['description'].strip()}")

    lines.append("\n=== GENRES (pick all that apply, minimum 1) ===")
    for g in t["genres"]["entries"]:
        lines.append(f"  {g['name']}: {g['description'].strip()}")

    lines.append("\n=== MECHANISMS (pick all that apply, minimum 1) ===")
    for m in t["mechanisms"]["entries"]:
        lines.append(f"  {m['name']}: {m['description'].strip()}")

    return "\n".join(lines)
