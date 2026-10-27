"""Original 26-second rhythmic score and edit accents; no external samples."""
import math, wave, array, random
from pathlib import Path
rate=44100; duration=30; rng=random.Random(42)
cuts=[0,4.5,6,9.5,12.5,15.5,18,21.5,24.5,26.5]
chords=[(130.81,164.81,196),(110,130.81,164.81),(87.31,110,130.81),(98,123.47,146.83)]
out=array.array('h')
for i in range(rate*duration):
 t=i/rate; beat=t%.5; tick=t%.25; chord=chords[int(t/2)%4]
 kick=math.sin(2*math.pi*(48*beat+2*(1-math.exp(-35*beat))))*math.exp(-beat*24)*.25
 hat=(rng.random()*2-1)*math.exp(-tick*110)*.045
 bass=math.sin(2*math.pi*chord[0]*t)*math.exp(-beat*5)*.13
 pluck=sum(math.sin(2*math.pi*n*2*t) for n in chord)/3*math.exp(-tick*17)*.11
 pad=sum(math.sin(2*math.pi*n*t) for n in chord)*.018
 accent=0
 for c in cuts:
  u=t-c
  if 0<=u<.3: accent+=((rng.random()*2-1)*.08+math.sin(2*math.pi*75*u)*.16)*math.exp(-u*22)
 fade=min(1,t/.08,(duration-t)/.8)
 out.append(int(max(-1,min(1,(kick+hat+bass+pluck+pad+accent)*fade))*32767))
with wave.open(str(Path(__file__).resolve().parent/'public'/'launch-story.wav'),'wb') as w:
 w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(out.tobytes())
