"""Assertions for the fictional four-page Docker smoke fixture only."""
import os, pathlib, subprocess
from pypdf import PdfReader
if os.environ.get('DEMO_MODE') != 'true' or os.environ.get('DEMO_ONLY') != 'true':
    raise RuntimeError('Only isolated demo fixtures are allowed')
files=list(pathlib.Path('/data/materials').glob('*/adapted-*.pdf'))
if len(files) != 1: raise AssertionError('Expected the single smoke fixture')
reader=PdfReader(files[0])
assert len(reader.pages)==4, 'Each selected page must be present without orphan pages'
for index,page in enumerate(reader.pages,1):
    assert f'Página {index}' in (page.extract_text() or ''), 'Page reference/order missing'
assert 'End of page 4.' in (reader.pages[3].extract_text() or ''), 'Last page content missing'
assert reader.trailer['/Root'].get('/StructTreeRoot') is not None, 'Missing PDF tags'
text='\n'.join(p.extract_text() or '' for p in reader.pages)
assert '10 meters' in text and 'Material Docker persistente' in text
assert reader.trailer['/Root'].get('/Lang') == 'pt-BR'
audio=list(files[0].parent.glob('audio-*.mp3'))
assert len(audio)==1
result=subprocess.run(['ffmpeg','-v','error','-i',str(audio[0]),'-f','s16le','-ac','1','-ar','8000','pipe:1'],capture_output=True,timeout=20,check=True)
assert len(result.stdout)>16000 and any(result.stdout), 'Missing audible narration'
print('PDF marcado: idioma, conteúdo e paginação verificados; MP3 decodificado com amostras de áudio.')
