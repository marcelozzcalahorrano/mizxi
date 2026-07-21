/* character.js — Personaje por SPRITES PNG.
   Carga un repositorio de imágenes (sprites/manifest.json), cambia de sprite
   según la emoción con transición suave (crossfade), hace un lip-sync ligero
   alternando con la variante "_talk" (boca abierta) y añade micro-movimiento
   idle (respirar/balancearse) sin trabar el teléfono.

   Para usar TU propio arte: reemplaza los PNG en /sprites manteniendo los
   mismos nombres del manifest.json (o edita el manifest). */

const Character = (() => {
  const stage = document.getElementById('stage');
  // Reemplazamos el canvas por dos <img> apiladas para crossfade.
  const wrap = document.createElement('div');
  wrap.className = 'char-wrap';
  const imgA = document.createElement('img');
  const imgB = document.createElement('img');
  imgA.className = 'char-img'; imgB.className = 'char-img';
  imgA.alt = ''; imgB.alt = ''; imgA.decoding = 'async'; imgB.decoding='async';
  wrap.appendChild(imgA); wrap.appendChild(imgB);
  stage.replaceWith(wrap);

  let manifest = null;
  const cache = {};          // src -> HTMLImageElement precargada
  let base = 'sprites/';
  let curEmotion = 'neutral';
  let frontIsA = true;       // cuál <img> está visible
  let talking = false;
  let mouthOpen = false;
  let talkTimer = 0;
  let mouth = 0;             // 0..1 nivel de voz (para ritmo del lip-sync)

  // idle motion
  let t = 0;

  function preload(src){
    if (cache[src]) return cache[src];
    const im = new Image();
    im.src = src;
    cache[src] = im;
    return im;
  }

  function front(){ return frontIsA ? imgA : imgB; }
  function backImg(){ return frontIsA ? imgB : imgA; }

  function srcFor(emotion, talk){
    if (!manifest) return null;
    if (talk && manifest.talk && manifest.talk[emotion])
      return base + manifest.talk[emotion];
    if (manifest.emotions[emotion]) return base + manifest.emotions[emotion];
    return base + manifest.emotions[manifest.default || 'neutral'];
  }

  // Cambia el sprite mostrado con crossfade
  function show(src, fade=true){
    if (!src) return;
    const cur = front();
    if (cur.src && cur.src.endsWith(src.replace(base,''))) return; // ya está
    const nxt = backImg();
    preload(src);
    nxt.src = src;
    if (fade){
      nxt.style.opacity = '0';
      requestAnimationFrame(()=>{ nxt.style.opacity='1'; cur.style.opacity='0'; });
    } else {
      nxt.style.opacity='1'; cur.style.opacity='0';
    }
    frontIsA = !frontIsA;
  }

  function setEmotion(e, fade=true){
    if (!manifest) { curEmotion = e; return; }
    if (!manifest.emotions[e]) e = manifest.default || 'neutral';
    curEmotion = e;
    if (talking) return;               // el loop de habla maneja el sprite
    show(srcFor(e, false), fade);
  }

  function hasTalk(e){ return manifest && manifest.talk && manifest.talk[e]; }

  // Lip-sync: alterna boca abierta/cerrada según el nivel de voz
  function tickTalk(dt){
    if (!talking) return;
    talkTimer -= dt;
    const rate = 0.09 + (1-mouth)*0.06;   // más rápido si habla fuerte
    if (talkTimer <= 0){
      talkTimer = rate;
      // abrir si hay energía de voz; si hay _talk, alternamos sprite
      const wantOpen = mouth > 0.12 ? (Math.random() < 0.75) : false;
      if (wantOpen !== mouthOpen){
        mouthOpen = wantOpen;
        if (hasTalk(curEmotion)){
          show(srcFor(curEmotion, mouthOpen), true);
        }
      }
    }
  }

  // micro-animación idle sin recalcular imágenes (solo transform CSS)
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.05,(now-last)/1000); last = now;
    t += dt;
    const bob = Math.sin(t*1.6)*0.6;               // respirar
    const sway = Math.sin(t*0.7)*1.2;              // balanceo
    const tilt = Math.sin(t*0.5)*0.6;
    const talkPulse = talking ? (1 + mouth*0.012) : 1;
    wrap.style.transform =
      `translate(${sway}px, ${bob}px) rotate(${tilt*0.3}deg) scale(${talkPulse})`;
    tickTalk(dt);
    requestAnimationFrame(loop);
  }

  async function init(){
    try{
      const res = await fetch(base + 'manifest.json', {cache:'force-cache'});
      manifest = await res.json();
    }catch(e){
      console.warn('No se pudo cargar el manifest de sprites', e);
      manifest = {emotions:{neutral:'neutral.png'}, talk:{}, default:'neutral'};
    }
    // precarga todo el repositorio (son livianos)
    Object.values(manifest.emotions).forEach(f=>preload(base+f));
    if (manifest.talk) Object.values(manifest.talk).forEach(f=>preload(base+f));
    imgA.src = srcFor(manifest.default||'neutral', false);
    imgA.style.opacity='1';
    requestAnimationFrame(loop);
  }

  return {
    init,
    setEmotion,
    getEmotion(){ return curEmotion; },
    listEmotions(){ return manifest ? Object.keys(manifest.emotions) : []; },
    setMouth(v){ mouth = Math.max(0, Math.min(1, v||0)); },
    setTalking(v){
      talking = v;
      if (!v){
        mouthOpen = false; mouth = 0;
        show(srcFor(curEmotion, false), true);   // cierra la boca
      }
    },
    poke(){ // pequeña reacción al tocar
      wrap.animate(
        [{transform:'scale(1)'},{transform:'scale(1.05)'},{transform:'scale(1)'}],
        {duration:280, easing:'ease-out'});
    },
  };
})();
