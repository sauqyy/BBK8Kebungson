from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models import User
from app.utils import save_upload

auth_bp = Blueprint("auth", __name__)

AVATAR_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("username") or "").strip()
    password = data.get("password") or ""

    user = User.query.filter(
        db.or_(User.username == identifier, User.email == identifier.lower())
    ).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Username/email atau password salah"}), 401

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.get("/me")
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan"}), 404
    return jsonify(user.to_dict())


@auth_bp.patch("/profile")
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan"}), 404

    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        file = request.files.get("avatar")
    else:
        form = request.get_json(silent=True) or {}
        file = None

    name = (form.get("name") or "").strip()
    if name:
        user.name = name

    if file and file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in AVATAR_EXTENSIONS:
            return jsonify({"error": "Foto profil harus berformat PNG, JPG, atau WEBP"}), 400
        try:
            user.avatar_filename = save_upload(file)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User tidak ditemukan"}), 404

    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not user.check_password(current_password):
        return jsonify({"error": "Password saat ini salah"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Password baru minimal 6 karakter"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"success": True})
