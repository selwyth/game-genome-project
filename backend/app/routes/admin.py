import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Game

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(authorization: str = Header(...)):
    if not authorization.startswith("Bearer ") or authorization[7:] != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid admin token.")


class GameAdminOut(BaseModel):
    id: int
    name: str
    bgg_id: int | None
    game_format: str | None
    genres: list[str] | None
    mechanisms: list[str] | None
    ai_rationale: str | None
    verified: bool
    verified_by: str | None
    verified_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GameCreate(BaseModel):
    name: str
    bgg_id: int
    game_format: str | None = None
    genres: list[str] | None = None
    mechanisms: list[str] | None = None


class GameUpdate(BaseModel):
    name: str | None = None
    bgg_id: int | None = None
    game_format: str | None = None
    genres: list[str] | None = None
    mechanisms: list[str] | None = None


class PaginatedGames(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[GameAdminOut]


@router.get("/export", dependencies=[Depends(require_admin)])
def export_csv(db: Session = Depends(get_db)):
    games = db.query(Game).order_by(Game.name).all()
    columns = [
        "Game_ID", "Name", "GameFormat",
        "Genre1", "Genre2", "Genre3", "Genre4", "Genre5",
        "Mech1", "Mech2", "Mech3", "Mech4", "Mech5",
        "Verified", "AI_Rationale",
    ]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=columns)
    writer.writeheader()
    for g in games:
        genres = g.genres or []
        mechs = g.mechanisms or []
        writer.writerow({
            "Game_ID": g.bgg_id or "",
            "Name": g.name,
            "GameFormat": FORMAT_REVERSE.get(g.game_format or "", g.game_format or ""),
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
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gamelist_export.csv"},
    )


@router.post("/games", response_model=GameAdminOut, dependencies=[Depends(require_admin)])
def create_game(body: GameCreate, db: Session = Depends(get_db)):
    existing = db.query(Game).filter(Game.name.ilike(body.name.strip())).first()
    if existing:
        raise HTTPException(status_code=409, detail="A game with that name already exists.")
    game = Game(
        name=body.name.strip(),
        bgg_id=body.bgg_id,
        game_format=body.game_format,
        genres=body.genres,
        mechanisms=body.mechanisms,
        verified=True,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return game


@router.get("/games", response_model=PaginatedGames, dependencies=[Depends(require_admin)])
def list_games(
    verified: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Game)
    if verified is not None:
        q = q.filter(Game.verified == verified)
    if search:
        q = q.filter(Game.name.ilike(f"%{search}%"))
    total = q.count()
    items = q.order_by(Game.name).offset((page - 1) * page_size).limit(page_size).all()
    return PaginatedGames(total=total, page=page, page_size=page_size, items=items)


@router.get("/games/{game_id}", response_model=GameAdminOut, dependencies=[Depends(require_admin)])
def get_game(game_id: int, db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    return game


@router.put("/games/{game_id}", response_model=GameAdminOut, dependencies=[Depends(require_admin)])
def update_game(game_id: int, body: GameUpdate, db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    if body.name is not None:
        game.name = body.name.strip()
    if body.bgg_id is not None:
        game.bgg_id = body.bgg_id
    if body.game_format is not None:
        game.game_format = body.game_format
    if body.genres is not None:
        game.genres = body.genres
    if body.mechanisms is not None:
        game.mechanisms = body.mechanisms
    game.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(game)
    return game


@router.post("/games/{game_id}/verify", response_model=GameAdminOut, dependencies=[Depends(require_admin)])
def verify_game(game_id: int, db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    game.verified = True
    game.verified_by = "admin"
    game.verified_at = datetime.utcnow()
    game.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(game)
    return game


@router.post("/games/{game_id}/unverify", response_model=GameAdminOut, dependencies=[Depends(require_admin)])
def unverify_game(game_id: int, db: Session = Depends(get_db)):
    game = db.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found.")
    game.verified = False
    game.verified_by = None
    game.verified_at = None
    game.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(game)
    return game
