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
                "description": (
                    "The top 3 most representative genre names from the taxonomy. "
                    "If more genres apply, list the remainder in additional_genres."
                ),
                "maxItems": 3,
            },
            "additional_genres": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Further genres from the taxonomy that apply beyond the top 3. "
                    "Leave empty if none."
                ),
            },
            "proposed_genres": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Genre labels NOT in the taxonomy that you believe should exist. "
                    "Leave empty if none."
                ),
            },
            "mechanisms": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "The top 5 most important mechanism names from the taxonomy. "
                    "If more mechanisms apply, list the remainder in additional_mechanisms."
                ),
                "maxItems": 5,
            },
            "additional_mechanisms": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Further mechanisms from the taxonomy that apply beyond the top 5. "
                    "Leave empty if none."
                ),
            },
            "proposed_mechanisms": {
                "type": "array",
                "items": {"type": "string"},
                "description": (
                    "Mechanism labels NOT in the taxonomy that you believe should exist. "
                    "Leave empty if none."
                ),
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

When choosing Genres: focus primarily on sections describing how the game is won or ended — \
look for headings such as "How to Win", "Game End", "Victory", "Winning the Game", \
"End of Game", "Scoring", or similar. The win condition is the strongest signal for genre.

When choosing Mechanisms: focus primarily on sections describing turn structure — \
look for headings such as "Sequence of Play", "Turn Order", "A Player's Turn", \
"Phase Structure", "Round Summary", or similar. If no such section exists, infer from \
the general rules how a turn or round is structured.

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
            inp = block.input

            # Validate primary tags against taxonomy
            game_format = _validate_one(inp.get("game_format"), format_names())
            genres = _validate_list(inp.get("genres", [])[:3], genre_names())
            mechanisms = _validate_list(inp.get("mechanisms", [])[:5], mechanism_names())

            # Build rationale, appending overflow and proposed tags
            rationale_parts = [inp.get("rationale", "").strip()]

            additional_genres = _validate_list(inp.get("additional_genres", []), genre_names())
            additional_mechanisms = _validate_list(inp.get("additional_mechanisms", []), mechanism_names())
            proposed_genres = [g.strip() for g in inp.get("proposed_genres", []) if g.strip()]
            proposed_mechanisms = [m.strip() for m in inp.get("proposed_mechanisms", []) if m.strip()]

            if additional_genres:
                rationale_parts.append(
                    f"Additional genres that also apply: {', '.join(additional_genres)}."
                )
            if additional_mechanisms:
                rationale_parts.append(
                    f"Additional mechanisms that also apply: {', '.join(additional_mechanisms)}."
                )
            if proposed_genres:
                rationale_parts.append(
                    f"Proposed new genres not yet in taxonomy: {', '.join(proposed_genres)}."
                )
            if proposed_mechanisms:
                rationale_parts.append(
                    f"Proposed new mechanisms not yet in taxonomy: {', '.join(proposed_mechanisms)}."
                )

            return {
                "game_format": game_format,
                "genres": genres,
                "mechanisms": mechanisms,
                "rationale": " ".join(rationale_parts),
            }

    raise RuntimeError("Claude did not return a classify_game tool call")


def _validate_one(value: str | None, valid: list[str]) -> str | None:
    if value in valid:
        return value
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
