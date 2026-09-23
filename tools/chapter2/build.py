"""Bundle the offline app; source pages are only chapter 2 (5–9)."""
from pathlib import Path
import base64, io, json
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parent
PDF = Path(r'C:\Users\leose\Downloads\AnhX2\BTC2.pdf')
OUT = ROOT.parent.parent / 'public' / 'boole-chuong-2.html'
doc = pdfium.PdfDocument(PDF)
images = {}
for page in range(5, 10):
    im = doc[page - 1].render(scale=2).to_pil().convert('RGB')
    stream = io.BytesIO()
    im.save(stream, format='JPEG', quality=88, optimize=True)
    images[page] = 'data:image/jpeg;base64,' + base64.b64encode(stream.getvalue()).decode('ascii')
html = (ROOT / 'shell.html').read_text(encoding='utf-8')
for marker, name in [('STYLE', 'style.css'), ('ENGINE', 'engine.js'), ('CONTENT', 'content.js'), ('APP', 'app.js')]:
    html = html.replace('/*__' + marker + '__*/', (ROOT / name).read_text(encoding='utf-8'))
html = html.replace('/*__IMAGES__*/', json.dumps(images))
OUT.write_text(html, encoding='utf-8')
print(f'Built {OUT} ({OUT.stat().st_size:,} bytes); 5 embedded source pages.')
