"""Build three seekable, fixed-length narration tracks from generated HeyGen clips.

Usage: python scripts/build-narration.py /absolute/path/to/source-metadata.json
Source URLs are download provenance only; the live Site uses local MP3s.
"""
import concurrent.futures
import json
import pathlib
import subprocess
import sys
import tempfile
import urllib.request

source = json.loads(pathlib.Path(sys.argv[1]).read_text())
destination = pathlib.Path(__file__).resolve().parents[1] / 'public' / 'audio'
destination.mkdir(parents=True, exist_ok=True)
clips = {clip['key']: clip for clip in source['clips']}
starts = source['chapterStarts']
chapters = {}
for scenario, water, last in [('dry','dry','settled'), ('seep','seep','settled'), ('wet','wet','loaded')]:
    sequence = ['intro','advance','passing','gas',water,last]
    chapters[scenario] = []
    for index, key in enumerate(sequence):
        clip = clips[key]
        sentence = []
        sentence_start = None
        captions = []
        for word in clip['word_timestamps']:
            if word['word'].startswith('<'):
                continue
            if sentence_start is None:
                sentence_start = starts[index] + word['start']
            sentence.append(word['word'])
            if word['word'].endswith(('.', '?', '!')):
                captions.append({'start':round(sentence_start,3),'end':round(starts[index]+word['end'],3),'text':' '.join(sentence)})
                sentence, sentence_start = [], None
        if sentence:
            captions.append({'start':round(sentence_start,3),'end':round(starts[index]+clip['duration'],3),'text':' '.join(sentence)})
        chapters[scenario].append({'key':key,'start':starts[index],'end':starts[index+1] if index < 5 else 110,'text':clip['text'],'captions':captions})

with tempfile.TemporaryDirectory(prefix='gob-narration-') as tmp:
    def download(clip):
        path = pathlib.Path(tmp) / (clip['key']+'.wav')
        with urllib.request.urlopen(clip['audio_url'], timeout=60) as response:
            path.write_bytes(response.read())
        probe = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(path)]))
        assert abs(float(probe['format']['duration'])-clip['duration']) < .2
        return clip['key'], path
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        paths = dict(pool.map(download, source['clips']))
    for scenario, sequence in chapters.items():
        command = ['ffmpeg','-hide_banner','-loglevel','error','-y']
        filters = []
        for i, chapter in enumerate(sequence):
            command += ['-i',str(paths[chapter['key']])]
            assert clips[chapter['key']]['duration'] < chapter['end']-chapter['start']-.15, chapter['key']
            filters.append(f'[{i}:a]adelay={round(chapter["start"]*1000)}:all=1[a{i}]')
        filters.append(''.join(f'[a{i}]' for i in range(6))+'amix=inputs=6:normalize=0,loudnorm=I=-18:TP=-2:LRA=9,apad,atrim=duration=110[out]')
        command += ['-filter_complex',';'.join(filters),'-map','[out]','-ar','44100','-ac','1','-codec:a','libmp3lame','-b:a','96k',str(destination/f'narration-{scenario}.mp3')]
        subprocess.run(command, check=True)
        print('Built',scenario,flush=True)
manifest = {'voice':source['voice'],'provider':source['provider'],'generatedAt':source['generatedAt'],'duration':110,'chapters':chapters}
(destination/'chapters.json').write_text(json.dumps(manifest,separators=(',',':'))+'\n')
print('Narration and synchronized sentence captions saved.')
