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

    def test_preserves_columns_and_table_cells(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'technical.pdf'
            writer = PdfWriter()
            page = writer.add_blank_page(595, 842)
            font = DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')})
            page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})})
            commands = []
            for i in range(6):
                for x, column in [(50, 'Esquerda'), (235, 'Direita')]:
                    commands.append(f'BT /F1 13 Tf {x} {750-i*20} Td ({column} {i+1}) Tj ET')
            for x in (50, 250, 500):
                commands.append(f'{x} 500 m {x} 560 l S')
            for y in (500, 530, 560):
                commands.append(f'50 {y} m 500 {y} l S')
            for x, y, value in [(60, 540, 'Grandeza'), (260, 540, 'Valor'), (60, 510, 'Massa'), (260, 510, 'x = 10')]:
                commands.append(f'BT /F1 13 Tf {x} {y} Td ({value}) Tj ET')
            stream = DecodedStreamObject(); stream.set_data('\n'.join(commands).encode('ascii'))
            page[NameObject('/Contents')] = writer._add_object(stream)
            writer.write(path)
            result = self.run_pdf(path)
            self.assertEqual(result.returncode, 0, result.stderr)
            output = json.loads(result.stdout)
            text = output['pages'][0]['text']
            self.assertLess(text.index('Esquerda 6'), text.index('Direita 1'))
            self.assertIn('Grandeza | Valor\nMassa | x = 10', text)
            self.assertIn('notação matemática', output['warnings'][0])

    def test_mixed_scan_warns_about_text_inside_images(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'mixed.pdf'
            image = Image.new('RGB', (600, 600), 'white')
            ImageDraw.Draw(image).rectangle((30, 30, 500, 500), outline='black')
            image.save(path, 'PDF', resolution=72)
            writer = PdfWriter(clone_from=path)
            page = writer.pages[0]
            font = DictionaryObject({NameObject('/Type'): NameObject('/Font'),
                                     NameObject('/Subtype'): NameObject('/Type1'),
                                     NameObject('/BaseFont'): NameObject('/Helvetica')})
            page['/Resources'][NameObject('/Font')] = DictionaryObject({NameObject('/F1'): font})
            stream = DecodedStreamObject()
            stream.set_data(b'BT /F1 12 Tf 20 575 Td (Legenda digital com mais de vinte caracteres) Tj ET')
            stream.set_data(page.get_contents().get_data() + b"\n" + stream.get_data())
            page.replace_contents(stream)
            writer.write(path)
            result = self.run_pdf(path)
            self.assertEqual(result.returncode, 0, result.stderr)
            output = json.loads(result.stdout)
            self.assertIn('Legenda digital', output['pages'][0]['text'])
            self.assertIn('imagem extensa com texto digital', output['warnings'][0])

    def test_accepts_forty_pages_in_order(self):
        with tempfile.TemporaryDirectory() as directory:
            path = pathlib.Path(directory) / 'long.pdf'
            writer = PdfWriter()
            font = writer._add_object(DictionaryObject({
                NameObject('/Type'): NameObject('/Font'),
                NameObject('/Subtype'): NameObject('/Type1'),
                NameObject('/BaseFont'): NameObject('/Helvetica'),
            }))
            for number in range(1, 41):
                page = writer.add_blank_page(200, 200)
                page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): font})})
                stream = DecodedStreamObject()
                stream.set_data(f'BT /F1 10 Tf 10 150 Td (Material de teste - pagina {number}.) Tj ET'.encode('ascii'))
                page[NameObject('/Contents')] = writer._add_object(stream)
            writer.write(path)
            result = self.run_pdf(path)
            self.assertEqual(result.returncode, 0, result.stderr)
            pages = json.loads(result.stdout)['pages']
            self.assertEqual([page['page'] for page in pages], list(range(1, 41)))
            self.assertIn('pagina 40', pages[-1]['text'])
            self.assertTrue(path.with_name('page-40.png').exists())

    def test_rejects_script_encryption_and_page_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            for kind in ['script','encrypted','pages']:
                path=pathlib.Path(directory)/(kind+'.pdf'); writer=PdfWriter();writer.add_blank_page(595,842)
                if kind=='script':writer.add_js('app.alert(1)')
                if kind=='encrypted':writer.encrypt('test-password')
                if kind=='pages':
                    for _ in range(40):writer.add_blank_page(595,842)
                writer.write(path)
                self.assertNotEqual(self.run_pdf(path).returncode,0)

if __name__=='__main__':unittest.main()
