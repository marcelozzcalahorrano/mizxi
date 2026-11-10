#!/usr/bin/env python3
"""
Genera el repositorio de sprites de Mizuki (estilo ANIME) como PNG transparentes.
24 emociones + variantes _talk (boca abierta) para lip-sync.
Reemplaza cualquier PNG por tu propio arte manteniendo el nombre.

Uso:  python3 tools/generate_sprites.py
Salida: sprites/*.png  +  sprites/manifest.json
"""
import os, json, math
from PIL import Image, ImageDraw, ImageFilter

S = 3                      # supersampling (anti-alias)
W, H = 512, 700
OUT = os.path.join(os.path.dirname(__file__), "..", "sprites")
os.makedirs(OUT, exist_ok=True)

# ---------- paleta ----------
SKIN    = (255, 228, 213, 255)
SKIN_SH = (245, 198, 178, 255)   # sombra piel
LINE    = (205, 140, 120, 255)
OUTL    = (70, 48, 80, 255)      # delineado
HAIR    = (88, 64, 142, 255)
HAIR_DK = (62, 42, 106, 255)
HAIR_DKR= (46, 30, 82, 255)
HAIR_HI = (152, 120, 210, 255)
EYEW    = (252, 252, 255, 255)
IRIS_T  = (28, 92, 150, 255)     # iris arriba (oscuro)
IRIS_M  = (62, 158, 222, 255)    # iris medio
IRIS_B  = (140, 215, 250, 255)   # iris abajo (claro)
PUPIL   = (18, 32, 52, 255)
LASH    = (52, 34, 64, 255)
BROW    = (96, 70, 140, 255)
MOUTH   = (198, 84, 104, 255)
MOUTH_D = (134, 44, 66, 255)
TONGUE  = (238, 140, 150, 255)
BLUSH   = (255, 148, 162, 255)
CLOTH   = (72, 52, 118, 255)
CLOTH_D = (54, 38, 92, 255)
COLLAR  = (236, 232, 248, 255)
RIBBON  = (226, 94, 130, 255)
WHITE   = (255, 255, 255, 255)
RED     = (255, 96, 120, 255)

CX = 256
EYE_Y = 326
EYE_DX = 71
MOUTH_Y = 402

def s(v): return v * S

def new_canvas():
    img = Image.new("RGBA", (W*S, H*S), (0,0,0,0))
    return img, ImageDraw.Draw(img)

def P(pts): return [(s(x), s(y)) for (x, y) in pts]

def bez(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n+1):
        t = i/n; mt = 1-t
        x = mt**3*p0[0] + 3*mt*mt*t*p1[0] + 3*mt*t*t*p2[0] + t**3*p3[0]
        y = mt**3*p0[1] + 3*mt*mt*t*p1[1] + 3*mt*t*t*p2[1] + t**3*p3[1]
        out.append((x, y))
    return out

def path(*segs):
    """Encadena listas de puntos/beziers en un solo contorno."""
    pts = []
    for seg in segs:
        if pts and seg and seg[0] == pts[-1]:
            pts.extend(seg[1:])
        else:
            pts.extend(seg)
    return pts

def poly(d, pts, fill, outline=None, ow=0):
    d.polygon(P(pts), fill=fill,
              outline=outline, width=max(1, int(s(ow))) if outline else 0)

def line(d, pts, fill, wid):
    d.line(P(pts), fill=fill, width=max(1, int(s(wid))), joint="curve")

def ellipse(d, cx, cy, rx, ry, fill, outline=None, ow=0):
    d.ellipse([s(cx-rx), s(cy-ry), s(cx+rx), s(cy+ry)], fill=fill,
              outline=outline, width=max(1, int(s(ow))) if outline else 0)

def arc_pts(cx, cy, rx, ry, a0, a1, n=26):
    return [(cx+rx*math.cos(a), cy+ry*math.sin(a))
            for a in [a0+(a1-a0)*i/n for i in range(n)] + [a1]] \
           if False else \
           [(cx+rx*math.cos(a0+(a1-a0)*i/n), cy+ry*math.sin(a0+(a1-a0)*i/n))
            for i in range(n+1)]

