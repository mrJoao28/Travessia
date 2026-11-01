"""Generate the public, entirely fictional preview documents. Never consumes user files."""
import json,pathlib,subprocess,io,wave,os
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle,Flowable
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject,TextStringObject
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'apps/web/public/preview';OUT.mkdir(parents=True,exist_ok=True)
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {previewFiles,readingText,audioTranscript} from './apps/web/lib/preview/data.ts'; console.log(JSON.stringify({files:previewFiles,readings:Object.fromEntries(Object.keys(previewFiles).map(s=>[s,{clear:readingText(s,'clear'),glossary:readingText(s,'glossary')}])),audio:Object.fromEntries(Object.keys(previewFiles).flatMap(s=>[['narracao','original'],['passos','clear'],['audiodescricao','description']].map(([n,p])=>[s+'-'+n,audioTranscript(s,p)])))}));"],cwd=ROOT))
font='/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('PreviewSans',font+'DejaVuSans.ttf'));pdfmetrics.registerFont(TTFont('PreviewBold',font+'DejaVuSans-Bold.ttf'))
class CampusMap(Flowable):
 def __init__(self):Flowable.__init__(self);self.width=460;self.height=150
 def draw(self):
  c=self.canv;c.setFont('PreviewBold',11);c.setFillColor(HexColor('#173651'));c.drawString(0,135,'Esquema fictício - sem escala')
  for y,label in [(100,'A: 180 m - dois degraus'),(65,'B: 240 m - caixas na passagem'),(30,'C: 310 m - placas pequenas')]:
   c.setStrokeColor(HexColor('#075A9C'));c.line(90,y,365,y);c.circle(90,y,4,fill=0);c.circle(365,y,4,fill=0);c.setFont('PreviewSans',10);c.drawString(110,y+10,label)
  c.setFont('PreviewBold',11);c.drawString(0,65,'Salas');c.drawString(383,65,'Biblioteca')
def footer(c,doc):
 c.setStrokeColor(HexColor('#D6E1ED'));c.line(42,40,552,40);c.setFont('PreviewSans',8);c.setFillColor(HexColor('#50657A'));c.drawString(42,27,'Travessia | material fictício de prévia | sem dados reais');c.drawRightString(552,27,str(doc.page))
def document(source,variant,text):
 size=22 if variant=='ampliado' else 12
 styles=getSampleStyleSheet();styles.add(ParagraphStyle(name='BodyPreview',fontName='PreviewSans',fontSize=size,leading=size*1.55,textColor=HexColor('#173651'),spaceAfter=size*.65));styles.add(ParagraphStyle(name='TitlePreview',fontName='PreviewBold',fontSize=26 if size==22 else 21,leading=32,textColor=HexColor('#075A9C'),spaceAfter=18));styles.add(ParagraphStyle(name='NotePreview',fontName='PreviewSans',fontSize=10,leading=15,textColor=HexColor('#50657A'),spaceAfter=12))
 parts=[Paragraph(data['files'][source]['title'],styles['TitlePreview']),Paragraph('Cenário fictício. '+('Exemplo de adaptação com resultado de IA simulado; sujeito à revisão docente.' if variant in ['passos','glossario'] else 'Atividade didática de demonstração.'),styles['NotePreview'])]
 for p in text.split('\n\n'):parts.append(Paragraph(p.replace('\n','<br/>'),styles['BodyPreview']))
 parts.append(PageBreak());parts.append(Paragraph('Consultar, comparar e justificar',styles['TitlePreview']))
 if source=='campus':
  parts.append(CampusMap());parts.append(Spacer(1,18));parts.append(Paragraph(data['files'][source]['description'],styles['BodyPreview']))
 elif source=='energia':
  table=Table([['Equipamento','Potência','Uso por dia','20 dias'],['Computador','120 W','4 horas','9,6 kWh'],['Luminária','12 W','5 horas','1,2 kWh']],colWidths=[155,85,105,100]);table.setStyle(TableStyle([('FONTNAME',(0,0),(-1,-1),'PreviewSans'),('BACKGROUND',(0,0),(-1,0),HexColor('#EAF2FC')),('TEXTCOLOR',(0,0),(-1,-1),HexColor('#173651')),('GRID',(0,0),(-1,-1),.5,HexColor('#D6E1ED')),('PADDING',(0,0),(-1,-1),10)]));parts.append(table);parts.append(Spacer(1,16));parts.append(Paragraph('Total: 10,8 kWh. Explicite as unidades e explique como potência e tempo influenciam a energia.',styles['BodyPreview']))
 else:parts.append(Paragraph('Teste 1: livro B01 disponível e leitor L01 cadastrado. Resultado esperado: empréstimo registrado.<br/><br/>Teste 2: livro B02 indisponível. Resultado esperado: explicar o motivo e não registrar.<br/><br/>Teste 3: código inexistente. Resultado esperado: informar a ausência sem interromper o programa.',styles['BodyPreview']))
 parts.append(Spacer(1,16));parts.append(Paragraph('Sua entrega',styles['TitlePreview']));parts.append(Paragraph('Apresente sua decisão, use pelo menos dois dados do material e explique como você conferiu o resultado. Os objetivos e critérios são os mesmos para todos os formatos.',styles['BodyPreview']))
 path=OUT/f'{source}-{variant}.pdf';SimpleDocTemplate(str(path),pagesize=(595.28,841.89),rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=55,title=data['files'][source]['title'],author='Travessia - dados fictícios').build(parts,onFirstPage=footer,onLaterPages=footer)
 writer=PdfWriter(clone_from=str(path));writer._root_object[NameObject('/Lang')]=TextStringObject('pt-BR');buffer=io.BytesIO();writer.write(buffer);path.write_bytes(buffer.getvalue())
 # The original page images are public fixtures for the comparison; production uses private assets.
 if variant=='original':subprocess.run(['pdftoppm','-scale-to','1000','-png',str(path),str(OUT/f'{source}-page')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for source in data['files']:document(source,'original',data['files'][source]['text'])
for source in data['files']:
 for variant,key in [('ampliado',None),('passos','clear'),('glossario','glossary')]:document(source,variant,data['files'][source]['text'] if key is None else data['readings'][source][key])
(OUT/'resposta-exemplo.txt').write_text('Cenário fictício. Escolho a rota C, de 310 metros, porque não há degraus observados. As placas pequenas ainda precisam de melhoria. Vou comparar a legibilidade com as pessoas que usam o trajeto.\n',encoding='utf8')
texts={**data['audio'],'resposta-marina':'Esta é uma resposta fictícia de estudante. Escolho a rota C, de trezentos e dez metros, porque não tem degraus observados. Mesmo assim, as placas pequenas precisam de atenção. Vou justificar a escolha comparando também a rota A e propor uma conferência com quem utiliza o caminho.'}
for name,text in texts.items():(OUT/f'{name}.txt').write_text(text+'\n',encoding='utf8')
if os.environ.get('PREVIEW_VOICE_MODEL'):
 from piper import PiperVoice
 voice=PiperVoice.load(os.environ['PREVIEW_VOICE_MODEL'],use_cuda=False)
 for name,text in texts.items():
  wav=OUT/f'{name}.wav'
  with wave.open(str(wav),'wb') as audio:voice.synthesize_wav(text,audio)
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-codec:a','libmp3lame','-b:a','64k',str(OUT/f'{name}.mp3')],check=True);wav.unlink()
print('Arquivos fictícios gerados em apps/web/public/preview.')
