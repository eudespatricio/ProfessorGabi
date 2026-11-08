from kokoro_onnx import Kokoro
import soundfile as sf
import os

MODEL = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/kokoro-v1.0.onnx"
VOICES = "/home/eudespatricio/dark_studio_platform/workspace/models/kokoro/voices-v1.0.bin"
OUT = "/mnt/c/Users/Eudes/ProfessorGabi/tests/audio-samples/words"
os.makedirs(OUT, exist_ok=True)
WORDS = ["gato", "bola", "pato", "mala", "fada", "vaca", "casa", "sapo", "bolo", "luva",
         "livro", "carro", "milho", "chuva", "queijo", "girafa", "abacaxi", "coração",
         "bicicleta", "paralelepípedo"]
k = Kokoro(MODEL, VOICES)
for w in WORDS:
    audio, sr = k.create(w, voice="pf_dora", speed=0.95, lang="pt-br")
    sf.write(os.path.join(OUT, f"{w}.wav"), audio, sr)
print("ok")