def soft_layer(img, draw_fn, blur=6):
    layer = Image.new("RGBA", img.size, (0,0,0,0))
    draw_fn(ImageDraw.Draw(layer))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(s(blur))))

# ---------- contornos base ----------
def face_outline_pts():
    # mitad derecha y espejo (barbilla suave estilo anime)
    right = path(
        bez((256,452),(304,448),(336,418),(348,368)),
        bez((348,368),(356,322),(356,286),(350,250)),
        bez((350,250),(344,182),(312,146),(256,142)),
    )
    left = [(2*CX-x, y) for (x, y) in right][::-1]
    return right + left

def draw_body(d):
    # cuello
    poly(d, [(234,428),(232,500),(280,500),(278,428)], SKIN)
    # sombra bajo barbilla
    poly(d, [(236,430),(234,462),(278,462),(276,430)], SKIN_SH)
    # hombros / torso
    torso = path(
        bez((278,478),(330,490),(400,520),(438,580)),
        [(448,700),(64,700)],
        bez((74,580),(112,520),(182,490),(234,478)),
    )
    poly(d, torso, CLOTH)
    # pliegues sutiles
    line(d, bez((150,620),(180,590),(200,588),(214,604),14), CLOTH_D, 3)
    line(d, bez((298,604),(312,588),(332,590),(362,620),14), CLOTH_D, 3)
    # cuello marinero (seifuku)
    poly(d, path(
        bez((234,480),(214,498),(176,520),(150,560)),
        [(200,590),(256,540)],
    ), COLLAR)
    poly(d, path(
        bez((278,480),(298,498),(336,520),(362,560)),
        [(312,590),(256,540)],
    ), COLLAR)
    line(d, [(150,560),(200,590)], CLOTH_D, 2)
    line(d, [(362,560),(312,590)], CLOTH_D, 2)
    # franja del cuello
    line(d, bez((160,552),(210,576),(302,576),(352,552),18), (160,140,210,255), 4)
    # moño
    poly(d, [(256,545),(226,565),(232,588),(256,566)], RIBBON)
    poly(d, [(256,545),(286,565),(280,588),(256,566)], RIBBON)
    ellipse(d, 256, 558, 10, 9, (200,70,105,255))

