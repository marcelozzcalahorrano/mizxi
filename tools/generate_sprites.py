#!/usr/bin/env python3
"""
Genera el repositorio de sprites de Mizuki (>20 emociones) como PNG transparentes.
Son sprites de ARRANQUE (dibujados por código) para que la app funcione ya.
Puedes reemplazar cada archivo por tu propio arte manteniendo el mismo nombre.

Uso:  python3 tools/generate_sprites.py
Salida: sprites/*.png  +  sprites/manifest.json
"""
import os, json, math
from PIL import Image, ImageDraw, ImageFilter

S = 3                      # supersampling (anti-alias)
W, H = 512, 700
OUT = os.path.join(os.path.dirname(__file__), "..", "sprites")
os.makedirs(OUT, exist_ok=True)

# --- paleta (igual que la app) ---
SKIN   = (255,224,208,255)
SKIN_S = (244,195,173,255)
LINE   = (229,156,134,255)
HAIR   = (58,42,94,255)
HAIR_LO= (42,29,71,255)
HAIR_HI= (106,79,163,255)
EYEW   = (255,255,255,255)
IRIS   = (58,160,216,255)
IRIS_LO= (31,110,168,255)
PUPIL  = (16,36,58,255)
MOUTH  = (176,64,90,255)
TONGUE = (224,125,144,255)
BLUSH  = (255,143,168,255)
CLOTH  = (90,43,122,255)
CLOTH_HI=(122,63,160,255)
LASH   = (32,18,47,255)
BROW   = (74,53,104,255)
WHITE  = (255,255,255,255)
RED    = (255,90,110,255)

def s(v): return v*S

def new_canvas():
    img = Image.new("RGBA", (W*S, H*S), (0,0,0,0))
    return img, ImageDraw.Draw(img)

def ellipse(d,cx,cy,rx,ry,fill,outline=None,wid=0):
    d.ellipse([s(cx-rx),s(cy-ry),s(cx+rx),s(cy+ry)], fill=fill,
              outline=outline, width=int(s(wid)) if wid else 0)

def poly(d,pts,fill):
    d.polygon([(s(x),s(y)) for x,y in pts], fill=fill)

def line(d,pts,fill,wid):
    d.line([(s(x),s(y)) for x,y in pts], fill=fill, width=int(s(wid)), joint="curve")

def arc_pts(cx,cy,rx,ry,a0,a1,n=24):
    return [(cx+rx*math.cos(a),cy+ry*math.sin(a)) for a in
            [a0+(a1-a0)*i/n for i in range(n+1)]]

CX = 256
FACE_CY = 300
EYE_Y = 300
EYE_DX = 62
MOUTH_Y = 388

def draw_base(d):
    # pelo trasero
    poly(d,[(CX-150,180),(CX-190,360),(CX-165,560),(CX-90,600),
            (CX+90,600),(CX+165,560),(CX+190,360),(CX+150,180),
            (CX+80,90),(CX-80,90)], HAIR_LO)
    # hombros / busto (ropa)
    poly(d,[(CX-205,H),(CX-205,540),(CX-120,470),(CX,455),
            (CX+120,470),(CX+205,540),(CX+205,H)], CLOTH)
    poly(d,[(CX-120,470),(CX,455),(CX+120,470),(CX+70,510),
            (CX-70,510)], CLOTH_HI)
    line(d,[(CX-42,468),(CX,500),(CX+42,468)], (255,255,255,120), 5)
    # cuello
    poly(d,[(CX-32,430),(CX-30,470),(CX+30,470),(CX+32,430)], SKIN_S)
    poly(d,[(CX-32,430),(CX-30,470),(CX+8,470),(CX+8,430)], SKIN)

def draw_face(d):
    # cara
    poly(d,[(CX-118,250),(CX-128,170),(CX-70,110),(CX,105),
            (CX+70,110),(CX+128,170),(CX+118,250),
            (CX+108,340),(CX+55,415),(CX,428),
            (CX-55,415),(CX-108,340)], SKIN)
    # orejas
    ellipse(d,CX-118,300, 16,30, SKIN_S)
    ellipse(d,CX+118,300, 16,30, SKIN_S)

def draw_blush(img,amount):
    if amount<=0.02: return
    layer=Image.new("RGBA",img.size,(0,0,0,0)); ld=ImageDraw.Draw(layer)
    a=int(200*amount)
    for sx in (-70,70):
        ld.ellipse([s(CX+sx-34),s(340-16),s(CX+sx+34),s(340+16)],
                   fill=BLUSH[:3]+(a,))
    layer=layer.filter(ImageFilter.GaussianBlur(s(6)))
    img.alpha_composite(layer)

