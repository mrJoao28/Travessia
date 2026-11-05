"""Bounded, local PDF extraction/OCR or Portuguese narration. Never downloads URLs."""
import json, os, pathlib, subprocess, sys, resource
mode, target = sys.argv[1:3]
cpu_limit = 900 if mode == 'audio' else 300
resource.setrlimit(resource.RLIMIT_CPU, (cpu_limit, cpu_limit + 5))
resource.setrlimit(resource.RLIMIT_FSIZE, (128 * 1024 * 1024, 128 * 1024 * 1024))
# ONNX and PDF parsers use threads; worker container has a separate RAM/CPU limit.
os.environ['OMP_NUM_THREADS'] = '1'
try:
    if mode == 'extract':
        import pdfplumber
        from PIL import Image, ImageChops
        from page_layout import extract_page
        from pypdf import PdfReader
        path = pathlib.Path(target)
        reader = PdfReader(path, strict=True)
        if reader.is_encrypted or not 1 <= len(reader.pages) <= 40:
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
                text, layout_flags = extract_page(page)
                ocr = len(text.strip()) < 20
                mixed_scan = not ocr and any(
                    (img['x1'] - img['x0']) * (img['bottom'] - img['top']) >= page.width * page.height * .45
                    for img in page.images
                )
                if mixed_scan:
                    layout_flags.append('imagem extensa com texto digital; o texto extraído pode não incluir o conteúdo da imagem')
                image = path.parent / f'page-{i}.png'
                subprocess.run(['pdftoppm', '-f', str(i), '-l', str(i), '-singlefile', '-scale-to', '1400', '-png', str(path), str(image.with_suffix(''))], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20)
                # Remove only uniform outer margins for PDF reference images; keep full page for Gemini/OCR.
                with Image.open(image).convert('RGB') as rendered:
                    background = Image.new('RGB', rendered.size, rendered.getpixel((0, 0)))
                    bbox = ImageChops.difference(rendered, background).convert('L').point(lambda v: 255 if v > 0 else 0).getbbox()
                    if bbox:
                        x0,y0,x1,y1=bbox
                        bbox=(max(0,x0-15),max(0,y0-15),min(rendered.width,x1+15),min(rendered.height,y1+15))
                        rendered.crop(bbox).save(path.parent / f'preview-{i}.png')
                if ocr:
                    result = subprocess.run(['tesseract', str(image), 'stdout', '-l', 'por'], check=True, capture_output=True, timeout=25)
                    text = result.stdout.decode('utf-8')
                    warnings.append(f'Página {i}: OCR automático; confira palavras, números e fórmulas com o original.')
                if image.stat().st_size > 2 * 1024 * 1024:
                    with Image.open(image) as full_page:
                        compact = full_page.convert('RGB').quantize(colors=256)
                    compact.save(image, optimize=True)
                if len(text) > 40000: raise ValueError('Page text too large')
                if layout_flags:
                    warnings.append(f'Página {i}: {", ".join(layout_flags)}. Confira com a imagem do original.')
                pages.append({'page': i, 'text': text, 'hasVisual': bool(page.images or page.curves or page.rects or layout_flags) or ocr, 'ocr': ocr})
                page.close()
        warnings.append('Conferir ordem de leitura, tabelas, fórmulas e informações visuais antes de liberar.')
        print(json.dumps({'pages': pages, 'warnings': warnings}, ensure_ascii=False))
    elif mode == 'audio':
        from itertools import chain
        import textwrap
        from piper import PiperVoice
        max_characters = 1_780_000
        text = sys.stdin.read(max_characters + 1)
        if not 0 < len(text) <= max_characters: raise ValueError('Narration length')
        voice = PiperVoice.load(os.environ.get('PIPER_MODEL', '/opt/voices/pt_BR-faber-medium.onnx'), use_cuda=False)
        # Feed bounded passages to Piper and stream PCM straight into the single MP3.
        passages = (part for line in text.splitlines() for part in textwrap.wrap(line, 1500))
        audio = (chunk for passage in passages for chunk in voice.synthesize(passage))
        first = next(audio)
        if first.sample_width != 2: raise ValueError('Unsupported audio format')
        command = ['ffmpeg', '-v', 'error', '-nostdin', '-y', '-f', 's16le',
                   '-ar', str(first.sample_rate), '-ac', str(first.sample_channels),
                   '-i', 'pipe:0', '-codec:a', 'libmp3lame', '-b:a', '64k', target]
        with subprocess.Popen(command, stdin=subprocess.PIPE) as encoder:
            try:
                for chunk in chain((first,), audio):
                    encoder.stdin.write(chunk.audio_int16_bytes)
                encoder.stdin.close()
                if encoder.wait(timeout=40): raise ValueError('Encoding failed')
            finally:
                if encoder.poll() is None:
                    encoder.kill()
                    encoder.wait()
        print('{}')
    else: raise ValueError('Unknown operation')
except Exception:
    # Parser/provider details may contain private text or paths; keep diagnostics generic.
    sys.stderr.write('Falha no processamento local do material.\n')
    sys.exit(1)
