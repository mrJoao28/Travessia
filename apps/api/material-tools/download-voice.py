"""Build-time download, fixed origin/revision and SHA-256. No runtime network for TTS."""
import hashlib, pathlib, urllib.request
root = pathlib.Path('/opt/voices'); root.mkdir(parents=True, exist_ok=True)
base = 'https://huggingface.co/rhasspy/piper-voices/resolve/49a0d23f04e055f1766e5ad15ea2d121a90fa17a/pt/pt_BR/faber/medium/'
for name in ['MODEL_CARD', 'pt_BR-faber-medium.onnx.json', 'pt_BR-faber-medium.onnx']:
    data = urllib.request.urlopen(base + name, timeout=120).read()
    if name.endswith('.onnx') and hashlib.sha256(data).hexdigest() != '858555e3a064209c57088fe6bd70c4c3dc54d03eaa00c45d5ecaf43a33f95aa7':
        raise RuntimeError('Voice checksum mismatch')
    if name == 'MODEL_CARD' and b'CC0' not in data: raise RuntimeError('Unexpected voice license')
    (root / name).write_bytes(data)
