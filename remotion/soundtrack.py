"""Generate an original, quiet instrumental bed using only Python's standard library."""
import math, wave, array
from pathlib import Path
rate=44100
duration=42
notes=[(220,261.6256,329.6276),(174.6141,220,261.6256),(130.8128,164.8138,195.9977),(195.9977,246.9417,293.6648)]
out=array.array('h')
for i in range(rate*duration):
    t=i/rate
    chord=notes[int(t/3)%4]
    fade=min(1,t/2,(duration-t)/3)
    pad=sum(math.sin(2*math.pi*n*t)*.045 for n in chord)
    beat=t%.5
    kick=math.sin(2*math.pi*(55*beat+4*(1-math.exp(-25*beat))))*math.exp(-beat*22)*.12
    step=int(t/.25)
    note=chord[step%3]*2
    u=t%.25
    bell=(math.sin(2*math.pi*note*u)+.25*math.sin(2*math.pi*note*2*u))*math.exp(-u*16)*min(1,u*250)*.055
    out.append(int(max(-1,min(1,(pad+kick+bell)*fade))*32767))
with wave.open(str(Path(__file__).resolve().parent/'public'/'launch-soundtrack.wav'),'wb') as w:
    w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(out.tobytes())
