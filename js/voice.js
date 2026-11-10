/* voice.js — Voz de Mizuki.
   TTS: usa la voz del sistema (offline una vez instaladas las voces),
        con tono agudo/ritmo ajustable para sonar dulce y "anime".
        Genera el lip-sync mientras habla.
   STT: reconocimiento de voz para que te escuche (no solo texto).

   Nota honesta: el TTS del navegador funciona offline con las voces que
   tengas instaladas en Android (Ajustes > Idiomas > Salida de texto a voz >
   descarga la voz en español para que NO necesite internet).
   El reconocimiento de voz de Chrome puede usar servidores de Google; para
   dictado 100% offline se puede integrar Vosk (ver README). */

const Voice = (() => {
  const synth = window.speechSynthesis;
  let voices = [];
  let selected = null;
  let cfg = { pitch: 1.35, rate: 1.0, volume: 1, ttsOn: true, lang: 'es',
              natural: false };
  try{ Object.assign(cfg, JSON.parse(localStorage.getItem('mizuki_voicecfg')||'{}')); }catch(e){}
  function persistCfg(){ try{ localStorage.setItem('mizuki_voicecfg', JSON.stringify(cfg)); }catch(e){} }

  // ---- selección de voz ----
  function refreshVoices(){
    voices = synth ? synth.getVoices() : [];
    const es = voices.filter(v=>/es(-|_|$)/i.test(v.lang));
    // preferimos voces "network" (de Google, más naturales) y nombres femeninos
    const fem = /female|mujer|monica|mónica|paulina|helena|sabina|laura|lucia|lucía|marisol|elvira|conchita|penelope|penélope|eed|sfb/i;
    const net = es.filter(v=>/network|online|natural|neural/i.test(v.name));
    selected = net.find(v=>fem.test(v.name)) || net[0]
            || es.find(v=>fem.test(v.name)) || es[0] || voices[0] || null;
    const saved = localStorage.getItem('mizuki_voice');
    if (saved){ const s = voices.find(v=>v.name===saved); if (s) selected = s; }
    return voices;
  }
  if (synth){ refreshVoices(); synth.onvoiceschanged = refreshVoices; }

  function setVoiceByName(name){
    const v = voices.find(x=>x.name===name);
    if (v){ selected = v; localStorage.setItem('mizuki_voice', name); }
  }
  function setConfig(c){ Object.assign(cfg, c); persistCfg(); }
  function getConfig(){ return {...cfg}; }
  function getVoices(){ return voices; }
  function currentVoice(){ return selected; }

  // limpia el texto para hablar: quita acotaciones *asi*, tildes de énfasis, emojis
  function speakable(text){
    return text
      .replace(/\*[^*]*\*/g,' ')      // *acciones*
      .replace(/~+/g,' ')
      .replace(/[¡!]{2,}/g,'!')
      .replace(/\s+/g,' ')
      .trim();
  }

  // ---- lip-sync mientras habla (SpeechSynthesis no da amplitud real) ----
  let lipRAF = null;
  function startLip(){
    stopLip();
    Character.setTalking(true);
    let phase = 0;
    const step = () => {
      phase += 0.35;
      // energía pseudo-aleatoria: da sensación de sílabas
      const e = 0.35 + 0.4*Math.abs(Math.sin(phase)) + Math.random()*0.2;
      Character.setMouth(e);
      lipRAF = requestAnimationFrame(step);
    };
    lipRAF = requestAnimationFrame(step);
  }
  function stopLip(){
    if (lipRAF) cancelAnimationFrame(lipRAF); lipRAF = null;
    Character.setMouth(0); Character.setTalking(false);
  }

  // ---- reproducción de voz NATURAL (WAV) con lip-sync REAL vía Web Audio ----
  let audioCtx = null, curAudio = null;
  function getCtx(){
    if (!audioCtx){ try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    if (audioCtx && audioCtx.state === 'suspended'){ audioCtx.resume().catch(()=>{}); }
    return audioCtx;
  }
  async function speakNaturalBlob(blob, opts){
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'auto';
    curAudio = audio;
    const ctx = getCtx();
    let analyser = null, data = null, src = null;
    if (ctx){
      try{
        src = ctx.createMediaElementSource(audio);
        analyser = ctx.createAnalyser(); analyser.fftSize = 512;
        data = new Uint8Array(analyser.fftSize);
        src.connect(analyser); analyser.connect(ctx.destination);
      }catch(e){ analyser = null; }
    }
    Character.setTalking(true);
    const step = () => {
      if (analyser){
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i=0;i<data.length;i++){ const v=(data[i]-128)/128; sum += v*v; }
        const rms = Math.sqrt(sum/data.length);         // energía real del audio
        Character.setMouth(Math.min(1, rms*3.2));
      } else {
        Character.setMouth(0.4 + Math.random()*0.4);     // respaldo
      }
      lipRAF = requestAnimationFrame(step);
    };
    return new Promise((resolve)=>{
      audio.onplay = () => { speaking = true; opts.onStart && opts.onStart(); lipRAF = requestAnimationFrame(step); };
      const done = () => { speaking = false; stopLip(); URL.revokeObjectURL(url); curAudio = null; opts.onEnd && opts.onEnd(); resolve(); };
      audio.onended = done; audio.onerror = done;
      audio.play().catch(done);
    });
  }

  // ---- hablar ----
  let speaking = false;
  function speak(text, opts={}){
    const say = speakable(text);
    if (!cfg.ttsOn || !say){
      startLip(); setTimeout(stopLip, Math.min(2500, 400+say.length*45));
      opts.onEnd && opts.onEnd();
      return;
    }
    // 1) Voz natural (neuronal) si está activa y lista
    if (cfg.natural && typeof NaturalTTS !== 'undefined' && NaturalTTS.isReady()){
      try{ synth && synth.cancel(); }catch(e){}
      NaturalTTS.synth(say)
        .then(blob => speakNaturalBlob(blob, opts))
        .catch(() => speakSystem(say, opts));   // si falla, TTS del sistema
      return;
    }
    // 2) TTS del sistema
    speakSystem(say, opts);
  }

  function speakSystem(say, opts){
    if (!synth){ opts.onEnd && opts.onEnd(); return; }
    try{ synth.cancel(); }catch(e){}
    const u = new SpeechSynthesisUtterance(say);
    if (selected) u.voice = selected;
    u.lang = (selected && selected.lang) || 'es-ES';
    u.pitch = cfg.pitch; u.rate = cfg.rate; u.volume = cfg.volume;
    u.onstart = () => { speaking = true; startLip(); opts.onStart && opts.onStart(); };
    u.onboundary = () => { Character.setMouth(0.55 + Math.random()*0.45); };
    u.onend = () => { speaking = false; stopLip(); opts.onEnd && opts.onEnd(); };
    u.onerror = () => { speaking = false; stopLip(); opts.onEnd && opts.onEnd(); };
    synth.speak(u);
  }
  function stopSpeaking(){
    try{ synth && synth.cancel(); }catch(e){}
    try{ if (curAudio){ curAudio.pause(); curAudio.currentTime = 0; curAudio = null; } }catch(e){}
    stopLip(); speaking=false;
  }

  // ---- escuchar (STT) ----
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, wantContinuous = false;
  let handlers = {};

  function supportsSTT(){ return !!SR; }

  function buildRec(){
    if (!SR) return null;
    const r = new SR();
    r.lang = 'es-ES';
    r.interimResults = true;
    r.continuous = wantContinuous;
    r.maxAlternatives = 1;
    r.onresult = (ev)=>{
      let interim='', final='';
      for (let i=ev.resultIndex;i<ev.results.length;i++){
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) final += t; else interim += t;
      }
      if (interim && handlers.onInterim) handlers.onInterim(interim);
      if (final && handlers.onFinal) handlers.onFinal(final.trim());
    };
    r.onerror = (e)=>{ handlers.onError && handlers.onError(e.error); };
    r.onend = ()=>{
      listening = false;
      handlers.onEnd && handlers.onEnd();
      if (wantContinuous){ try{ r.start(); listening=true; }catch(e){} }
    };
    return r;
  }

  function listenOnce(h={}){
    if (!SR){ h.onError && h.onError('no-stt'); return; }
    handlers = h; wantContinuous = false;
    if (speaking) stopSpeaking();
    rec = buildRec();
    try{ rec.start(); listening = true; h.onStart && h.onStart(); }
    catch(e){ /* ya activo */ }
  }
  function startContinuous(h={}){
    if (!SR){ h.onError && h.onError('no-stt'); return; }
    handlers = h; wantContinuous = true;
    rec = buildRec();
    try{ rec.start(); listening = true; h.onStart && h.onStart(); }catch(e){}
  }
  function stopListening(){
    wantContinuous = false;
    if (rec){ try{ rec.stop(); }catch(e){} }
    listening = false;
  }
  function isListening(){ return listening; }
  function isSpeaking(){ return speaking; }

  return {
    speak, stopSpeaking, isSpeaking,
    listenOnce, startContinuous, stopListening, isListening, supportsSTT,
    refreshVoices, setVoiceByName, getVoices, currentVoice, setConfig, getConfig,
  };
})();
