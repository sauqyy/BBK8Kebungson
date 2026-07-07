import random
from datetime import datetime, timedelta
from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import User

telegram_bp = Blueprint("telegram", __name__)

OTP_TTL_MINUTES = 10


@telegram_bp.post("/otp")
@jwt_required()
def generate_otp():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan"}), 404

    while True:
        code = f"{random.randint(0, 999999):06d}"
        clash = User.query.filter(
            User.telegram_otp_code == code,
            User.telegram_otp_expires_at > datetime.utcnow(),
            User.id != user.id,
        ).first()
        if not clash:
            break

    user.telegram_otp_code = code
    user.telegram_otp_expires_at = datetime.utcnow() + timedelta(minutes=OTP_TTL_MINUTES)
    db.session.commit()

    return jsonify(
        {
            "code": code,
            "expires_in": OTP_TTL_MINUTES * 60,
            "bot_username": current_app.config.get("TELEGRAM_BOT_USERNAME") or None,
        }
    )


@telegram_bp.get("/status")
@jwt_required()
def status():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan"}), 404

    return jsonify(
        {
            "connected": bool(user.telegram_chat_id),
            "telegram_username": user.telegram_username,
        }
    )


@telegram_bp.post("/disconnect")
@jwt_required()
def disconnect():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan"}), 404

    user.telegram_chat_id = None
    user.telegram_username = None
    user.telegram_otp_code = None
    user.telegram_otp_expires_at = None
    db.session.commit()

    return jsonify({"success": True, "message": "Koneksi Telegram berhasil diputuskan"})
