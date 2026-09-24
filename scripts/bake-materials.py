"""Deterministic sedimentary PBR maps, baked off-device to keep mobile startup light.

These are authored procedural materials, not geological samples or photographs.
Requires Pillow and NumPy only. Runtime has no Python dependency.
"""
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / 'public' / 'textures'
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 1024
y, x = np.mgrid[0:SIZE,0:SIZE].astype(np.float32) / SIZE

def noise(rng, frequency):
    a = rng.normal(size=(frequency,frequency)).astype(np.float32)
    # Wrap the lattice so mipmapped repeat edges stay continuous.
    a = np.pad(a,((0,1),(0,1)),mode='wrap')
    result = np.asarray(Image.fromarray(a).resize((SIZE+SIZE//frequency,SIZE+SIZE//frequency),Image.Resampling.BICUBIC))[:SIZE,:SIZE].copy()
    return result / (result.std()+1e-5)

palettes = {'sand':(145,133,112),'shale':(84,91,96),'silt':(120,121,112),'coal':(35,39,43)}
for k,(kind,base) in enumerate(palettes.items()):
    rng = np.random.default_rng(784+137*k)
    broad = noise(rng,5)
    medium = noise(rng,24)
    granular = noise(rng,120)
    fine = rng.normal(size=(SIZE,SIZE)).astype(np.float32)
    warp = y + .014*np.sin(x*np.pi*4) + .004*broad
    density = {'sand':21,'shale':68,'silt':43,'coal':13}[kind]
    bedding = np.sin(warp*np.pi*2*density+.8*medium) * .11
    bedding += np.sin(warp*np.pi*2*density*2.7)*.035
    h = broad*.13 + medium*.09 + granular*.045 + fine*.012 + bedding
    cracks = np.zeros_like(h)
    for j in range(6 if kind == 'sand' else 9):
        at = rng.uniform()
        wandering = at + .007*np.sin(y*np.pi*(4+2*(j%3))+j) + .004*np.sin(y*np.pi*24+j)
        distance = np.minimum(abs(x-wandering),1-abs(x-wandering))
        aperture = rng.uniform(.0005,.0015)
        fissure = np.exp(-(distance/aperture)**2)
        fissure *= np.clip(.6+.7*np.sin(y*np.pi*2+j),0,1)
        cracks = np.maximum(cracks,fissure)
    for j in range(9 if kind == 'sand' else 17):
        at = (j+.4)/(9 if kind == 'sand' else 17)
        wandering = at+.003*np.sin(x*np.pi*6+j)+.0015*medium
        distance = abs(y-wandering)
        cracks = np.maximum(cracks,np.exp(-(distance/.0008)**2)*.7)
    h -= cracks*.34
    relief = np.clip(.5+h*.52,0,1)
    pigment = broad*6 + medium*4 + granular*3 + fine*1.3 + bedding*28 - cracks*34
    color = np.stack([np.clip(c+pigment+(medium*1.5 if i==0 and kind=='sand' else 0),0,255) for i,c in enumerate(base)],axis=-1)
    rough = np.clip((.59 if kind=='coal' else .85)+medium*.04+granular*.025+cracks*.10,0,1)
    dx = np.roll(relief,-1,axis=1)-np.roll(relief,1,axis=1)
    dy = np.roll(relief,-1,axis=0)-np.roll(relief,1,axis=0)
    normal = np.stack([-dx*5,dy*5,np.ones_like(dx)],axis=-1)
    normal /= np.linalg.norm(normal,axis=-1,keepdims=True)
    Image.fromarray(color.astype('uint8')).save(OUT/f'{kind}-color.jpg',quality=93,subsampling=0)
    Image.fromarray(((normal*.5+.5)*255).astype('uint8')).save(OUT/f'{kind}-normal.jpg',quality=95,subsampling=0)
    Image.fromarray((rough*255).astype('uint8')).save(OUT/f'{kind}-roughness.jpg',quality=90)
    Image.fromarray((relief*255).astype('uint8')).resize((512,512),Image.Resampling.LANCZOS).save(OUT/f'{kind}-height.jpg',quality=92)
    print('Baked',kind,flush=True)
