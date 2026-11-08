from kokoro_onnx import Kokoro
import soundfile as sf
import subprocess
import os
import shutil

MODEL = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/kokoro-v1.0.onnx"
VOICES = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/voices-v1.0.bin"
FFMPEG = "/home/eudespatricio/.local/bin/ffmpeg"
OUT = "/mnt/c/Users/Eudes/ProfessorGabi/tests/audio-samples"
CMP = os.path.join(OUT, "compare")
os.makedirs(CMP, exist_ok=True)

TEXTS = [
    ("gato", "gato", "audio/8f39c63d50.mp3"),
    ("muitobem", "Muito bem!", "audio/49ef3a3f38.mp3"),
    ("vamosler", "Vamos ler juntos.", "audio/8bbba7a2cb.mp3"),
]

k = Kokoro(MODEL, VOICES)
for name, text, eleven in TEXTS:
    src = os.path.join("/mnt/c/Users/Eudes/ProfessorGabi/app", eleven)
    if os.path.exists(src):
        shutil.copyfile(src, os.path.join(CMP, f"elevenlabs-{name}.mp3"))
    audio, sr = k.create(text, voice="pf_dora", speed=0.95, lang="pt-br")
    base = os.path.join(CMP, f"kokoro-{name}")
    sf.write(base + ".wav", audio, sr)
    subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", base + ".wav",
                    "-codec:a", "libmp3lame", "-b:a", "96k", base + ".mp3"], check=True)
    print(f"{name:8} kokoro {len(audio)/sr:4.2f}s {os.path.getsize(base + '.mp3')/1024:5.1f}KB | "
          f"elevenlabs {os.path.getsize(os.path.join(CMP, f'elevenlabs-{name}.mp3'))/1024:5.1f}KB")
