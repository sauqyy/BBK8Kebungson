import os
from flask import Flask, send_from_directory
from app.config import Config, BASE_DIR
from app.extensions import db, jwt, cors


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(os.path.join(BASE_DIR, "instance"), exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)

    allowed_origins = [o.strip() for o in app.config["CORS_ALLOWED_ORIGINS"].split(",") if o.strip()]
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": allowed_origins or "*"}},
        supports_credentials=True,
    )

    from app.routes.auth import auth_bp
    from app.routes.transactions import transactions_bp
    from app.routes.members import members_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.reports import reports_bp
    from app.routes.categories import categories_bp
    from app.routes.telegram import telegram_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(transactions_bp, url_prefix="/api/transactions")
    app.register_blueprint(members_bp, url_prefix="/api/members")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(telegram_bp, url_prefix="/api/telegram")

    with app.app_context():
        db.create_all()

    from app.telegram_bot import start_telegram_bot

    start_telegram_bot(app)

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
