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


def file_url(filename):
    """URL publik untuk sebuah file yang sudah diupload (R2 atau /uploads lokal)."""
    if not filename:
        return None
    if r2_configured():
        return f"{current_app.config['R2_PUBLIC_URL']}/{filename}"
    return f"/uploads/{filename}"
