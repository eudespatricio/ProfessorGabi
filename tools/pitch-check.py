import wave
import numpy as np
import os
import sys


def f0_median(path):
    with wave.open(path, "rb") as w:
        sr = w.getframerate()
        n = w.getnframes()
        raw = w.readframes(n)
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    # janelas de 40 ms, passo 20 ms; autocorrelação no domínio do tempo
    win = int(0.04 * sr)
    hop = int(0.02 * sr)
    f0s = []
    for i in range(0, max(1, len(x) - win), hop):
        frame = x[i:i + win]
        frame = frame - frame.mean()
        if np.sqrt(np.mean(frame ** 2)) < 0.01:
            continue
        corr = np.correlate(frame, frame, mode="full")[win - 1:]
        lo, hi = int(sr / 400), int(sr / 70)
        if hi >= len(corr):
            continue
        peak = lo + int(np.argmax(corr[lo:hi]))
        if corr[peak] > 0.3 * corr[0]:
            f0s.append(sr / peak)
    return float(np.median(f0s)) if f0s else 0.0


for p in sys.argv[1:]:
    print(f"{os.path.basename(p)}: {f0_median(p):.1f} Hz")
