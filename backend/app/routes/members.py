from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from app.extensions import db
from app.models import User, Transaction
from app.utils import bendahara_required

members_bp = Blueprint("members", __name__)


@members_bp.get("")
@jwt_required()
def list_members():
    users = User.query.order_by(User.created_at.asc()).all()
    result = []
    for u in users:
        disetor = (
            db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(Transaction.user_id == u.id, Transaction.type == "pemasukan")
            .scalar()
        )
        dikeluarkan = (
            db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
            .filter(Transaction.user_id == u.id, Transaction.type == "pengeluaran")
            .scalar()
        )
        jumlah_transaksi = Transaction.query.filter_by(user_id=u.id).count()
        last_tx = (
            Transaction.query.filter_by(user_id=u.id)
            .order_by(Transaction.date.desc())
            .first()
        )
        result.append(
            {
                **u.to_dict(),
                "disetor": disetor,
                "dikeluarkan": dikeluarkan,
                "jumlah_transaksi": jumlah_transaksi,
                "terakhir_aktif": last_tx.date.isoformat() if last_tx else None,
            }
        )
    return jsonify(result)


@members_bp.post("")
@bendahara_required
def add_member():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    role = data.get("role") or "anggota"

    if not name or not username or not email or not password:
        return jsonify({"error": "Nama, username, email, dan password wajib diisi"}), 400
    if role not in ("bendahara", "anggota"):
        return jsonify({"error": "Role tidak valid"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username sudah terdaftar"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email sudah terdaftar"}), 409

    user = User(
        name=name,
        username=username,
        email=email,
        role=role,
        bank_name=(data.get("bank_name") or "").strip() or None,
        bank_account_number=(data.get("account_number") or "").strip() or None,
        bank_account_holder=(data.get("account_holder") or "").strip() or None,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@members_bp.delete("/<int:member_id>")
@bendahara_required
def delete_member(member_id):
    user = User.query.get_or_404(member_id)
    if Transaction.query.filter_by(user_id=user.id).count() > 0:
        return jsonify({"error": "Tidak bisa hapus anggota yang punya riwayat transaksi"}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({"success": True})


@members_bp.patch("/<int:member_id>/password")
@bendahara_required
def set_member_password(member_id):
    user = User.query.get_or_404(member_id)
    data = request.get_json(silent=True) or {}
    new_password = data.get("new_password") or ""

    if len(new_password) < 6:
        return jsonify({"error": "Password baru minimal 6 karakter"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"success": True})


@members_bp.get("/<int:member_id>/bank-account")
@bendahara_required
def get_bank_account(member_id):
    user = User.query.get_or_404(member_id)
    return jsonify({"id": user.id, "name": user.name, **user.bank_account_dict()})


@members_bp.put("/<int:member_id>/bank-account")
@bendahara_required
def set_bank_account(member_id):
    user = User.query.get_or_404(member_id)
    data = request.get_json(silent=True) or {}

    user.bank_name = (data.get("bank_name") or "").strip() or None
    user.bank_account_number = (data.get("account_number") or "").strip() or None
    user.bank_account_holder = (data.get("account_holder") or "").strip() or None
    db.session.commit()
    return jsonify({"id": user.id, "name": user.name, **user.bank_account_dict()})
