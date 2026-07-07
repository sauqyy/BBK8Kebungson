import os
import smtplib
import uuid
from email.message import EmailMessage
from functools import wraps
from flask import current_app, jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request


def allowed_file(filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


def save_upload(file_storage):
    if not file_storage or file_storage.filename == "":
        return None
    if not allowed_file(file_storage.filename):
        raise ValueError("Tipe file tidak didukung")
    ext = file_storage.filename.rsplit(".", 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    path = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
    file_storage.save(path)
    return filename


def send_email(to_addr, subject, body):
    """Kirim email plain-text. Return (success, error_message)."""
    username = current_app.config.get("MAIL_USERNAME")
    password = current_app.config.get("MAIL_PASSWORD")
    if not username or not password:
        return False, "Email belum dikonfigurasi (MAIL_USERNAME/MAIL_PASSWORD kosong)"

    override_to = current_app.config.get("MAIL_TEST_OVERRIDE_TO")
    actual_to = override_to or to_addr
    if override_to:
        subject = f"[Test - asli untuk {to_addr}] {subject}"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = current_app.config.get("MAIL_FROM") or username
    msg["To"] = actual_to
    msg.set_content(body)

    try:
        with smtplib.SMTP(current_app.config["MAIL_SERVER"], current_app.config["MAIL_PORT"]) as server:
            if current_app.config.get("MAIL_USE_TLS"):
                server.starttls()
            server.login(username, password)
            server.send_message(msg)
        return True, None
    except Exception as e:
        current_app.logger.error(f"Gagal kirim email ke {to_addr}: {e}")
        return False, str(e)


def bendahara_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        claims = get_jwt()
        if claims.get("role") != "bendahara":
            return jsonify({"error": "Hanya bendahara yang bisa melakukan aksi ini"}), 403
        return fn(*args, **kwargs)

    return wrapper
