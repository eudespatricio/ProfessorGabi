from piper import PiperVoice
from piper.config import SynthesisConfig
import wave
import numpy as np
import os

OUT = "/mnt/c/Users/Eudes/ProfessorGabi/tests/audio-samples/piper-voices"
os.makedirs(OUT, exist_ok=True)
MODELS = {
    "cadu": "/home/eudespatricio/piper-voices/pt_BR-cadu-medium.onnx",
    "jeff": "/home/eudespatricio/piper-voices/pt_BR-jeff-medium.onnx",
    "edresson": "/home/eudespatricio/piper-voices/pt_BR-edresson-low.onnx",
}
CASES = [
    ("gato", "gato"),
    ("carro", "carro"),
    ("sapo", "sapo"),
    ("oi", "Oi! Eu sou a Gabi. Vamos ler juntos?"),
    ("bomdia", "Bom dia, Ana! Que tal descobrir uma palavra nova hoje?"),
    ("instrucao", "Qual sílaba está faltando na palavra bolo?"),
]
config = SynthesisConfig(length_scale=1.0, normalize_audio=True)
for voice_name, path in MODELS.items():
    v = PiperVoice.load(path)
    for name, text in CASES:
        chunks = list(v.synthesize(text, syn_config=config))
        audio = np.concatenate([c.audio_float_array for c in chunks]) if chunks else np.zeros(1, dtype=np.float32)
        sr = chunks[0].sample_rate if chunks else v.config.sample_rate
        pcm = np.clip(audio * 32767, -32768, 32767).astype(np.int16)
        out = os.path.join(OUT, f"{voice_name}-{name}.wav")
        with wave.open(out, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sr)
            wf.writeframes(pcm.tobytes())
        print(voice_name, name, f"{len(audio)/sr:.2f}s")
