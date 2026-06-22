from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./ggp.db"
    anthropic_api_key: str
    admin_token: str = "change-me"
    # Path to taxonomy.yaml. In production this is relative to backend/ working dir.
    taxonomy_path: str = "../taxonomy.yaml"
    # If set, the classify endpoint requires this password. Leave empty to disable.
    upload_password: str = ""
    # Path to built frontend static files. Set to ../frontend/dist in production.
    static_dir: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
