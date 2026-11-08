from piper import PiperVoice
from piper.config import SynthesisConfig
import wave
import numpy as np
import os
import time

MODEL = "/home/eudespatricio/piper-voices/pt_BR-faber-medium.onnx"
OUT = "/mnt/c/Users/Eudes/ProfessorGabi/tests/audio-samples/piper"
os.makedirs(OUT, exist_ok=True)
voice = PiperVoice.load(MODEL)
print("loaded; sample_rate", voice.config.sample_rate)

CASES = [
    ("oi", "Oi! Eu sou a Gabi. Vamos ler juntos?"),
    ("bomdia", "Bom dia, Ana! Que tal descobrir uma palavra nova hoje?"),
    ("elogio", "Muito bem! Você leu cem por cento das palavras certinho."),
    ("instrucao", "Qual sílaba está faltando na palavra bolo?"),
    ("gato", "gato"),
    ("carro", "carro"),
    ("sapo", "sapo"),
    ("milho", "milho"),
    ("bola", "bola"),
    ("muitobem", "Muito bem!"),
]
config = SynthesisConfig(length_scale=1.0, normalize_audio=True)
for name, text in CASES:
    t0 = time.time()
    chunks = list(voice.synthesize(text, syn_config=config))
    dt = time.time() - t0
    audio = np.concatenate([c.audio_float_array for c in chunks]) if chunks else np.zeros(1, dtype=np.float32)
    sr = chunks[0].sample_rate if chunks else voice.config.sample_rate
    pcm = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
    path = os.path.join(OUT, f"faber-{name}.wav")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())
    print(f"{name:10} {dt:5.2f}s audio={len(audio)/sr:5.2f}s sr={sr}")
