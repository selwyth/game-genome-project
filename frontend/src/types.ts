export interface Game {
  id: number;
  name: string;
  bgg_id: number | null;
  game_format: string | null;
  genres: string[] | null;
  mechanisms: string[] | null;
  ai_rationale: string | null;
  verified: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SimilarGame {
  game: Game;
  score: number;
}

export interface PaginatedGames {
  total: number;
  page: number;
  page_size: number;
  items: Game[];
}

export interface TagDetail {
  name: string;
  tag_type: "genre" | "mechanism";
  description: string;
  games: Game[];
}

export interface Taxonomy {
  formats: string[];
  genres: string[];
  mechanisms: string[];
}
