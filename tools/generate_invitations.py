"""Generate editable invitation SVGs with the shipped role artwork and a real QR.

pip install -r tools/requirements-artwork.txt
python tools/generate_invitations.py
node tools/render_invitations.cjs  # requires sharp (or NODE_PATH to a shared install)
"""
from pathlib import Path
import random
import xml.etree.ElementTree as ET

import qrcode

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend/assets/invitations"
URL = "https://moonfall-wolfman.onrender.com/"
ET.register_namespace("", "http://www.w3.org/2000/svg")
ART = "".join(ET.tostring(child, encoding="unicode") for child in ET.parse(ROOT / "frontend/assets/character-cards.svg").getroot())


def text(y, words, size=24, color="#d4bb83", spacing=0, serif=False):
    family = "Georgia,serif" if serif else "Microsoft JhengHei,Segoe UI,sans-serif"
    return f'<text x="540" y="{y}" text-anchor="middle" font-family="{family}" font-size="{size}" letter-spacing="{spacing}" fill="{color}">{words}</text>'


def emblem(role, x, y, size):
    return f'<svg x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 260 270"><use href="#character-aura" opacity=".8"/><use href="#character-ground"/><use href="#character-{role}"/></svg>'


def invitation(height):
    tall = height == 1920
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=4)
    qr.add_data(URL)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    pitch = (560 if tall else 450) // len(matrix)
    side = pitch * len(matrix)
    left, top = (1080-side)//2, (height-side)//2
    rng = random.Random(26)
    stars = ''.join(f'<circle cx="{rng.randrange(85,995)}" cy="{rng.randrange(80,height-80)}" r="{rng.choice([1,1.5,2])}" fill="#d9c58f" opacity="{rng.uniform(.18,.5):.2f}"/>' for _ in range(82))
    modules = ''.join(f'<rect x="{left+x*pitch}" y="{top+y*pitch}" width="{pitch}" height="{pitch}"/>' for y,row in enumerate(matrix) for x,dark in enumerate(row) if dark)
    frame = ''.join(f'<path d="M{cx+dx*110} {cy}H{cx}V{cy+dy*110}"/>' for cx,cy,dx,dy in [(56,56,1,1),(1024,56,-1,1),(56,height-56,1,-1),(1024,height-56,-1,-1)])
    heading = text(105 if tall else 88,'A NIGHT OF SECRETS',18,spacing=7)
    heading += text(212 if tall else 174,'MOONFALL',84 if tall else 76,spacing=9,serif=True)
    heading += text(276 if tall else 234,'狼 人 殺',34,spacing=8)
    heading += emblem('wolf',410 if tall else 450,325 if tall else 262,260 if tall else 180)
    heading += text(621 if tall else 449,'月亮升起之後，你會相信誰？',24 if tall else 21,'#b4c4d0',spacing=3)
    bottom = text(1325 if tall else 1024,'掃 碼 入 村',32 if tall else 28,spacing=6)
    bottom += text(1374 if tall else 1065,'SCAN TO ENTER THE VILLAGE',20 if tall else 17,'#a9bccc',spacing=3)
    bottom += text(1446 if tall else 1124,'moonfall-wolfman.onrender.com',22 if tall else 20,'#dfd4b8',spacing=1)
    bottom += text(1538 if tall else 1190,'各用手機 · 廣東話 / ENGLISH · 免費遊玩',21 if tall else 18,'#aebdca',spacing=1)
    bottom += text(1580 if tall else 1223,'YOUR FRIENDS. YOUR SECRETS. ONE SHARED NIGHT.',15 if tall else 12,'#968e7c',spacing=2)
    for i,role in enumerate(['wolf','seer','witch','hunter','villager']):
        size = 158 if tall else 110
        bottom += emblem(role, 92+i*190+(158-size)/2, 1637 if tall else 1248, size)
    bottom += text(1856 if tall else 1390,'5–16 PLAYERS   /   NO DOWNLOAD REQUIRED',16 if tall else 13,spacing=3)
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="{height}" viewBox="0 0 1080 {height}" role="img" aria-label="Moonfall 狼人殺 invitation. Scan the central QR to play at {URL}">
<defs><linearGradient id="invite-sky" x2="1" y2="1"><stop stop-color="#233e54"/><stop offset=".5" stop-color="#101d2c"/><stop offset="1" stop-color="#142a3d"/></linearGradient><radialGradient id="invite-crimson"><stop stop-color="#85324d" stop-opacity=".32"/><stop offset="1" stop-color="#85324d" stop-opacity="0"/></radialGradient></defs>
{ART}
<rect width="1080" height="{height}" fill="url(#invite-sky)"/><ellipse cx="540" cy="410" rx="490" ry="430" fill="url(#invite-crimson)"/>
<rect x="28" y="28" width="1024" height="{height-56}" rx="38" fill="none" stroke="#c2a972" stroke-width="2"/><rect x="42" y="42" width="996" height="{height-84}" rx="28" fill="none" stroke="#c2a972" stroke-opacity=".28"/>
<g fill="none" stroke="#c2a972" stroke-width="2">{frame}</g>{stars}{heading}
<rect x="{left-18}" y="{top-18}" width="{side+36}" height="{side+36}" rx="19" fill="#142332" stroke="#d0b878" stroke-width="2"/>
<rect x="{left}" y="{top}" width="{side}" height="{side}" fill="#fffaf0"/>
<g fill="#10202e" shape-rendering="crispEdges">{modules}</g>
{bottom}</svg>'''


if __name__ == '__main__':
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for height,ratio in [(1920,'9x16'),(1440,'3x4')]:
        path=OUTPUT / f'moonfall-invite-{ratio}.svg'
        path.write_text(invitation(height),encoding='utf-8')
        print(path.relative_to(ROOT))
