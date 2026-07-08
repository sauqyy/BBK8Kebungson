from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models import Transaction, User
from app.utils import save_upload, bendahara_required, send_email

transactions_bp = Blueprint("transactions", __name__)


@transactions_bp.get("")
@jwt_required()
def list_transactions():
    query = Transaction.query

    type_filter = request.args.get("type")
    if type_filter in ("pemasukan", "pengeluaran"):
        query = query.filter(Transaction.type == type_filter)

    user_id_filter = request.args.get("user_id")
    if user_id_filter:
        try:
            user_id_filter = int(user_id_filter)
        except ValueError:
            return jsonify({"error": "user_id tidak valid"}), 400
        query = query.filter(Transaction.user_id == user_id_filter)

    pending_only = request.args.get("pending_reimbursement")
    if pending_only == "true":
        query = query.filter(Transaction.needs_reimbursement.is_(True), Transaction.reimbursed.is_(False))

    search = request.args.get("q", "").strip()
    if search:
        like = f"%{search}%"
        query = query.join(User).filter(
            db.or_(
                Transaction.description.ilike(like),
                Transaction.category.ilike(like),
                User.name.ilike(like),
            )
        )

    transactions = query.order_by(Transaction.date.desc(), Transaction.id.desc()).all()
    return jsonify([t.to_dict() for t in transactions])


@transactions_bp.post("")
@jwt_required()
def create_transaction():
    user_id = get_jwt_identity()
    claims = get_jwt()

    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        file = request.files.get("bukti")
    else:
        form = request.get_json(silent=True) or {}
        file = None

    tx_type = form.get("type")
    amount = form.get("amount")
    description = (form.get("description") or "").strip()
    category = (form.get("category") or "").strip()
    date_str = form.get("date")

    if tx_type not in ("pemasukan", "pengeluaran"):
        return jsonify({"error": "Tipe transaksi tidak valid"}), 400
    if not description or not category:
        return jsonify({"error": "Keterangan dan kategori wajib diisi"}), 400
    try:
        amount = int(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Jumlah harus berupa angka lebih dari 0"}), 400

    try:
        tx_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else datetime.utcnow().date()
    except ValueError:
        return jsonify({"error": "Format tanggal tidak valid"}), 400

    proof_filename = None
    if file:
        try:
            proof_filename = save_upload(file)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    owner = User.query.get(user_id)
    on_behalf_of = (form.get("on_behalf_of") or "").strip()
    if on_behalf_of:
        if claims.get("role") != "bendahara":
            return jsonify({"error": "Hanya bendahara yang bisa mencatat transaksi untuk anggota lain"}), 403
        owner = User.query.get(on_behalf_of)
        if not owner:
            return jsonify({"error": "Anggota tidak ditemukan"}), 400

    paid_with = form.get("paid_with", "kas")
    needs_reimbursement = tx_type == "pengeluaran" and owner.role != "bendahara" and paid_with == "pribadi"

    transaction = Transaction(
        type=tx_type,
        amount=amount,
        description=description,
        category=category,
        date=tx_date,
        proof_filename=proof_filename,
        user_id=owner.id,
        needs_reimbursement=needs_reimbursement,
    )
    db.session.add(transaction)
    db.session.commit()
    return jsonify(transaction.to_dict()), 201


@transactions_bp.put("/<int:tx_id>")
@bendahara_required
def update_transaction(tx_id):
    tx = Transaction.query.get_or_404(tx_id)

    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        file = request.files.get("bukti")
    else:
        form = request.get_json(silent=True) or {}
        file = None

    tx_type = form.get("type")
    amount = form.get("amount")
    description = (form.get("description") or "").strip()
    category = (form.get("category") or "").strip()
    date_str = form.get("date")

    if tx_type not in ("pemasukan", "pengeluaran"):
        return jsonify({"error": "Tipe transaksi tidak valid"}), 400
    if not description or not category:
        return jsonify({"error": "Keterangan dan kategori wajib diisi"}), 400
    try:
        amount = int(amount)
        if amount <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Jumlah harus berupa angka lebih dari 0"}), 400

    try:
        tx_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else tx.date
    except ValueError:
        return jsonify({"error": "Format tanggal tidak valid"}), 400

    owner = tx.user
    on_behalf_of = form.get("on_behalf_of")
    if on_behalf_of:
        owner = User.query.get(on_behalf_of)
        if not owner:
            return jsonify({"error": "Anggota tidak ditemukan"}), 400

    if file:
        try:
            tx.proof_filename = save_upload(file)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    paid_with = form.get("paid_with", "kas")
    tx.type = tx_type
    tx.amount = amount
    tx.description = description
    tx.category = category
    tx.date = tx_date
    tx.user_id = owner.id
    if not tx.reimbursed:
        tx.needs_reimbursement = tx_type == "pengeluaran" and owner.role != "bendahara" and paid_with == "pribadi"

    db.session.commit()
    return jsonify(tx.to_dict())


def _rupiah(n):
    return f"Rp {n:,.0f}".replace(",", ".")


@transactions_bp.patch("/<int:tx_id>/reimbursement")
@bendahara_required
def set_reimbursement(tx_id):
    tx = Transaction.query.get_or_404(tx_id)
    if not tx.needs_reimbursement:
        return jsonify({"error": "Transaksi ini tidak perlu penggantian"}), 400

    if request.content_type and "multipart/form-data" in request.content_type:
        form = request.form
        file = request.files.get("bukti_transfer")
    else:
        form = request.get_json(silent=True) or {}
        file = None

    reimbursed_raw = form.get("reimbursed", "true")
    reimbursed = reimbursed_raw if isinstance(reimbursed_raw, bool) else str(reimbursed_raw).lower() == "true"

    proof_filename = None
    if file:
        try:
            proof_filename = save_upload(file)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

    tx.reimbursed = reimbursed
    tx.reimbursed_at = datetime.utcnow() if reimbursed else None
    if reimbursed and proof_filename:
        tx.reimbursement_proof_filename = proof_filename
    if not reimbursed:
        tx.reimbursement_proof_filename = None
    db.session.commit()

    email_sent = None
    if reimbursed:
        subject = "Uang pengeluaran kamu sudah diganti"
        body = (
            f"Halo {tx.user.name},\n\n"
            f"Bendahara sudah mengganti pengeluaran berikut yang kamu bayar duluan:\n\n"
            f"  Keterangan : {tx.description}\n"
            f"  Kategori   : {tx.category}\n"
            f"  Tanggal    : {tx.date.strftime('%d/%m/%Y')}\n"
            f"  Jumlah     : {_rupiah(tx.amount)}\n\n"
            f"Silakan cek rekeningmu. Terima kasih!\n\n"
            f"-- Kas KKN"
        )
        success, error = send_email(tx.user.email, subject, body)
        email_sent = {"success": success, "error": error}

    result = tx.to_dict()
    result["email_notification"] = email_sent
    return jsonify(result)


@transactions_bp.delete("/<int:tx_id>")
@jwt_required()
def delete_transaction(tx_id):
    claims = get_jwt()
    user_id = get_jwt_identity()
    tx = Transaction.query.get_or_404(tx_id)

    if claims.get("role") != "bendahara" and str(tx.user_id) != str(user_id):
        return jsonify({"error": "Tidak boleh menghapus transaksi milik orang lain"}), 403

    db.session.delete(tx)
    db.session.commit()
    return jsonify({"success": True})
