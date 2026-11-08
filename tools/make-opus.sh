#!/usr/bin/env bash
# Converte os clipes MP3 em Opus (mono 24 kbps) para reduzir o download offline.
# Uso: bash tools/make-opus.sh        (roda dentro do WSL)
set -euo pipefail
cd "$(dirname "$0")/../app/audio"
mkdir -p opus
n=0
skip=0
for f in *.mp3; do
  o="opus/${f%.mp3}.opus"
  if [ -f "$o" ]; then skip=$((skip+1)); continue; fi
  ffmpeg -v error -y -i "$f" -c:a libopus -b:a 24k -ac 1 -ar 48000 "$o" || echo "falhou: $f"
  n=$((n+1))
  if [ $((n % 200)) -eq 0 ]; then echo "$n convertidos…"; fi
done
echo "convertidos agora: $n | já existiam: $skip | total: $(ls opus/*.opus | wc -l)"
du -sh opus
