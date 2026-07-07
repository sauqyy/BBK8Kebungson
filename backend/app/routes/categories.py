import re
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models import Category, Transaction
from app.utils import bendahara_required

categories_bp = Blueprint("categories", __name__)

HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


@categories_bp.get("")
@jwt_required()
def list_categories():
    query = Category.query
    type_filter = request.args.get("type")
    if type_filter in ("pemasukan", "pengeluaran"):
        query = query.filter_by(type=type_filter)
    categories = query.order_by(Category.id.asc()).all()
    return jsonify([c.to_dict() for c in categories])


@categories_bp.post("")
@jwt_required()
def create_category():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    tx_type = data.get("type")
    color = (data.get("color") or "").strip() or "#6b7280"

    if tx_type not in ("pemasukan", "pengeluaran"):
        return jsonify({"error": "Tipe kategori tidak valid"}), 400
    if not name:
        return jsonify({"error": "Nama kategori wajib diisi"}), 400
    if not HEX_RE.match(color):
        return jsonify({"error": "Warna harus berupa kode hex, contoh #1E5631"}), 400

    existing = Category.query.filter(
        db.func.lower(Category.name) == name.lower(), Category.type == tx_type
    ).first()
    if existing:
        return jsonify({"error": "Kategori dengan nama itu sudah ada"}), 409

    category = Category(name=name, type=tx_type, color=color)
    db.session.add(category)
    db.session.commit()
    return jsonify(category.to_dict()), 201


@categories_bp.patch("/<int:category_id>")
@bendahara_required
def update_category(category_id):
    category = Category.query.get_or_404(category_id)
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip() or category.name
    color = (data.get("color") or "").strip() or category.color

    if not HEX_RE.match(color):
        return jsonify({"error": "Warna harus berupa kode hex, contoh #1E5631"}), 400

    existing = Category.query.filter(
        db.func.lower(Category.name) == name.lower(),
        Category.type == category.type,
        Category.id != category.id,
    ).first()
    if existing:
        return jsonify({"error": "Kategori dengan nama itu sudah ada"}), 409

    if name != category.name:
        Transaction.query.filter_by(category=category.name, type=category.type).update(
            {"category": name}
        )

    category.name = name
    category.color = color
    db.session.commit()
    return jsonify(category.to_dict())


@categories_bp.delete("/<int:category_id>")
@bendahara_required
def delete_category(category_id):
    category = Category.query.get_or_404(category_id)
    db.session.delete(category)
    db.session.commit()
    return jsonify({"success": True})