def draw_eye(d,side,style,openv,look=(0,0)):
    ex=CX+side*EYE_DX; ey=EYE_Y
    lx,ly=look
    if style in ("closed_happy","closed_flat","wink") and (style!="wink" or side<0):
        if style=="closed_flat":
            line(d,[(ex-34,ey),(ex+34,ey)], LASH, 5)
        else:  # ^^ feliz
            line(d, arc_pts(ex,ey+10,34,26,math.pi*1.15,math.pi*1.85,16), LASH,6)
        return
    ew,eh=40, 44*max(0.12,openv)
    # blanco
    ellipse(d,ex,ey,ew/2,eh/2,EYEW)
    ix=ex+lx*10; iy=ey+ly*8+3
    ir=30
    # iris (recortado por el blanco -> aproximado)
    if style=="heart":
        hs=26
        for dx in (-0.5,0.5):
            hx=ix+dx*hs*0.5
            ellipse(d,hx-hs*0.22,iy-hs*0.15,hs*0.28,hs*0.28,RED)
        poly(d,[(ix-hs*0.5,iy-hs*0.05),(ix+hs*0.5,iy-hs*0.05),(ix,iy+hs*0.6)],RED)
    else:
        ellipse(d,ix,iy,ir/2,min(ir,eh*0.9)/2,IRIS)
        ellipse(d,ix,iy+3,ir/2*0.9,min(ir,eh*0.9)/2*0.8,IRIS_LO)
        ellipse(d,ix,iy,ir/2*0.55,min(ir,eh*0.9)/2*0.55,PUPIL)
        ellipse(d,ix-7,iy-8,6,6,WHITE)
        ellipse(d,ix+6,iy+6,3,3,(255,255,255,180))
    # párpado superior
    line(d, arc_pts(ex,ey-eh*0.1,ew*0.55,eh*0.7,math.pi*1.05,math.pi*1.95,16), LASH,7)
    # pestaña externa
    line(d,[(ex+side*ew*0.5,ey-eh*0.2),(ex+side*ew*0.7,ey-eh*0.55)], LASH,4)

def draw_brow(d,side,angle,raise_=0):
    bx=CX+side*EYE_DX; by=EYE_Y-46-raise_
    a=angle*side
    x0,y0=-28, 4+ (angle*10)
    x1,y1= 28, -4-(angle*10)
    def rot(x,y):
        return (bx+x*math.cos(a)-y*math.sin(a), by+x*math.sin(a)+y*math.cos(a))
    p0=rot(x0,y0); pm=rot(0,-6); p1=rot(x1,y1)
    line(d,[p0,pm,p1], BROW, 6)

def draw_mouth(d,shape,openv=0):
    mx,my=CX,MOUTH_Y
    if openv>0.1 and shape not in ("kiss",):
        ow=34*(0.7+openv*0.5); oh=openv*44
        poly(d,[(mx-ow,my),(mx,my-4),(mx+ow,my),(mx,my+oh)], MOUTH)
        ellipse(d,mx,my+oh*0.45,ow*0.55,oh*0.4,TONGUE)
        return
    if shape=="smile_lg":
        line(d, arc_pts(mx,my-6,30,26,0.15*math.pi,0.85*math.pi,16), MOUTH,6)
    elif shape=="smile_sm":
        line(d, arc_pts(mx,my-2,22,12,0.2*math.pi,0.8*math.pi,14), MOUTH,5)
    elif shape=="flat":
        line(d,[(mx-18,my),(mx+18,my)], MOUTH,5)
    elif shape=="frown":
        line(d, arc_pts(mx,my+14,26,18,1.15*math.pi,1.85*math.pi,16), MOUTH,6)
    elif shape=="pout":
        ellipse(d,mx,my+2,14,10,MOUTH)
        ellipse(d,mx,my-1,10,6,TONGUE)
    elif shape=="cat":  # :3
        line(d,[(mx-22,my-4),(mx-8,my+6),(mx,my-2),(mx+8,my+6),(mx+22,my-4)],MOUTH,5)
    elif shape=="wobble":
        line(d,[(mx-22,my),(mx-11,my+8),(mx,my),(mx+11,my+8),(mx+22,my)],MOUTH,5)
    elif shape=="grimace":
        d.rounded_rectangle([s(mx-24),s(my-8),s(mx+24),s(my+10)], radius=s(6), fill=MOUTH)
        for gx in range(-18,19,12):
            line(d,[(mx+gx,my-8),(mx+gx,my+10)], WHITE,3)
    elif shape=="tongue":  # :P
        line(d, arc_pts(mx,my-6,26,20,0.15*math.pi,0.85*math.pi,16), MOUTH,6)
        ellipse(d,mx+10,my+12,10,14,TONGUE)
    else:
        line(d,[(mx-16,my),(mx+16,my)], MOUTH,5)

