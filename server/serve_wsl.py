#!/usr/bin/env python3
"""Servidor HTTPS nativo no WSL para o Professor Gabi (porta 8443).
Suporta HTTP Range (206 Partial Content para áudio Opus/MP3), gzip, cache-control e /ca.crt.
"""
import gzip
import http.server
import os
import re
import socketserver
import ssl
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE / "app"
CERTS = BASE / "certs"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 8443

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    ".mp3": "audio/mpeg",
    ".opus": "audio/ogg",
    ".webm": "video/webm",
    ".md": "text/markdown; charset=utf-8",
    ".crt": "application/x-x509-ca-cert",
}

COMPRESSIBLE = {".html", ".js", ".mjs", ".css", ".json", ".webmanifest", ".svg", ".txt", ".md"}
GZIP_CACHE = {}
RAW_CACHE = {}


def get_cached_bytes(target: Path, use_gzip: bool):
    st = target.stat()
    key = (str(target), st.st_size, st.st_mtime_ns)
    if use_gzip:
        hit = GZIP_CACHE.get(key)
        if hit is not None:
            return hit
        raw = target.read_bytes()
        comp = gzip.compress(raw, compresslevel=6)
        if len(GZIP_CACHE) > 200:
            GZIP_CACHE.clear()
        GZIP_CACHE[key] = comp
        return comp
    hit = RAW_CACHE.get(key)
    if hit is not None:
        return hit
    raw = target.read_bytes()
    if st.st_size <= 262144:
        if len(RAW_CACHE) > 400:
            RAW_CACHE.clear()
        RAW_CACHE[key] = raw
    return raw


class GabiHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        pass

    def _sec_headers(self, url_path: str, ext: str):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Permissions-Policy", "microphone=(self), camera=(self), geolocation=()")
        if url_path in ("/sw.js", "/index.html", "/manifest.webmanifest"):
            cc = "no-store"
        elif ext in (".mp3", ".opus"):
            cc = "public, max-age=31536000, immutable"
        elif ext in (".png", ".woff2", ".jpg", ".ico"):
            cc = "public, max-age=86400"
        else:
            cc = "no-cache"
        self.send_header("Cache-Control", cc)

    def do_HEAD(self):
        self._handle(head_only=True)

    def do_GET(self):
        self._handle(head_only=False)

    def _handle(self, head_only=False):
        raw_path = self.path.split("?", 1)[0].split("#", 1)[0]
        if raw_path == "/healthz":
            body = b'{"ok":true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if not head_only:
                self.wfile.write(body)
            return

        if raw_path == "/ca.crt":
            ca = CERTS / "ca.crt"
            if ca.is_file():
                data = ca.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/x-x509-ca-cert")
                self.send_header("Content-Disposition", 'attachment; filename="gabi-local-ca.crt"')
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                if not head_only:
                    self.wfile.write(data)
                return

        rel = "/index.html" if raw_path == "/" else raw_path
        target = (ROOT / rel.lstrip("/")).resolve()
        if not str(target).startswith(str(ROOT)) or not target.is_file():
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        ext = target.suffix.lower()
        ctype = MIME.get(ext, "application/octet-stream")
        size = target.stat().st_size

        if ext in (".mp3", ".opus"):
            rng = self.headers.get("Range")
            if rng:
                m = re.match(r"^bytes=(\d*)-(\d*)$", rng.strip())
                if m:
                    s_str, e_str = m.group(1), m.group(2)
                    start = int(s_str) if s_str else max(0, size - int(e_str or 0))
                    end = int(e_str) if e_str else size - 1
                    end = min(end, size - 1)
                    if 0 <= start <= end < size:
                        length = end - start + 1
                        self.send_response(206)
                        self._sec_headers(rel, ext)
                        self.send_header("Content-Type", ctype)
                        self.send_header("Accept-Ranges", "bytes")
                        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                        self.send_header("Content-Length", str(length))
                        self.end_headers()
                        if not head_only:
                            with open(target, "rb") as fp:
                                fp.seek(start)
                                self.wfile.write(fp.read(length))
                        return
            self.send_response(200)
            self._sec_headers(rel, ext)
            self.send_header("Content-Type", ctype)
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(size))
            self.end_headers()
            if not head_only:
                self.wfile.write(target.read_bytes())
            return

        ae = self.headers.get("Accept-Encoding", "")
        if ext in COMPRESSIBLE and size > 256 and "gzip" in ae:
            data = get_cached_bytes(target, use_gzip=True)
            self.send_response(200)
            self._sec_headers(rel, ext)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Vary", "Accept-Encoding")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if not head_only:
                self.wfile.write(data)
            return

        data = get_cached_bytes(target, use_gzip=False)
        self.send_response(200)
        self._sec_headers(rel, ext)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        if not head_only:
            self.wfile.write(data)


class ThreadedHTTPSServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    httpd = ThreadedHTTPSServer(("0.0.0.0", PORT), GabiHandler)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(certfile=str(CERTS / "server.crt"), keyfile=str(CERTS / "server.key"))
    httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)
    httpd.serve_forever()
