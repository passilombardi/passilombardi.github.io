import json,sys,os,subprocess
from kokoro_onnx import Kokoro
import soundfile as sf
k=Kokoro('/tmp/tts/k.onnx','/tmp/tts/v.bin')
jobs=json.load(open(sys.argv[1]));out=sys.argv[2];os.makedirs(out,exist_ok=True)
part,n=int(sys.argv[3]),int(sys.argv[4])
for i,(name,text) in enumerate(jobs):
    if i%n!=part: continue
    f=f'{out}/{name}.mp3'
    if os.path.exists(f): continue
    s,sr=k.create(text,voice='if_sara',speed=1.0,lang='it')
    sf.write(f'/tmp/tts/{name}.wav',s,sr)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',f'/tmp/tts/{name}.wav','-ac','1','-b:a','32k',f],check=True)
    os.remove(f'/tmp/tts/{name}.wav');print(name,flush=True)
