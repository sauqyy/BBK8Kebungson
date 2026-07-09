import boto3
from botocore.config import Config as BotoConfig
from flask import current_app

_CONTENT_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "pdf": "application/pdf",
}


def r2_configured():
    cfg = current_app.config
    return bool(
        cfg.get("R2_ACCOUNT_ID")
        and cfg.get("R2_ACCESS_KEY_ID")
        and cfg.get("R2_SECRET_ACCESS_KEY")
        and cfg.get("R2_BUCKET_NAME")
    )


def _client():
    cfg = current_app.config
    return boto3.client(
        "s3",
        endpoint_url=f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=cfg["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=cfg["R2_SECRET_ACCESS_KEY"],
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def upload_bytes(data, filename):
    """Upload isi file (bytes) ke R2 dengan nama `filename`."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    content_type = _CONTENT_TYPES.get(ext, "application/octet-stream")
    _client().put_object(
        Bucket=current_app.config["R2_BUCKET_NAME"],
        Key=filename,
        Body=data,
        ContentType=content_type,
    )


def fetch_bytes(filename):
    """Ambil isi file dari R2. Return (data: bytes, content_type: str)."""
    obj = _client().get_object(Bucket=current_app.config["R2_BUCKET_NAME"], Key=filename)
    content_type = obj.get("ContentType") or "application/octet-stream"
    return obj["Body"].read(), content_type


def file_url(filename):
    """URL untuk sebuah file yang sudah diupload. Selalu di-proxy lewat
    backend sendiri (/api/files/<filename>) alih-alih URL publik r2.dev
    langsung -- ISP di Indonesia banyak yang blokir domain *.r2.dev karena
    dipakai bersama (shared) oleh semua pengguna R2, jadi butuh VPN kalau
    diakses langsung. Backend-to-R2 (server ke server) tidak kena blokir ini."""
    if not filename:
        return None
    return f"/api/files/{filename}"
