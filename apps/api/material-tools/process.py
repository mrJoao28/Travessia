"""Bounded, local PDF extraction/OCR or Portuguese narration. Never downloads URLs."""
import json, os, pathlib, subprocess, sys, resource
resource.setrlimit(resource.RLIMIT_CPU, (180, 185))
resource.setrlimit(resource.RLIMIT_FSIZE, (64 * 1024 * 1024, 64 * 1024 * 1024))
# ONNX and PDF parsers use threads; worker container has a separate RAM/CPU limit.
os.environ['OMP_NUM_THREADS'] = '1'
mode, target = sys.argv[1:3]
try:
    if mode == 'extract':
        import pdfplumber
        from pypdf import PdfReader
        path = pathlib.Path(target)
        reader = PdfReader(path, strict=True)
        if reader.is_encrypted or not 1 <= len(reader.pages) <= 20:
            raise ValueError('Unsupported PDF')
        # Reject active content, attachments, actions and external/URI resources.
        seen = set()
        blocked = {'/JavaScript', '/JS', '/Launch', '/EmbeddedFiles', '/EmbeddedFile', '/OpenAction', '/AA', '/XFA', '/RichMedia', '/URI', '/SubmitForm', '/GoToR', '/AcroForm'}
        def inspect(obj, depth=0):
            if depth > 40: raise ValueError('PDF structure too deep')
            if hasattr(obj, 'idnum'):
                identity = (obj.idnum, obj.generation)
                if identity in seen: return
                seen.add(identity); obj = obj.get_object()
            if isinstance(obj, dict):
                if blocked.intersection(str(k) for k in obj): raise ValueError('Active PDF')
                for k, value in obj.items():
                    if str(k) not in ('/Parent', '/P', '/Prev'): inspect(value, depth + 1)
            elif isinstance(obj, list):
                for value in obj: inspect(value, depth + 1)
        inspect(reader.trailer)
        pages, warnings = [], []
        with pdfplumber.open(path) as pdf:
            for i, page in enumerate(pdf.pages, 1):
                if page.width > 2000 or page.height > 2000: raise ValueError('Page too large')
                text = page.extract_text(layout=False) or ''
                ocr = len(text.strip()) < 20
                image = path.parent / f'page-{i}.png'
                subprocess.run(['pdftoppm', '-f', str(i), '-l', str(i), '-singlefile', '-scale-to', '1400', '-png', str(path), str(image.with_suffix(''))], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
                if ocr:
                    result = subprocess.run(['tesseract', str(image), 'stdout', '-l', 'por'], check=True, capture_output=True, timeout=25)
                    text = result.stdout.decode('utf-8')
                    warnings.append(f'Página {i}: OCR automático; confira palavras, números e fórmulas com o original.')
                if len(text) > 40000: raise ValueError('Page text too large')
                pages.append({'page': i, 'text': text, 'hasVisual': bool(page.images or page.curves or page.rects) or ocr, 'ocr': ocr})
        warnings.append('Conferir ordem de leitura, tabelas, fórmulas e informações visuais antes de liberar.')
        print(json.dumps({'pages': pages, 'warnings': warnings}, ensure_ascii=False))
    elif mode == 'audio':
        from piper import PiperVoice
        import wave
        text = sys.stdin.read(22001)
        if not 0 < len(text) <= 22000: raise ValueError('Narration length')
        voice = PiperVoice.load(os.environ.get('PIPER_MODEL', '/opt/voices/pt_BR-faber-medium.onnx'), use_cuda=False)
        wav = pathlib.Path(target).with_suffix('.wav')
        with wave.open(str(wav), 'wb') as output: voice.synthesize_wav(text, output)
        subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-y', '-i', str(wav), '-codec:a', 'libmp3lame', '-b:a', '64k', target], check=True, timeout=40)
        wav.unlink(missing_ok=True)
        print('{}')
    else: raise ValueError('Unknown operation')
except Exception:
    # Parser/provider details may contain private text or paths; keep diagnostics generic.
    sys.stderr.write('Falha no processamento local do material.\n')
    sys.exit(1)
