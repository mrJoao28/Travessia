"""Real local parser/OCR checks with self-authored, temporary fixtures."""
import json, pathlib, subprocess, sys, tempfile, unittest
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
from PIL import Image, ImageDraw, ImageFont

PROCESS = str(pathlib.Path(__file__).with_name('process.py'))

class PdfProcessing(unittest.TestCase):
    def run_pdf(self, path):
        return subprocess.run([sys.executable, PROCESS, 'extract', str(path)], capture_output=True, timeout=90)

    def test_text_and_visual_reference(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'original.pdf'
            writer = PdfWriter(); page = writer.add_blank_page(595, 842)
            font = DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')})
            page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})})
            stream = DecodedStreamObject(); stream.set_data(b'BT /F1 18 Tf 50 760 Td (Compare routes of 10 meters.) Tj ET 50 600 100 100 re S')
            page[NameObject('/Contents')] = writer._add_object(stream)
            writer.write(path)
            result=self.run_pdf(path); self.assertEqual(result.returncode,0)
            page=json.loads(result.stdout)['pages'][0]
            self.assertIn('10 meters',page['text']); self.assertTrue(page['hasVisual']); self.assertFalse(page['ocr'])
            self.assertTrue(path.with_name('page-1.png').exists())

    def test_scanned_page_uses_real_portuguese_ocr(self):
        with tempfile.TemporaryDirectory() as directory:
            path=pathlib.Path(directory)/'scan.pdf'
            image=Image.new('RGB',(1100,500),'white'); draw=ImageDraw.Draw(image)
            font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',40)
            draw.text((50,100),'COMPARE ROTAS DE 10 METROS',fill='black',font=font)
            image.save(path,'PDF',resolution=100)
            result=self.run_pdf(path); self.assertEqual(result.returncode,0)
            output=json.loads(result.stdout); self.assertTrue(output['pages'][0]['ocr'])
            self.assertIn('10',output['pages'][0]['text']); self.assertTrue(output['warnings'])

    def test_rejects_script_encryption_and_page_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            for kind in ['script','encrypted','pages']:
                path=pathlib.Path(directory)/(kind+'.pdf'); writer=PdfWriter();writer.add_blank_page(595,842)
                if kind=='script':writer.add_js('app.alert(1)')
                if kind=='encrypted':writer.encrypt('test-password')
                if kind=='pages':
                    for _ in range(20):writer.add_blank_page(595,842)
                writer.write(path)
                self.assertNotEqual(self.run_pdf(path).returncode,0)

if __name__=='__main__':unittest.main()