def draw_bangs(d):
    # flequillo (encima)
    poly(d,[(CX-126,255),(CX-140,140),(CX-60,95),(CX,90),(CX+60,95),
            (CX+140,140),(CX+126,255),
            (CX+95,150),(CX+70,235),(CX+40,150),(CX,240),
            (CX-40,150),(CX-70,235),(CX-95,150)], HAIR)
    # mechones laterales
    poly(d,[(CX-126,255),(CX-158,360),(CX-150,470),(CX-120,300)], HAIR)
    poly(d,[(CX+126,255),(CX+158,360),(CX+150,470),(CX+120,300)], HAIR)
    # brillo
    line(d, arc_pts(CX,150,70,30,1.1*math.pi,1.9*math.pi,16), HAIR_HI[:3]+(150,), 5)

# --- decals / extras ---
def decal(d,kind):
    if kind=="vein":
        vx,vy=CX+70,190
        for a in (0,2.1,4.2):
            line(d,[(vx,vy),(vx+16*math.cos(a),vy+16*math.sin(a))],(220,60,80,255),4)
            line(d,[(vx,vy),(vx+16*math.cos(a+0.6),vy+16*math.sin(a+0.6))],(220,60,80,255),4)
    elif kind=="sweat":
        poly(d,[(CX+96,215),(CX+108,235),(CX+84,235)],(150,210,255,230))
        ellipse(d,CX+96,232,12,14,(150,210,255,230))
    elif kind=="tears":
        for sx in (-EYE_DX,EYE_DX):
            poly(d,[(CX+sx-8,EYE_Y+18),(CX+sx+8,EYE_Y+18),(CX+sx,EYE_Y+70)],(150,210,255,220))
    elif kind=="hearts":
        for hx,hy,hs in [(CX-150,180,20),(CX+150,150,26),(CX+120,90,16)]:
            for dx in (-0.5,0.5):
                ellipse(d,hx+dx*hs*0.5,hy-hs*0.1,hs*0.3,hs*0.3,RED)
            poly(d,[(hx-hs*0.55,hy),(hx+hs*0.55,hy),(hx,hy+hs*0.7)],RED)
    elif kind=="sparkle":
        for sx,sy,ss in [(CX-160,180,14),(CX+160,150,18),(CX+140,90,10),(CX-120,110,8)]:
            line(d,[(sx-ss,sy),(sx+ss,sy)],(255,255,180,230),3)
            line(d,[(sx,sy-ss),(sx,sy+ss)],(255,255,180,230),3)
    elif kind=="zzz":
        for i,(zx,zy,zs) in enumerate([(CX+150,140,16),(CX+178,110,22),(CX+210,75,28)]):
            line(d,[(zx-zs/2,zy-zs/2),(zx+zs/2,zy-zs/2),(zx-zs/2,zy+zs/2),
                    (zx+zs/2,zy+zs/2)],(180,200,255,230),3)
    elif kind=="shadow":  # sombra de aburrida arriba de los ojos
        poly(d,[(CX-118,250),(CX-128,215),(CX+128,215),(CX+118,250)],(60,50,90,90))
    elif kind=="notes":
        for nx,ny in [(CX-155,160),(CX+150,120),(CX+185,175)]:
            ellipse(d,nx,ny,8,6,(120,90,200,255))
            line(d,[(nx+7,ny),(nx+7,ny-26)],(120,90,200,255),3)
    elif kind=="question":
        qx,qy=CX+150,120
        line(d, arc_pts(qx,qy,14,14,1.2*math.pi,0.3*math.pi,16),(255,255,255,230),4)
        line(d,[(qx+2,qy+8),(qx+2,qy+18)],(255,255,255,230),4)
        ellipse(d,qx+2,qy+26,3,3,(255,255,255,230))