def draw_back_hair(d):
    # melena larga detrás (mechones redondeados)
    base = path(
        bez((136,210),(96,260),(84,340),(88,440)),
        bez((88,440),(90,540),(110,610),(140,650)),
        [(372,650)],
        bez((372,650),(402,610),(422,540),(424,440)),
        bez((424,440),(428,340),(416,260),(376,210)),
        bez((376,210),(340,150),(300,128),(256,126)),
        bez((256,126),(212,128),(172,150),(136,210)),
    )
    poly(d, base, HAIR_DK)
    # puntas/mechones inferiores
    for cx_, w_, y0, y1 in [(150,30,520,660),(205,36,560,688),(256,40,580,696),
                            (307,36,560,688),(362,30,520,660)]:
        poly(d, path(
            [(cx_-w_//2, y0)],
            bez((cx_-w_//2,y0),(cx_-w_//2-6,y1-40),(cx_-10,y1),(cx_,y1)),
            bez((cx_,y1),(cx_+10,y1),(cx_+w_//2+6,y1-40),(cx_+w_//2,y0)),
        ), HAIR_DKR)

def draw_front_hair(d, img):
    # casquete superior
    dome = path(
        bez((134,258),(120,160),(180,108),(256,104)),
        bez((256,104),(332,108),(392,160),(378,258)),
        bez((378,258),(372,282),(362,290),(354,284)),
        bez((354,284),(350,240),(344,222),(332,208)),
        bez((332,208),(336,250),(330,276),(318,296)),
        bez((318,296),(310,258),(300,236),(286,224)),
        bez((286,224),(292,262),(286,296),(272,318)),
        bez((272,318),(264,284),(256,268),(250,262)),
        bez((250,262),(248,292),(240,312),(228,322)),
        bez((228,322),(226,284),(218,252),(206,236)),
        bez((206,236),(208,268),(200,290),(188,300)),
        bez((188,300),(184,262),(176,234),(164,220)),
        bez((164,220),(164,252),(158,272),(148,282)),
        bez((148,282),(142,286),(136,278),(134,258)),
    )
    poly(d, dome, HAIR)
    # mechones laterales largos
    for sgn in (-1, 1):
        x0 = CX + sgn*120
        lock = path(
            bez((x0, 248),(x0+sgn*28, 300),(x0+sgn*30, 380),(x0+sgn*20, 470)),
            bez((x0+sgn*20, 470),(x0+sgn*16, 505),(x0+sgn*4, 515),(x0-sgn*2, 500)),
            bez((x0-sgn*2, 500),(x0-sgn*6, 420),(x0-sgn*10, 330),(x0-sgn*6, 258)),
        )
        poly(d, lock, HAIR)
        line(d, bez((x0+sgn*10,300),(x0+sgn*16,360),(x0+sgn*14,420),(x0+sgn*8,470),16),
             HAIR_DK, 3)
    # brillo anime (zigzag)
    hi = []
    xzs = [150, 180, 210, 240, 270, 300, 330, 360]
    for i, x in enumerate(xzs):
        hi.append((x, 176 + (10 if i % 2 else -2)))
    lo = []
    for i, x in enumerate(reversed(xzs)):
        lo.append((x, 206 + (-2 if i % 2 else 10)))
    layer = Image.new("RGBA", img.size, (0,0,0,0))
    ld = ImageDraw.Draw(layer)
    ld.polygon(P(hi + lo), fill=HAIR_HI[:3] + (170,))
    img.alpha_composite(layer.filter(ImageFilter.GaussianBlur(s(2))))

def draw_face(d, img):
    pts = face_outline_pts()
    poly(d, pts, SKIN, outline=OUTL, ow=1.4)
    # sombra del flequillo sobre la frente
    def sh(ld):
        ld.polygon(P(path(
            bez((150,250),(190,286),(322,286),(362,250)),
            bez((362,250),(322,266),(190,266),(150,250)),
        )), fill=(150, 90, 110, 70))
    soft_layer(img, sh, blur=5)

def draw_blush(img, amount, lines_too=True):
    if amount <= 0.02: return
    a = int(165 * amount)
    def fn(ld):
        for sx in (-78, 78):
            ld.ellipse([s(CX+sx-36), s(366-15), s(CX+sx+36), s(366+15)],
                       fill=BLUSH[:3] + (a,))
    soft_layer(img, fn, blur=7)
    if lines_too and amount > 0.55:
        d = ImageDraw.Draw(img)
        for sx in (-78, 78):
            for i in (-1, 0, 1):
                line(d, [(CX+sx+i*14-7, 358), (CX+sx+i*14+5, 376)],
                     (225, 105, 125, 200), 2.2)

# ---------- ojos ----------
def eye_shape(open_v):
    ew, eh = 46, 30 * max(0.1, open_v)   # semiejes
    return ew, eh

def draw_eye(d, img, side, style, open_v, look):
    ex = CX + side*EYE_DX
    ey = EYE_Y
    lx, ly = look
    if style == "closed_happy" or (style == "wink" and side < 0):
        line(d, bez((ex-34, ey+6), (ex-16, ey-16), (ex+16, ey-16), (ex+34, ey+6)), LASH, 5.5)
        return
    if style == "closed_flat":
        line(d, bez((ex-32, ey), (ex-12, ey+4), (ex+12, ey+4), (ex+32, ey)), LASH, 5)
        return
    ew, eh = eye_shape(open_v)
    if style == "half": eh *= 0.55
    if style == "wide": ew, eh = ew*1.06, eh*1.12

    # esclera
    ellipse(d, ex, ey, ew, eh, EYEW)
    # iris (recortado con mascara del ojo)
    iris = Image.new("RGBA", img.size, (0,0,0,0))
    idr = ImageDraw.Draw(iris)
    ix, iy = ex + lx*12, ey + ly*8 + 2
    irx, iry = 27, min(34, eh*1.25)
    if style == "heart":
        hs = 30
        for dx_ in (-0.5, 0.5):
            idr.ellipse([s(ix+dx_*hs*0.5-hs*0.30), s(iy-hs*0.42),
                         s(ix+dx_*hs*0.5+hs*0.30), s(iy+hs*0.18)], fill=RED)
        idr.polygon(P([(ix-hs*0.58, iy-hs*0.06), (ix+hs*0.58, iy-hs*0.06),
                       (ix, iy+hs*0.62)]), fill=RED)
    else:
        idr.ellipse([s(ix-irx), s(iy-iry), s(ix+irx), s(iy+iry)], fill=IRIS_T)
        idr.ellipse([s(ix-irx*0.92), s(iy-iry*0.55), s(ix+irx*0.92), s(iy+iry)], fill=IRIS_M)
        idr.ellipse([s(ix-irx*0.62), s(iy+iry*0.05), s(ix+irx*0.62), s(iy+iry*0.92)], fill=IRIS_B)
        # pupila
        idr.ellipse([s(ix-irx*0.34), s(iy-iry*0.46), s(ix+irx*0.34), s(iy+iry*0.42)], fill=PUPIL)
        # brillos
        idr.ellipse([s(ix-irx*0.62), s(iy-iry*0.72), s(ix-irx*0.02), s(iy-iry*0.18)], fill=WHITE)
        idr.ellipse([s(ix+irx*0.18), s(iy+iry*0.30), s(ix+irx*0.52), s(iy+iry*0.62)],
                    fill=(255,255,255,200))
    # mascara: solo dentro de la esclera
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).ellipse([s(ex-ew), s(ey-eh), s(ex+ew), s(ey+eh)], fill=255)
    img.paste(iris, (0,0), Image.composite(iris.split()[3], Image.new("L", img.size, 0), mask))

    d2 = ImageDraw.Draw(img)
    # párpado superior: banda de pestañas gruesa
    lash_band = path(
        bez((ex-ew-6, ey-eh*0.18), (ex-ew*0.5, ey-eh*1.55), (ex+ew*0.5, ey-eh*1.55), (ex+ew+4, ey-eh*0.32)),
        bez((ex+ew+4, ey-eh*0.32), (ex+ew*0.5, ey-eh*1.12), (ex-ew*0.5, ey-eh*1.12), (ex-ew-6, ey-eh*0.18)),
    )
    poly(d2, lash_band, LASH)
    # pestaña exterior
    tip = ex + side*(ew+4)
    line(d2, bez((tip, ey-eh*0.35), (tip+side*8, ey-eh*0.7), (tip+side*13, ey-eh*0.95), (tip+side*15, ey-eh*1.15)), LASH, 4)
    # línea párpado (crease)
    line(d2, bez((ex-ew*0.7, ey-eh*1.65), (ex-ew*0.2, ey-eh*1.95), (ex+ew*0.2, ey-eh*1.95), (ex+ew*0.7, ey-eh*1.65)), (120, 80, 120, 160), 2.4)
    # pestañita inferior
    line(d2, bez((ex-ew*0.6, ey+eh*0.9), (ex-ew*0.2, ey+eh*1.08), (ex+ew*0.2, ey+eh*1.08), (ex+ew*0.6, ey+eh*0.9)), (150, 100, 120, 170), 2.2)

def draw_brow(d, side, angle, raise_=0):
    bx = CX + side*EYE_DX
    by = EYE_Y - 58 - raise_
    a = angle * side
    def rot(x, y):
        return (bx + x*math.cos(a) - y*math.sin(a), by + x*math.sin(a) + y*math.cos(a))
    p0 = rot(-30, 5 + angle*8)
    pm1 = rot(-10, -4)
    pm2 = rot(10, -6)
    p1 = rot(30, -2 - angle*8)
    line(d, bez(p0, pm1, pm2, p1), BROW, 4.6)

def draw_nose(d):
    line(d, [(CX+3, 366), (CX-2, 377)], LINE, 2.4)

def draw_mouth(d, shape, open_v=0):
    mx, my = CX, MOUTH_Y
    if open_v > 0.1 and shape != "kiss":
        ow = 26 * (0.7 + open_v*0.5)
        oh = open_v * 34
        mouth = path(
            bez((mx-ow, my), (mx-ow*0.4, my-6), (mx+ow*0.4, my-6), (mx+ow, my)),
            bez((mx+ow, my), (mx+ow*0.9, my+oh), (mx-ow*0.9, my+oh), (mx-ow, my)),
        )
        poly(d, mouth, MOUTH_D)
        ellipse(d, mx, my+oh*0.62, ow*0.55, oh*0.34, TONGUE)
        line(d, bez((mx-ow, my), (mx-ow*0.4, my-6), (mx+ow*0.4, my-6), (mx+ow, my)), MOUTH_D, 2)
        return
    if shape == "smile_lg":
        line(d, bez((mx-26, my-6), (mx-12, my+10), (mx+12, my+10), (mx+26, my-6)), MOUTH, 4.6)
    elif shape == "smile_sm":
        line(d, bez((mx-16, my-2), (mx-7, my+6), (mx+7, my+6), (mx+16, my-2)), MOUTH, 4)
    elif shape == "flat":
        line(d, [(mx-14, my+1), (mx+14, my+1)], MOUTH, 4)
    elif shape == "frown":
        line(d, bez((mx-20, my+8), (mx-9, my-4), (mx+9, my-4), (mx+20, my+8)), MOUTH, 4.4)
    elif shape == "pout":
        ellipse(d, mx, my+2, 11, 8, MOUTH_D)
        ellipse(d, mx, my, 8, 5, TONGUE)
    elif shape == "cat":
        line(d, bez((mx-20, my-3), (mx-12, my+7), (mx-4, my+1), (mx, my-1)), MOUTH, 4)
        line(d, bez((mx, my-1), (mx+4, my+1), (mx+12, my+7), (mx+20, my-3)), MOUTH, 4)
    elif shape == "wobble":
        line(d, [(mx-18, my), (mx-9, my+7), (mx, my), (mx+9, my+7), (mx+18, my)], MOUTH, 4)
    elif shape == "grimace":
        d.rounded_rectangle([s(mx-20), s(my-6), s(mx+20), s(my+9)], radius=s(5), fill=MOUTH_D)
        for gx in range(-14, 15, 10):
            line(d, [(mx+gx, my-6), (mx+gx, my+9)], WHITE, 2.4)
    elif shape == "tongue":
        line(d, bez((mx-22, my-5), (mx-10, my+8), (mx+10, my+8), (mx+22, my-5)), MOUTH, 4.6)
        ellipse(d, mx+9, my+12, 9, 12, TONGUE)
        line(d, [(mx+9, my+4), (mx+9, my+16)], (210, 100, 115, 255), 1.8)
    else:
        line(d, [(mx-12, my), (mx+12, my)], MOUTH, 4)

# ---------- decals ----------
def decal(d, kind):
    if kind == "vein":
        vx, vy = CX+104, 208
        for a0 in (0.5, 2.0, 3.6, 5.1):
            line(d, [(vx+9*math.cos(a0), vy+9*math.sin(a0)),
                     (vx+20*math.cos(a0), vy+20*math.sin(a0))], (235, 80, 100, 255), 4.4)
    elif kind == "sweat":
        poly(d, path(
            bez((CX+126, 250), (CX+134, 270), (CX+138, 282), (CX+126, 290)),
            bez((CX+126, 290), (CX+114, 282), (CX+118, 270), (CX+126, 250)),
        ), (150, 212, 255, 235))
    elif kind == "tears":
        for sx in (-EYE_DX, EYE_DX):
            poly(d, [(CX+sx-9, EYE_Y+26), (CX+sx+9, EYE_Y+26), (CX+sx+3, EYE_Y+86), (CX+sx-3, EYE_Y+86)],
                 (150, 212, 255, 215))
            ellipse(d, CX+sx, EYE_Y+88, 7, 9, (150, 212, 255, 225))
    elif kind == "hearts":
        for hx, hy, hs in [(CX-170, 200, 20), (CX+168, 160, 26), (CX+130, 96, 15)]:
            for dx_ in (-0.5, 0.5):
                ellipse(d, hx+dx_*hs*0.5, hy-hs*0.12, hs*0.32, hs*0.32, RED)
            poly(d, [(hx-hs*0.6, hy), (hx+hs*0.6, hy), (hx, hy+hs*0.72)], RED)
    elif kind == "sparkle":
        for sx, sy, ss in [(CX-172, 190, 15), (CX+172, 150, 19), (CX+146, 92, 11), (CX-140, 110, 9)]:
            poly(d, [(sx, sy-ss), (sx+ss*0.28, sy-ss*0.28), (sx+ss, sy), (sx+ss*0.28, sy+ss*0.28),
                     (sx, sy+ss), (sx-ss*0.28, sy+ss*0.28), (sx-ss, sy), (sx-ss*0.28, sy-ss*0.28)],
                 (255, 244, 180, 240))
    elif kind == "zzz":
        for zx, zy, zs in [(CX+150, 150, 15), (CX+180, 116, 21), (CX+214, 78, 27)]:
            line(d, [(zx-zs/2, zy-zs/2), (zx+zs/2, zy-zs/2), (zx-zs/2, zy+zs/2), (zx+zs/2, zy+zs/2)],
                 (185, 205, 255, 235), 3.4)
    elif kind == "shadow":
        poly(d, path(
            bez((150, 250), (190, 282), (322, 282), (362, 250)),
            [(362, 230), (150, 230)],
        ), (64, 48, 96, 110))
    elif kind == "notes":
        for nx, ny in [(CX-168, 170), (CX+160, 126), (CX+196, 184)]:
            ellipse(d, nx, ny, 8, 6, (150, 110, 230, 255))
            line(d, [(nx+7, ny), (nx+7, ny-26)], (150, 110, 230, 255), 3)
            line(d, [(nx+7, ny-26), (nx+16, ny-22)], (150, 110, 230, 255), 3)
    elif kind == "question":
        qx, qy = CX+156, 120
        line(d, bez((qx-12, qy-6), (qx-10, qy-22), (qx+12, qy-22), (qx+10, qy-2)), (255,255,255,235), 4)
        line(d, [(qx+10, qy-2), (qx+2, qy+6)], (255,255,255,235), 4)
        line(d, [(qx+2, qy+8), (qx+2, qy+16)], (255,255,255,235), 4)
        ellipse(d, qx+2, qy+25, 3, 3, (255,255,255,235))

# ---------- tabla de emociones ----------
# eye_style, open, brow_angle, brow_raise, mouth_shape, blush, look, extras
E = {
 "neutral":   ("normal", 1.0,  0.0, 0, "smile_sm", 0.15, (0, 0),    []),
 "happy":     ("normal", 0.9,  0.12,4, "smile_lg", 0.35, (0, -0.1), ["sparkle"]),
 "smile":     ("normal", 1.0,  0.08,2, "smile_sm", 0.25, (0, 0),    []),
 "shy":       ("normal", 0.88, 0.22,6, "smile_sm", 0.95, (0.3, 0.2),["sweat"]),
 "blush":     ("normal", 0.94, 0.18,4, "flat",     1.0,  (0, 0.1),  []),
 "angry":     ("normal", 1.0, -0.55,0, "grimace",  0.45, (0, 0),    ["vein"]),
 "pout":      ("normal", 0.82,-0.22,0, "pout",     0.6,  (0.2, 0.1),[]),
 "annoyed":   ("half",   0.6, -0.35,0, "flat",     0.25, (-0.3, 0), ["sweat"]),
 "sad":       ("normal", 0.8,  0.45,8, "frown",    0.15, (0, 0.3),  []),
 "cry":       ("normal", 0.68, 0.55,10,"wobble",   0.25, (0, 0.2),  ["tears"]),
 "love":      ("heart",  1.0,  0.12,4, "smile_lg", 0.7,  (0, 0),    ["hearts"]),
 "wink":      ("wink",   1.0,  0.1, 4, "smile_lg", 0.4,  (0, 0),    []),
 "smug":      ("half",   0.7, -0.12,0, "cat",      0.3,  (-0.2, 0), []),
 "teasing":   ("wink",   1.0,  0.05,2, "tongue",   0.4,  (0, 0),    []),
 "surprised": ("wide",   1.12, 0.2, 9, "open_o",   0.25, (0, 0),    ["sweat"]),
 "sleepy":    ("half",   0.35, 0.08,0, "smile_sm", 0.2,  (0, 0.2),  ["zzz"]),
 "bored":     ("half",   0.55,-0.05,0, "flat",     0.12, (-0.3, 0), ["shadow"]),
 "excited":   ("wide",   1.08, 0.2, 6, "smile_lg", 0.45, (0, -0.1), ["sparkle"]),
 "jealous":   ("half",   0.62,-0.45,0, "frown",    0.4,  (-0.5, 0), ["vein"]),
 "worried":   ("normal", 0.85, 0.55,8, "wobble",   0.3,  (0, 0.1),  ["sweat"]),
 "laugh":     ("closed_happy", 1, 0.1, 4, "smile_lg", 0.35, (0, 0), []),
 "sulk":      ("half",   0.58,-0.18,0, "pout",     0.35, (-0.5, 0.1),["shadow"]),
 "curious":   ("wide",   1.04, 0.1,10, "smile_sm", 0.2,  (0.3, -0.1),["question"]),
 "sing":      ("closed_happy", 1, 0.1, 4, "open_o", 0.3, (0, 0),    ["notes"]),
}
TALK = ["neutral", "happy", "angry", "shy", "smug", "teasing", "sad", "excited"]

def render(name, params, talk=False):
    eye_style, open_v, brow_a, brow_r, mouth, blush, look, extras = params
    img, d = new_canvas()
    draw_back_hair(d)
    draw_body(d)
    draw_face(d, img)
    d = ImageDraw.Draw(img)
    draw_blush(img, blush)
    d = ImageDraw.Draw(img)
    # ojos
    if eye_style == "wink":
        draw_eye(d, img, -1, "wink", open_v, look)
        d = ImageDraw.Draw(img)
        draw_eye(d, img, 1, "normal", open_v, look)
    else:
        draw_eye(d, img, -1, eye_style, open_v, look)
        d = ImageDraw.Draw(img)
        draw_eye(d, img, 1, eye_style, open_v, look)
    d = ImageDraw.Draw(img)
    draw_brow(d, -1, brow_a, brow_r)
    draw_brow(d,  1, brow_a, brow_r)
    draw_nose(d)
    if talk:
        draw_mouth(d, "open_smile", open_v=0.75)
    else:
        draw_mouth(d, mouth, open_v=(0.55 if mouth == "open_o" else 0))
    draw_front_hair(d, img)
    d = ImageDraw.Draw(img)
    for k in extras:
        decal(d, k)
    out = img.resize((W, H), Image.LANCZOS)
    fname = f"{name}{'_talk' if talk else ''}.png"
    out.save(os.path.join(OUT, fname))
    return fname

def main():
    manifest = {"emotions": {}, "talk": {}}
    for name, p in E.items():
        manifest["emotions"][name] = render(name, p, talk=False)
    for name in TALK:
        manifest["talk"][name] = render(name, E[name], talk=True)
    manifest["default"] = "neutral"
    manifest["count"] = len(manifest["emotions"]) + len(manifest["talk"])
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=2)
    print(f"Generados {manifest['count']} sprites anime en sprites/")

if __name__ == "__main__":
    main()
