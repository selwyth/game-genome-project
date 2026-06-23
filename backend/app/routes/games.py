from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Game
from app.services.classifier import classify
from app.services.pdf_extractor import extract_text
from app.taxonomy import format_names, genre_names, mechanism_names, get_taxonomy

router = APIRouter(prefix="/api/games", tags=["games"])


class GameOut(BaseModel):
    id: int
    name: str
    bgg_id: int | None
    game_format: str | None
    genres: list[str] | None
    mechanisms: list[str] | None
    ai_rationale: str | None
    verified: bool

    class Config:
        from_attributes = True


class TaxonomyOut(BaseModel):
    formats: list[str]
    genres: list[str]
    mechanisms: list[str]


class TagDetailOut(BaseModel):
    name: str
    tag_type: str
    description: str
    games: list[GameOut]


@router.get("/taxonomy", response_model=TaxonomyOut)
def get_taxonomy_route():
    return TaxonomyOut(
        formats=format_names(),
        genres=genre_names(),
        mechanisms=mechanism_names(),
    )


@router.get("/search", response_model=list[str])
def search_games(q: str, db: Session = Depends(get_db)):
    if not q.strip():
        return []
    results = (
        db.query(Game.name)
        .filter(Game.name.ilike(f"%{q.strip()}%"))
        .order_by(Game.name)
        .limit(10)
        .all()
    )
    return [r[0] for r in results]


@router.get("/lookup", response_model=GameOut | None)
def lookup(name: str, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.name.ilike(name.strip())).first()
    if not game:
        return None
    return game


# Must be defined before /{game_id}/... routes to avoid "tags" being parsed as an int
@router.get("/tags/{tag_type}/{tag_name}", response_model=TagDetailOut)
def tag_detail(tag_type: str, tag_name: str, db: Session = Depends(get_db)):
    if tag_type not in ("genre", "mechanism"):
        raise HTTPException(status_code=400, detail="tag_type must be 'genre' or 'mechanism'.")

    taxonomy = get_taxonomy()
    entries = taxonomy["genres"]["entries"] if tag_type == "genre" else taxonomy["mechanisms"]["entries"]
    entry = next((e for e in entries if e["name"].lower() == tag_name.lower()), None)
    if not entry:
        raise HTTPException(status_code=404, detail=f"{tag_type} '{tag_name}' not found in taxonomy.")

    all_games = db.query(Game).all()
    field = "genres" if tag_type == "genre" else "mechanisms"
    matched = [
        g for g in all_games
        if tag_name.lower() in [t.lower() for t in (getattr(g, field) or [])]
    ]
    matched.sort(key=lambda g: g.name)

    return TagDetailOut(
        name=entry["name"],
        tag_type=tag_type,
        description=entry["description"].strip(),
        games=matched,
    )


class SimilarGameOut(BaseModel):
    game: GameOut
    score: float

    class Config:
        from_attributes = True


@router.get("/{game_id}/similar", response_model=list[SimilarGameOut])
def similar_games(game_id: int, db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")

    game_tags = set(game.genres or []) | set(game.mechanisms or [])
    if not game_tags:
        return []

    candidates = db.query(Game).filter(
        Game.id != game_id,
        Game.genres.isnot(None),
    ).all()

    scored = []
    for g in candidates:
        other_tags = set(g.genres or []) | set(g.mechanisms or [])
        intersection = len(game_tags & other_tags)
        if intersection > 0:
            jaccard = intersection / len(game_tags | other_tags)
            scored.append((jaccard, g))

    scored.sort(key=lambda x: -x[0])
    return [SimilarGameOut(game=g, score=round(jaccard, 2)) for jaccard, g in scored[:5]]


@router.post("/classify", response_model=GameOut)
async def classify_game(
    name: str = Form(...),
    rulebook: UploadFile = File(...),
    upload_password: str = Form(default=""),
    db: Session = Depends(get_db),
):
    from app.config import settings as s
    if s.upload_password and upload_password != s.upload_password:
        raise HTTPException(status_code=401, detail="Incorrect upload password.")

    name = name.strip()

    existing = db.query(Game).filter(Game.name.ilike(name)).first()
    if existing:
        return existing

    if not rulebook.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Rulebook must be a PDF.")

    pdf_bytes = await rulebook.read()
    rulebook_text = extract_text(pdf_bytes)
    if not rulebook_text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF.")

    result = classify(name, rulebook_text)

    game = Game(
        name=name,
        game_format=result.get("game_format"),
        genres=result.get("genres"),
        mechanisms=result.get("mechanisms"),
        ai_rationale=result.get("rationale"),
        verified=False,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return game
