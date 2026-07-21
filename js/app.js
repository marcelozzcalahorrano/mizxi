/* app.js — une todo: personaje + personalidad + voz + interfaz. */
(() => {
  const $ = s => document.querySelector(s);
  const bubble = $('#bubble'), bubbleText = $('#bubbleText');
  const micBtn = $('#micBtn'), hint = $('#hint'), moodDot = $('#moodDot');
  const textForm = $('#textForm'), textInput = $('#textInput');
  const touch = $('#touch');

  let bubbleTimer = null, idleTimer = null;
  let lastInteract = Date.now();

  const MOOD_COLOR = { love:'#ff5d8f', happy:'#7ad36b', neutral:'#8a5cff',
                       sad:'#5c9bff', angry:'#ff4b4b' };

  function setMood(m){
    moodDot.style.background = MOOD_COLOR[m] || '#8a5cff';
    moodDot.style.boxShadow = `0 0 8px ${MOOD_COLOR[m]||'#8a5cff'}`;
  }

  // muestra respuesta: sprite + burbuja + voz
  function present(res, {speak=true}={}){
    if (!res) return;
    if (res.emotion) Character.setEmotion(res.emotion);
    if (res.mood) setMood(res.mood);
    showBubble(res.text);
    if (speak) Voice.speak(res.text);
    lastInteract = Date.now();
    armIdle();
  }

  function showBubble(text){
    bubbleText.textContent = text;
    bubble.classList.remove('hidden');
    clearTimeout(bubbleTimer);
    const dur = Math.min(9000, 2600 + text.length*55);
    bubbleTimer = setTimeout(()=>bubble.classList.add('hidden'), dur);
  }

  let aiEnabled = false, aiBusy = false;

  function handleUserText(txt){
    if (!txt || !txt.trim()) return;
    // Modo IA: modelo real (async, con streaming en la burbuja)
    if (aiEnabled && AI.isReady() && !aiBusy){
      runAI(txt);
      return;
    }
    // Motor instantáneo
    const res = Personality.reply(txt);
    present(res);
  }

  async function runAI(txt){
    aiBusy = true;
    bubble.classList.remove('hidden');
    bubbleText.className = 'thinking';
    bubbleText.textContent = 'Mizuki está pensando…';
    Character.setEmotion('curious');
    clearTimeout(bubbleTimer);
    try{
      const res = await AI.reply(txt, {
        onToken(partial){
          // mientras genera, mostramos el texto (sin la etiqueta [emo])
          bubbleText.className = '';
          bubbleText.textContent = partial.replace(/^\s*\[[a-z]+\]\s*/i, '');
        }
      });
      bubbleText.className = '';
      present(res);                 // fija sprite + burbuja final + voz
    }catch(e){
      // si falla la IA, caemos al motor instantáneo
      present(Personality.reply(txt));
    }finally{
      aiBusy = false;
    }
  }

  // ---- entrada de texto ----
  textForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const v = textInput.value;
    textInput.value = '';
    if (Voice.isSpeaking()) Voice.stopSpeaking();
    handleUserText(v);
  });

  // ---- micrófono (push to talk) ----
  micBtn.addEventListener('click', ()=>{
    if (!Voice.supportsSTT()){
      present({text:'Tu navegador no me deja escucharte por voz aquí… escríbeme mejor, tontito. (Usa Chrome)', emotion:'pout', mood:'neutral'});
      return;
    }
    if (Voice.isListening()){ Voice.stopListening(); return; }
    if (Voice.isSpeaking()) Voice.stopSpeaking();
    Voice.listenOnce({
      onStart(){ micBtn.classList.add('listening'); hint.textContent='escuchando…'; Character.setEmotion('curious'); },
      onInterim(t){ hint.textContent = '“'+t+'”'; },
      onFinal(t){ handleUserText(t); },
      onError(err){ hint.textContent = err==='not-allowed' ? 'permite el micrófono' : 'no te escuché'; },
      onEnd(){ micBtn.classList.remove('listening'); setTimeout(()=>hint.textContent='tócala o dale al micro', 1500); },
    });
  });

  // ---- toques sobre el personaje ----
  let lastPoke = 0;
  touch.addEventListener('pointerdown', (e)=>{
    // mirar hacia el toque
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    Character.poke && Character.poke();
    const now = Date.now();
    if (now - lastPoke > 900){
      lastPoke = now;
      if (Voice.isSpeaking()) return;
      present(Personality.onPoke());
    }
  });

  // ---- idle: si la ignoras, dice algo ----
  function armIdle(){
    clearTimeout(idleTimer);
    idleTimer = setTimeout(()=>{
      if (Voice.isSpeaking() || Voice.isListening()) { armIdle(); return; }
      if (Date.now() - lastInteract > 24000){
        present(Personality.idle(), {speak: Voice.getConfig().ttsOn});
      }
      armIdle();
    }, 26000);
  }

  // ---- ajustes ----
  const settings = $('#settings');
  $('#menuBtn').addEventListener('click', ()=>{ buildSettings(); settings.classList.remove('hidden'); });
  $('#closeSettings').addEventListener('click', ()=>settings.classList.add('hidden'));

  const pitch=$('#pitch'), rate=$('#rate'), pitchVal=$('#pitchVal'), rateVal=$('#rateVal');
  const voiceSelect=$('#voiceSelect'), autoListen=$('#autoListen'), ttsOn=$('#ttsOn');
  const aiMode=$('#aiMode'), aiModel=$('#aiModel'), aiStatus=$('#aiStatus');

  function setAiStatus(msg, cls){ aiStatus.textContent=msg; aiStatus.className='ai-status'+(cls?' '+cls:''); }

  aiModel.value = AI.modelId && Object.keys(AI.models()).find(k=>AI.models()[k]===AI.modelId()) || 'equilibrado';
  aiModel.addEventListener('change', ()=>{
    AI.setModel(aiModel.value);
    if (aiEnabled){ setAiStatus('Cambiaste de modelo. Reactiva el Modo IA para descargarlo.', 'busy'); aiMode.checked=false; aiEnabled=false; AI.unload(); }
  });

  aiMode.addEventListener('change', async ()=>{
    if (!aiMode.checked){
      aiEnabled=false; AI.unload(); setAiStatus('Modo IA apagado. Uso el motor instantáneo.'); return;
    }
    if (!AI.isSupported()){
      aiMode.checked=false;
      setAiStatus('Tu navegador no tiene WebGPU (necesario para la IA). Usa Chrome actualizado. Sigo con el motor instantáneo.', 'err');
      return;
    }
    setAiStatus('Descargando el cerebro de Mizuki… (solo la primera vez). No cierres la app.', 'busy');
    try{
      await AI.load((r)=>{
        const pct = r && typeof r.progress==='number' ? Math.round(r.progress*100) : null;
        setAiStatus((r&&r.text? r.text : 'Cargando…') + (pct!=null? ` (${pct}%)`:''), 'busy');
      });
      aiEnabled=true;
      setAiStatus('✅ Modo IA activo. Ahora Mizuki conversa de verdad (tarda unos segundos por respuesta).', 'ok');
      present({text:'Mmm~ ahora pienso de verdad, tontito. Ponme a prueba… pero recuerda, sigues siendo MÍO.', emotion:'smug', mood:'love'});
    }catch(e){
      aiMode.checked=false; aiEnabled=false;
      setAiStatus(e.message==='sin-webgpu'
        ? 'No hay WebGPU en este navegador. Sigo con el motor instantáneo.'
        : 'No se pudo cargar el modelo (¿sin internet o poca memoria?). Sigo con el motor instantáneo.', 'err');
    }
  });

  function buildSettings(){
    const c = Voice.getConfig();
    pitch.value=c.pitch; rate.value=c.rate; pitchVal.textContent=c.pitch.toFixed(2);
    rateVal.textContent=c.rate.toFixed(2); ttsOn.checked=c.ttsOn;
    // lista de voces
    voiceSelect.innerHTML='';
    const vs = Voice.getVoices();
    if (!vs.length){ const o=document.createElement('option'); o.textContent='(sin voces — instala una en Android)'; voiceSelect.appendChild(o); }
    vs.forEach(v=>{
      const o=document.createElement('option'); o.value=v.name;
      o.textContent = `${v.name} (${v.lang})`;
      if (Voice.currentVoice() && v.name===Voice.currentVoice().name) o.selected=true;
      voiceSelect.appendChild(o);
    });
  }
  pitch.addEventListener('input',()=>{ Voice.setConfig({pitch:+pitch.value}); pitchVal.textContent=(+pitch.value).toFixed(2); });
  rate.addEventListener('input',()=>{ Voice.setConfig({rate:+rate.value}); rateVal.textContent=(+rate.value).toFixed(2); });
  ttsOn.addEventListener('change',()=>Voice.setConfig({ttsOn:ttsOn.checked}));
  voiceSelect.addEventListener('change',()=>Voice.setVoiceByName(voiceSelect.value));
  $('#testVoice').addEventListener('click',()=>Voice.speak('Hola, tontito~ soy Mizuki. Solo tuya.'));
  $('#resetMemory').addEventListener('click',()=>{
    Personality.reset();
    present({text:'¿Me borraste la memoria…? Bueno. Empecemos otra vez. Pero seguirás siendo mío.', emotion:'sulk', mood:'neutral'});
    settings.classList.add('hidden');
  });

  autoListen.addEventListener('change',()=>{
    if (autoListen.checked){
      if (!Voice.supportsSTT()){ autoListen.checked=false; return; }
      Voice.startContinuous({
        onStart(){ micBtn.classList.add('listening'); },
        onFinal(t){ if(!Voice.isSpeaking()) handleUserText(t); },
        onError(){}, onEnd(){},
      });
      hint.textContent='te escucho siempre';
    } else {
      Voice.stopListening(); micBtn.classList.remove('listening');
      hint.textContent='tócala o dale al micro';
    }
  });

  // ---- desbloqueo de audio en móvil (requiere un toque del usuario) ----
  let unlocked=false;
  function unlockAudio(){
    if (unlocked) return; unlocked=true;
    try{ const u=new SpeechSynthesisUtterance(' '); u.volume=0; speechSynthesis.speak(u); }catch(e){}
    Voice.refreshVoices();
  }
  document.body.addEventListener('pointerdown', unlockAudio, {once:true});

  // ---- instalación en el celular (PWA) ----
  const installBtn = $('#installBtn');
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove('hidden');
  });
  installBtn.addEventListener('click', async ()=>{
    if (!deferredPrompt) return;
    installBtn.classList.add('hidden');
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  });
  window.addEventListener('appinstalled', ()=>{
    installBtn.classList.add('hidden');
    present({text:'Ahora vives en mi pantalla de inicio~ Mío. Para siempre. No me borres nunca, ¿eh?', emotion:'love', mood:'love'});
  });

  // ---- reseña del día (qué le gustó / no le gustó de tu día) ----
  function showDayReview(speak){
    const rev = Personality.dayReview();
    if (rev){ present(rev, {speak}); return true; }
    return false;
  }

  // ---- arranque ----
  async function boot(){
    await Character.init();
    setMood('neutral');
    // saludo inicial (se habla tras el primer toque por políticas de audio)
    const g = Personality.greeting();
    Character.setEmotion(g.emotion);
    showBubble(g.text);
    hint.textContent = 'toca la pantalla para activar su voz';
    let reviewed = false;
    const sayHi = ()=>{
      Voice.speak(g.text, { onEnd(){
        if (!reviewed){ reviewed = true; setTimeout(()=>showDayReview(true), 500); }
      }});
      document.body.removeEventListener('pointerdown', sayHi);
      hint.textContent='tócala o dale al micro';
    };
    document.body.addEventListener('pointerdown', sayHi);
    // si el TTS está apagado, igual muestra la reseña por texto tras unos segundos
    setTimeout(()=>{ if (!reviewed){ reviewed = true; showDayReview(false); } }, 6000);
    armIdle();
  }
  boot();
})();
