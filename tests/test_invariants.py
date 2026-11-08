"""
Oráculo de Invariantes em Python/pytest (Fase 3 context-recovery).
Permite validar todas as regras arquiteturais e de domínio nativamente no WSL em < 0.2s,
sem depender do binário Windows do Node.js.
"""
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "app"


def test_i1_resident_context_budget():
    """I1: ESTADO.md (<80L), MAPA.md (<60L), REJEITADOS.md (<40L) e soma < 150 linhas."""
    limits = {"ESTADO.md": 80, "MAPA.md": 60, "REJEITADOS.md": 40}
    total = 0
    for name, limit in limits.items():
        p = ROOT / name
        assert p.exists(), f"Contexto residente ausente: {name}"
        lines = len(p.read_text(encoding="utf-8").rstrip().splitlines())
        assert lines <= limit, f"{name} excedeu teto ({lines} > {limit})"
        total += lines
    assert total < 150, f"Soma do contexto residente excedeu 150 linhas ({total})"


def test_i2_i3_service_worker_and_version_parity():
    """I2 & I3: APP_VERSION == VERSION do SW e todos os módulos JS/CSS estão no CORE."""
    v_txt = (APP / "js" / "version.js").read_text(encoding="utf-8")
    sw_txt = (APP / "sw.js").read_text(encoding="utf-8")
    app_v = re.search(r"APP_VERSION\s*=\s*['\"](v\d+)['\"]", v_txt).group(1)
    sw_v = re.search(r"VERSION\s*=\s*['\"]gabi-(v\d+)['\"]", sw_txt).group(1)
    assert app_v == sw_v, f"Versão divergente: version.js={app_v} vs sw.js=gabi-{sw_v}"

    core_block = re.search(r"const CORE = \[(.*?)\];", sw_txt, re.S).group(1)
    core = {m.lstrip("./") for m in re.findall(r"['\"]([^'\"]+)['\"]", core_block) if m != "./"}
    for f in core:
        assert (APP / f).exists(), f"CORE aponta para arquivo inexistente: {f}"

    for sub in ("js", "css"):
        for p in (APP / sub).iterdir():
            if p.suffix in {".js", ".css"}:
                rel = f"{sub}/{p.name}"
                assert rel in core, f"Arquivo fora do CORE do Service Worker: {rel}"


def test_i4_lazy_load_ocr_dictionary():
    """I4: wordlist-pt.js e ocr-fix.js nunca podem ter import estático fora de si mesmos."""
    js_dir = APP / "js"
    pattern = re.compile(r"^\s*import\s+.*from\s+['\"]\./(ocr-fix|wordlist-pt)\.js['\"]", re.M)
    for p in js_dir.glob("*.js"):
        if p.name in {"ocr-fix.js", "wordlist-pt.js"}:
            continue
        src = p.read_text(encoding="utf-8")
        assert not pattern.search(src), f"{p.name} faz import estático de ocr-fix/wordlist-pt"


def test_i5_i6_canonical_manifest_and_audio_coverage():
    """I5 & I6: 14 unidades, 351 palavras, 22 textos, 351 glossário e 1.116 clipes MP3/Opus."""
    manifest = json.loads((ROOT / "content" / "manifest.json").read_text(encoding="utf-8"))
    counts = manifest["counts"]
    assert counts["units"] == 14
    assert counts["words"] == 351
    assert counts["texts"] == 22
    assert counts["glossary"] == 351
    assert counts["audioClips"] == 1116
    assert counts["missingWordAudio"] == 0

    mp3_idx = json.loads((APP / "audio" / "index.json").read_text(encoding="utf-8"))
    opus_idx = json.loads((APP / "audio" / "index-opus.json").read_text(encoding="utf-8"))
    assert len(mp3_idx) == 1116
    assert set(mp3_idx.keys()) == set(opus_idx.keys()), "Desalinhamento entre index.json e index-opus.json"

    for rel in set(opus_idx.values()):
        p = APP / rel
        assert p.exists(), f"Clipe Opus ausente: {rel}"
        with open(p, "rb") as fp:
            assert fp.read(4) == b"OggS", f"Clipe Opus inválido (não começa com OggS): {rel}"


def test_i7_i8_no_mojibake_and_no_obsolete_docs():
    """I7 & I8: Zero mojibake nos arquivos e nenhum artefato efêmero/contraditório no repo."""
    forbidden = [
        "HANDOVER.md", "CONTRADICOES.md", "INVARIANTES.md", "gabi-app.zip", ".words.json",
        "docs/PLANO-EVOLUCAO.md", "docs/EXPANSAO-JOGOS-E-DICIONARIO.md",
        "docs/TESTE-DE-USO.md", "docs/RELATORIO-FINAL.md",
    ]
    for rel in forbidden:
        assert not (ROOT / rel).exists(), f"Artefato obsoleto ou de transição presente: {rel}"

    bad_re = re.compile(r"\ufffd|\?\?\?\?|Ã[\u0080-\u00ff\u0192]|Â[\u0080-\u00ff]|ðŸ")
    check_files = list(APP.rglob("*.js")) + list(APP.rglob("*.css")) + list(ROOT.glob("*.md")) + list((ROOT / "docs").glob("*.md"))
    for p in check_files:
        txt = p.read_text(encoding="utf-8")
        assert not bad_re.search(txt), f"Mojibake detectado em {p.relative_to(ROOT)}"


def test_i9_ocr_edge_and_handwriting_sanitization():
    """I9: screen-book.js preserva coordenadas TSV (wordLefts/wordRights) e filtra ruído de espiral/ilustração."""
    sb = (APP / "js" / "screen-book.js").read_text(encoding="utf-8")
    assert "wordLefts" in sb and "wordRights" in sb, "parseTsvLines deve extrair coordenadas horizontais do TSV"
    assert "stripLineEdgeNoise" in sb, "sanitizeOcr deve podar ruído de borda/espiral/ilustração por palavra"
    assert "MIN_LINE_CONF = 58" in sb, "MIN_LINE_CONF deve filtrar rabiscos manuscritos de baixa confiança"

