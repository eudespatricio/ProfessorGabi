from kokoro_onnx import Kokoro
import soundfile as sf
import os

MODEL = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/kokoro-v1.0.onnx"
VOICES = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/voices-v1.0.bin"
OUT = "/mnt/c/Users/Eudes/ProfessorGabi/tests/audio-samples/voices"
os.makedirs(OUT, exist_ok=True)
k = Kokoro(MODEL, VOICES)
for voice in ["pf_dora", "pm_alex", "pm_santa"]:
    for name, text in [("gato", "gato"), ("muitobem", "Muito bem!"), ("leite", "O gato bebe o leite.")]:
        audio, sr = k.create(text, voice=voice, speed=1.0, lang="pt-br")
        sf.write(os.path.join(OUT, f"{voice}-{name}.wav"), audio, sr)
        print(voice, name, f"{len(audio)/sr:.2f}s")
