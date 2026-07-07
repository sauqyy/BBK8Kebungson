from collections import OrderedDict
from datetime import date
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, extract
from app.extensions import db
from app.models import Transaction, User

dashboard_bp = Blueprint("dashboard", __name__)

MONTHS_ID = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]


@dashboard_bp.get("/summary")
@jwt_required()
def summary():
    total_pemasukan = (
        db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.type == "pemasukan")
        .scalar()
    )
    total_pengeluaran = (
        db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.type == "pengeluaran")
        .scalar()
    )
    jumlah_pemasukan = Transaction.query.filter_by(type="pemasukan").count()
    jumlah_pengeluaran = Transaction.query.filter_by(type="pengeluaran").count()
    jumlah_anggota = User.query.filter_by(role="anggota").count()

    pending_penggantian_jumlah = Transaction.query.filter(
        Transaction.needs_reimbursement.is_(True), Transaction.reimbursed.is_(False)
    ).count()
    pending_penggantian_total = (
        db.session.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.needs_reimbursement.is_(True), Transaction.reimbursed.is_(False))
        .scalar()
    )

    rows = (
        db.session.query(
            extract("year", Transaction.date).label("y"),
            extract("month", Transaction.date).label("m"),
            Transaction.type,
            func.sum(Transaction.amount),
        )
        .group_by("y", "m", Transaction.type)
        .order_by("y", "m")
        .all()
    )
    monthly = OrderedDict()
    for y, m, t, total in rows:
        key = (int(y), int(m))
        if key not in monthly:
            monthly[key] = {"pemasukan": 0, "pengeluaran": 0}
        monthly[key][t] = total
    arus_kas = [
        {
            "label": f"{MONTHS_ID[m - 1]} {str(y)[2:]}",
            "pemasukan": v["pemasukan"],
            "pengeluaran": v["pengeluaran"],
        }
        for (y, m), v in list(monthly.items())[-6:]
    ]

    kategori_rows = (
        db.session.query(Transaction.category, func.sum(Transaction.amount))
        .filter(Transaction.type == "pengeluaran")
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    pengeluaran_per_kategori = [{"kategori": c, "jumlah": total} for c, total in kategori_rows]

    return jsonify(
        {
            "saldo": total_pemasukan - total_pengeluaran,
            "total_pemasukan": total_pemasukan,
            "total_pengeluaran": total_pengeluaran,
            "jumlah_transaksi_masuk": jumlah_pemasukan,
            "jumlah_transaksi_keluar": jumlah_pengeluaran,
            "jumlah_anggota": jumlah_anggota,
            "arus_kas_bulanan": arus_kas,
            "pengeluaran_per_kategori": pengeluaran_per_kategori,
            "pending_penggantian_jumlah": pending_penggantian_jumlah,
            "pending_penggantian_total": pending_penggantian_total,
        }
    )
