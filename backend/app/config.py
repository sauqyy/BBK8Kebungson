import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Config:
    SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)

    _db_url = os.environ.get("DATABASE_URL", "").strip()
    if not _db_url:
        _db_url = "sqlite:///" + os.path.join(BASE_DIR, "instance", "kas_kkn.db")
    elif _db_url.startswith("postgres://"):
        _db_url = _db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif _db_url.startswith("postgresql://"):
        _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    CORS_ALLOWED_ORIGINS = os.environ.get("CORS_ALLOWED_ORIGINS", "").strip()

    UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB per file
    ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf"}

    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "true").lower() == "true"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "").strip()
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "").strip()
    MAIL_FROM = os.environ.get("MAIL_FROM", "").strip() or MAIL_USERNAME
    # Kalau diisi, SEMUA email notifikasi dikirim ke alamat ini (dipakai untuk
    # testing supaya tidak salah kirim ke email anggota yang belum tentu asli).
    MAIL_TEST_OVERRIDE_TO = os.environ.get("MAIL_TEST_OVERRIDE_TO", "").strip()

    TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    TELEGRAM_BOT_USERNAME = os.environ.get("TELEGRAM_BOT_USERNAME", "").strip()
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
