"""Generate the public, entirely fictional preview documents. Never consumes user files."""
import json,pathlib,subprocess,io,wave,os
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle,Flowable
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib.colors import HexColor,white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject,TextStringObject
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'apps/web/public/preview';OUT.mkdir(parents=True,exist_ok=True)
data=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {previewFiles,previewDocument,previewPresets,audioTranscript} from './apps/web/lib/preview/data.ts'; console.log(JSON.stringify({files:previewFiles,documents:Object.fromEntries(Object.keys(previewFiles).map(s=>[s,Object.fromEntries(previewPresets.map(p=>[p,previewDocument(s,p)]))])),audio:Object.fromEntries(Object.keys(previewFiles).flatMap(s=>[['narracao','original'],['passos','clear'],['audiodescricao','description']].map(([n,p])=>[s+'-'+n,audioTranscript(s,p)])))}));"],cwd=ROOT))
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
def make_table(rows, body, header, widths):
 cells=[[Paragraph(escape(cell), header if index==0 else body) for cell in row] for index,row in enumerate(rows)]
 table=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
 table.setStyle(TableStyle([
  ('BACKGROUND',(0,0),(-1,0),HexColor('#EAF2FC')),('VALIGN',(0,0),(-1,-1),'TOP'),
  ('GRID',(0,0),(-1,-1),.5,HexColor('#9AACBF')),('LEFTPADDING',(0,0),(-1,-1),8),
  ('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
 ]))
 return table

def document(source,variant,pages):
 size=22 if variant=='ampliado' else 12
 ink='#000000' if variant=='ampliado' else '#173651'
 styles=getSampleStyleSheet()
 styles.add(ParagraphStyle(name='BodyPreview',fontName='PreviewSans',fontSize=size,leading=size*(1.8 if size==22 else 1.48),textColor=HexColor(ink),spaceAfter=size*.65))
 styles.add(ParagraphStyle(name='TitlePreview',fontName='PreviewBold',fontSize=26 if size==22 else 21,leading=32,textColor=HexColor(ink),spaceAfter=16))
 styles.add(ParagraphStyle(name='SectionPreview',fontName='PreviewBold',fontSize=17,leading=23,textColor=HexColor(ink),spaceBefore=12,spaceAfter=8,keepWithNext=True))
 styles.add(ParagraphStyle(name='NotePreview',fontName='PreviewSans',fontSize=10,leading=15,textColor=HexColor(ink),spaceAfter=12))
 styles.add(ParagraphStyle(name='CellPreview',fontName='PreviewSans',fontSize=11,leading=15,textColor=HexColor(ink)))
 styles.add(ParagraphStyle(name='CellTitlePreview',parent=styles['CellPreview'],fontName='PreviewBold'))
 body, heading = styles['BodyPreview'], styles['SectionPreview']
 parts=[]
 for page in pages:
  if parts: parts.append(PageBreak())
  parts.extend([Paragraph(f"GUIA DE ATIVIDADE · {source.upper()} · FICHA {page['page']:02}",styles['NotePreview']),
                Paragraph(escape(page['title']),styles['TitlePreview']),
                Paragraph('Universidade Exemplo · atividade didática fictícia',styles['NotePreview'])])
  if page['page']==2:
   if source=='campus':
    parts.append(CampusMap())
   elif source=='energia':
    parts.append(make_table([['Equipamento','Potência','Uso por dia','Energia em 20 dias'],['Computador','120 W','4 horas','9,6 kWh'],['Luminária','12 W','5 horas','1,2 kWh']],styles['CellPreview'],styles['CellTitlePreview'],[155,85,95,116]))
   else:
    parts.append(make_table([['Código','Situação','Saída esperada'],['B01','Disponível','Registrar empréstimo'],['B02','Indisponível','Informar que já foi emprestado'],['B99','Inexistente','Informar que o código não foi encontrado']],styles['CellPreview'],styles['CellTitlePreview'],[80,135,236]))
   parts.append(Spacer(1,14))
  for paragraph in page['text'].split('\n\n'):
   parts.append(Paragraph(escape(paragraph).replace('\n','<br/>'),body))
  if page.get('steps'):
   parts.append(Paragraph('Passos da atividade',heading))
   for i,step in enumerate(page['steps'],1):parts.append(Paragraph(f'{i}. {escape(step)}',body))
  if page.get('glossary'):
   parts.append(Paragraph('Glossário',heading))
   for term in page['glossary']:parts.append(Paragraph(f"<b>{escape(term['term'])}.</b> {escape(term['definition'])}",body))
  if page['description']:
   parts.extend([Paragraph('Descrição das informações visuais',heading),Paragraph(escape(page['description']),body)])
 path=OUT/f'{source}-{variant}.pdf'
 SimpleDocTemplate(str(path),pagesize=(595.28,841.89),rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=55,title=data['files'][source]['title'],author='Travessia - dados fictícios',invariant=True).build(parts,onFirstPage=footer,onLaterPages=footer)
 writer=PdfWriter(clone_from=str(path));writer._root_object[NameObject('/Lang')]=TextStringObject('pt-BR')
 buffer=io.BytesIO();writer.write(buffer);path.write_bytes(buffer.getvalue())
 if variant=='original':
  if len(PdfReader(path).pages)!=len(pages):raise ValueError(f'{source}: a paginação do original mudou')
  subprocess.run(['pdftoppm','-scale-to','1000','-png',str(path),str(OUT/f'{source}-page')],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

for source, presets in data['documents'].items():
 for preset,variant in [('original','original'),('expanded','ampliado'),('clear','passos'),('glossary','glossario'),('description','descricao')]:
  document(source,variant,presets[preset])
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
