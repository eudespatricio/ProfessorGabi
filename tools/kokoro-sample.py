from kokoro_onnx import Kokoro
import soundfile as sf
import subprocess
import os
import time

MODEL = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/kokoro-v1.0.onnx"
VOICES = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/voices-v1.0.bin"
FFMPEG = "/home/eudespatricio/.local/bin/ffmpeg"
OUT = "/mnt/c/Users/Eudes/ProfessorGabi/tests/audio-samples"
os.makedirs(OUT, exist_ok=True)

TEXTS = [
    ("oi", "Oi! Eu sou a Gabi. Vamos ler juntos?"),
    ("bomdia", "Bom dia, Ana! Que tal descobrir uma palavra nova hoje?"),
    ("elogio", "Muito bem! Você leu cem por cento das palavras certinho."),
    ("instrucao", "Qual sílaba está faltando na palavra bolo?"),
]

k = Kokoro(MODEL, VOICES)
print("carregado")
for voice in ["pf_dora", "pm_santa"]:
    for name, text in TEXTS:
        t0 = time.time()
        audio, sr = k.create(text, voice=voice, speed=0.95, lang="pt-br")
        dt = time.time() - t0
        dur = len(audio) / sr
        base = os.path.join(OUT, f"{voice}-{name}")
        sf.write(base + ".wav", audio, sr)
        for ext, codec, bitrate in [("mp3", "libmp3lame", "96k"), ("opus", "libopus", "24k")]:
            subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", base + ".wav",
                            "-codec:a", codec, "-b:a", bitrate, base + "." + ext], check=True)
        print(f"{voice:8} {name:10} sr={sr} dur={dur:5.2f}s synth={dt:5.2f}s "
              f"mp3={os.path.getsize(base + '.mp3')/1024:6.1f}KB opus={os.path.getsize(base + '.opus')/1024:5.1f}KB")
