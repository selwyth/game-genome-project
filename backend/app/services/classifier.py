import anthropic
from app.config import settings
from app.taxonomy import taxonomy_prompt_block, format_names, genre_names, mechanism_names

_client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

_TOOL = {
    "name": "classify_game",
    "description": "Output the board game classification using only values from the provided taxonomy.",
    "input_schema": {
        "type": "object",
        "properties": {
            "game_format": {
                "type": "string",
                "description": "Exactly one format name from the taxonomy.",
            },
            "genres": {
                "type": "array",
                "items": {"type": "string"},
                "description": "One or more genre names from the taxonomy.",
            },
            "mechanisms": {
                "type": "array",
                "items": {"type": "string"},
                "description": "One or more mechanism names from the taxonomy.",
            },
            "rationale": {
                "type": "string",
                "description": "2–4 sentence explanation of the classification choices.",
            },
        },
        "required": ["game_format", "genres", "mechanisms", "rationale"],
    },
}

_SYSTEM = """\
You are an expert board game taxonomist. You will be given a rulebook excerpt and must \
classify the game strictly using the taxonomy below. Only use values that appear verbatim \
in the taxonomy — do not invent new categories.

{taxonomy}
"""


def classify(game_name: str, rulebook_text: str) -> dict:
    """Call Claude to classify a game. Returns dict with game_format, genres, mechanisms, rationale."""
    system = _SYSTEM.format(taxonomy=taxonomy_prompt_block())
    user_msg = (
        f"Game name: {game_name}\n\n"
        f"Rulebook excerpt:\n{rulebook_text}\n\n"
        "Classify this game using the classify_game tool."
    )

    response = _client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=system,
        tools=[_TOOL],
        tool_choice={"type": "tool", "name": "classify_game"},
        messages=[{"role": "user", "content": user_msg}],
    )

    for block in response.content:
        if block.type == "tool_use" and block.name == "classify_game":
            result = block.input
            # Validate values against taxonomy; keep only recognized ones
            result["game_format"] = _validate_one(result.get("game_format"), format_names())
            result["genres"] = _validate_list(result.get("genres", []), genre_names())
            result["mechanisms"] = _validate_list(result.get("mechanisms", []), mechanism_names())
            return result

    raise RuntimeError("Claude did not return a classify_game tool call")


def _validate_one(value: str | None, valid: list[str]) -> str | None:
    if value in valid:
        return value
    # Try case-insensitive match
    lower = {v.lower(): v for v in valid}
    return lower.get((value or "").lower())


def _validate_list(values: list[str], valid: list[str]) -> list[str]:
    valid_set = set(valid)
    lower = {v.lower(): v for v in valid}
    result = []
    for v in values:
        if v in valid_set:
            result.append(v)
        elif v.lower() in lower:
            result.append(lower[v.lower()])
    return result