# ---- tabla de emociones ----
# eye_style, open, brow_angle, brow_raise, mouth_shape, blush, look, extras
E = {
 "neutral":   ("normal",1.0, 0.0, 0,"smile_sm",0.15,(0,0),[]),
 "happy":     ("normal",0.85,0.15,4,"smile_lg",0.35,(0,-0.1),["sparkle"]),
 "smile":     ("normal",1.0, 0.1, 2,"smile_sm",0.25,(0,0),[]),
 "shy":       ("normal",0.9, 0.25,6,"smile_sm",0.95,(0.3,0.2),["sweat"]),
 "blush":     ("normal",0.95,0.2, 4,"flat",    1.0,(0,0.1),[]),
 "angry":     ("normal",1.05,-0.7,0,"grimace", 0.45,(0,0),["vein"]),
 "pout":      ("normal",0.8,-0.25,0,"pout",    0.55,(0.2,0.1),[]),
 "annoyed":   ("half",  0.55,-0.4,0,"flat",    0.25,(-0.3,0),["sweat"]),
 "sad":       ("normal",0.8, 0.5, 8,"frown",   0.1,(0,0.3),[]),
 "cry":       ("normal",0.7, 0.6,10,"wobble",  0.2,(0,0.2),["tears"]),
 "love":      ("heart", 1.0, 0.15,4,"smile_lg",0.7,(0,0),["hearts"]),
 "wink":      ("wink",  1.0, 0.1, 4,"smile_lg",0.4,(0,0),[]),
 "smug":      ("half",  0.65,-0.15,0,"cat",    0.3,(-0.2,0),[]),
 "teasing":   ("wink",  1.0, 0.05,2,"tongue",  0.35,(0,0),[]),
 "surprised": ("wide",  1.15,0.2, 8,"open_o",  0.25,(0,0),["sweat"]),
 "sleepy":    ("half",  0.32,0.1, 0,"smile_sm",0.15,(0,0.2),["zzz"]),
 "bored":     ("half",  0.5,-0.05,0,"flat",    0.1,(-0.3,0),["shadow"]),
 "excited":   ("wide",  1.1, 0.2, 6,"smile_lg",0.45,(0,-0.1),["sparkle"]),
 "jealous":   ("half",  0.6,-0.5, 0,"frown",   0.35,(-0.5,0),["vein"]),
 "worried":   ("normal",0.85,0.6, 8,"wobble",  0.25,(0,0.1),["sweat"]),
 "laugh":     ("closed_happy",1,0.1,4,"smile_lg",0.35,(0,0),[]),
 "sulk":      ("half",  0.55,-0.2,0,"pout",    0.3,(-0.5,0.1),["shadow"]),
 "curious":   ("wide",  1.05,0.1,10,"smile_sm",0.2,(0.3,-0.1),["question"]),
 "sing":      ("closed_happy",1,0.1,4,"open_o", 0.3,(0,0),["notes"]),
}
# variantes con boca abierta para lip-sync
TALK = ["neutral","happy","angry","shy","smug","teasing","sad","excited"]

def render(name, params, talk=False):
    eye_style,openv,brow_a,brow_r,mouth,blush,look,extras = params
    img,d = new_canvas()
    draw_base(d)
    draw_face(d)
    draw_blush(img,blush)
    d = ImageDraw.Draw(img)
    # ojos
    if eye_style=="wink":
        draw_eye(d,-1,"wink",openv,look)          # izq cerrado
        draw_eye(d, 1,"normal",openv,look)
    else:
        draw_eye(d,-1,eye_style,openv,look)
        draw_eye(d, 1,eye_style,openv,look)
    # cejas
    draw_brow(d,-1,brow_a,brow_r)
    draw_brow(d, 1,brow_a,brow_r)
    # nariz
    line(d,[(CX+2,350),(CX-4,366)], LINE,3)
    # boca
    if talk:
        draw_mouth(d,"open_smile",openv=0.7)
    else:
        draw_mouth(d,mouth,openv=(0.6 if mouth=="open_o" else 0))
    # flequillo
    draw_bangs(d)
    # decals
    for k in extras: decal(d,k)
    # downscale
    out = img.resize((W,H), Image.LANCZOS)
    fname = f"{name}{'_talk' if talk else ''}.png"
    out.save(os.path.join(OUT,fname))
    return fname

def main():
    manifest={"emotions":{}, "talk":{}}
    for name,p in E.items():
        f=render(name,p,talk=False)
        manifest["emotions"][name]=f
    for name in TALK:
        f=render(name,E[name],talk=True)
        manifest["talk"][name]=f
    manifest["default"]="neutral"
    manifest["count"]=len(manifest["emotions"])+len(manifest["talk"])
    with open(os.path.join(OUT,"manifest.json"),"w",encoding="utf-8") as fh:
        json.dump(manifest,fh,ensure_ascii=False,indent=2)
    print(f"Generados {manifest['count']} sprites en sprites/  ({len(E)} emociones + {len(TALK)} talk)")

if __name__=="__main__":
    main()
