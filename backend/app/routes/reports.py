import io
from datetime import datetime
from flask import Blueprint, request, send_file
from flask_jwt_extended import jwt_required
from openpyxl import Workbook
from openpyxl.styles import Font
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from app.models import Transaction

reports_bp = Blueprint("reports", __name__)


def _filtered_transactions():
    query = Transaction.query
    start = request.args.get("start")
    end = request.args.get("end")
    if start:
        query = query.filter(Transaction.date >= datetime.strptime(start, "%Y-%m-%d").date())
    if end:
        query = query.filter(Transaction.date <= datetime.strptime(end, "%Y-%m-%d").date())
    return query.order_by(Transaction.date.asc()).all()


def _rupiah(n):
    return f"Rp {n:,.0f}".replace(",", ".")


@reports_bp.get("/export/excel")
@jwt_required()
def export_excel():
    transactions = _filtered_transactions()

    wb = Workbook()
    ws = wb.active
    ws.title = "Laporan Kas"

    headers = ["Tanggal", "Keterangan", "Kategori", "Oleh", "Tipe", "Jumlah (Rp)"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    saldo = 0
    for t in transactions:
        signed = t.amount if t.type == "pemasukan" else -t.amount
        saldo += signed
        ws.append([
            t.date.isoformat(),
            t.description,
            t.category,
            t.user.name,
            t.type,
            signed,
        ])

    ws.append([])
    ws.append(["", "", "", "", "Saldo Akhir", saldo])
    for col in ws.columns:
        max_len = max((len(str(c.value)) for c in col if c.value is not None), default=10)
        ws.column_dimensions[col[0].column_letter].width = max_len + 4

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return send_file(
        buf,
        as_attachment=True,
        download_name="laporan-kas-kkn.xlsx",
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@reports_bp.get("/export/pdf")
@jwt_required()
def export_pdf():
    transactions = _filtered_transactions()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    styles = getSampleStyleSheet()
    elements = [Paragraph("Laporan Kas KKN", styles["Title"]), Spacer(1, 12)]

    data = [["Tanggal", "Keterangan", "Kategori", "Oleh", "Jumlah"]]
    saldo = 0
    for t in transactions:
        signed = t.amount if t.type == "pemasukan" else -t.amount
        saldo += signed
        data.append([
            t.date.strftime("%d/%m/%Y"),
            t.description,
            t.category,
            t.user.name,
            _rupiah(signed),
        ])
    data.append(["", "", "", "Saldo Akhir", _rupiah(saldo)])

    table = Table(data, colWidths=[2.3 * cm, 6 * cm, 3 * cm, 3 * cm, 3 * cm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e5631")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -2), 0.5, colors.HexColor("#dddddd")),
                ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
                ("ALIGN", (4, 0), (4, -1), "RIGHT"),
            ]
        )
    )
    elements.append(table)
    doc.build(elements)
    buf.seek(0)
    return send_file(buf, as_attachment=True, download_name="laporan-kas-kkn.pdf", mimetype="application/pdf")
