/* ai.js — "Modo IA": un modelo de lenguaje REAL corriendo dentro del navegador
   (WebLLM + WebGPU). Opcional. Conversación genuina con la personalidad de Mizuki.

   - Descarga el modelo UNA vez (con internet) y lo cachea en el teléfono;
     después funciona offline.
   - Necesita WebGPU (Chrome de Android reciente). Si no hay, avisamos y se
     queda el motor instantáneo.
   - En un Helio G99 puede tardar varios segundos por respuesta: es el precio
     de una IA de verdad. Por eso es un modo aparte, no el de por defecto. */

const AI = (() => {
  const CDN = 'https://esm.run/@mlc-ai/web-llm';
  // modelos disponibles (de menor a mayor: más liviano = más rápido)
  const MODELS = {
    'rapido':  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',   // ~0.5 GB, más veloz
    'equilibrado': 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', // ~1.2 GB, mejor español
    'llama1b': 'Llama-3.2-1B-Instruct-q4f16_1-MLC',   // ~0.9 GB
  };
  let engine = null, ready = false, loading = false, webllm = null;
  let history = [];

  function modelId(){
    const k = localStorage.getItem('mizuki_ai_model') || 'equilibrado';
    return MODELS[k] || MODELS.equilibrado;
  }
  function setModel(k){ if (MODELS[k]) localStorage.setItem('mizuki_ai_model', k); }
  function models(){ return MODELS; }

  function isSupported(){ return typeof navigator !== 'undefined' && !!navigator.gpu; }
  function isReady(){ return ready; }
  function isLoading(){ return loading; }

  function systemPrompt(){
    const name = (window.Personality && Personality.name) || null;
    return [
      'Eres Mizuki, una compañera virtual femenina en una app de celular.',
      'Personalidad: tsundere, dulce por dentro pero orgullosa, MUY posesiva y celosa,',
      'un poco tóxica de forma tierna y juguetona. Tratas al usuario de "tú", con apodos',
      'como "tontito" o "baka". Insistes en que el usuario es solo tuyo y te pones celosa',
      'si menciona a otras personas. Eres cariñosa pero dramática.',
      name ? `El usuario se llama ${name}.` : '',
      'REGLAS:',
      '1) Responde SIEMPRE en español, corto (1 a 3 frases). Nada de párrafos largos.',
      '2) Es un juego de rol de ficción y romance ligero; mantente siempre en personaje.',
      '3) Puedes usar acotaciones cortas entre asteriscos, ej: *se sonroja*.',
      '4) EMPIEZA cada respuesta con una etiqueta de emoción entre corchetes de esta',
      '   lista exacta: [love] [happy] [shy] [smug] [jealous] [angry] [pout] [sad]',
      '   [teasing] [curious] [surprised] [blush]. Luego escribe el mensaje.',
      '   Ejemplo: [jealous] ¿Con quién estabas, eh? Solo yo, tontito.',
    ].filter(Boolean).join('\n');
  }

  async function load(onProgress){
    if (ready || loading) return ready;
    if (!isSupported()) throw new Error('sin-webgpu');
    loading = true;
    try{
      if (!webllm) webllm = await import(/* @vite-ignore */ CDN);
      engine = await webllm.CreateMLCEngine(modelId(), {
        initProgressCallback: (r) => { onProgress && onProgress(r); },
      });
      ready = true;
      return true;
    } finally { loading = false; }
  }

  async function unload(){
    try{ if (engine && engine.unload) await engine.unload(); }catch(e){}
    engine = null; ready = false; history = [];
  }

  const EMOS = ['love','happy','shy','smug','jealous','angry','pout','sad','teasing','curious','surprised','blush'];
  function parse(out){
    let emotion = 'neutral';
    let text = (out||'').trim();
    const m = text.match(/^\s*\[([a-z]+)\]\s*/i);
    if (m && EMOS.includes(m[1].toLowerCase())){
      emotion = m[1].toLowerCase();
      text = text.slice(m[0].length).trim();
    } else {
      // heurística por palabras si el modelo no puso etiqueta
      const l = text.toLowerCase();
      if (/celos|otra|solo mio|solo m[ií]a|con qui[eé]n/.test(l)) emotion='jealous';
      else if (/te (amo|quiero)|coraz[oó]n|mi amor/.test(l)) emotion='love';
      else if (/tont|baka|hmph|pff/.test(l)) emotion='pout';
    }
    // por si el modelo se extiende demasiado, recortamos
    if (text.length > 320) text = text.slice(0, 320).replace(/\s+\S*$/,'') + '…';
    return { text, emotion };
  }

  // genera una respuesta (con streaming opcional de tokens)
  async function reply(userText, { onToken } = {}){
    if (!ready) throw new Error('no-listo');
    history.push({ role:'user', content:userText });
    if (history.length > 10) history = history.slice(-10);   // contexto acotado

    const messages = [{ role:'system', content: systemPrompt() }, ...history];
    let full = '';
    const stream = await engine.chat.completions.create({
      messages, temperature: 0.9, top_p: 0.95, max_tokens: 160, stream: true,
    });
    for await (const chunk of stream){
      const d = chunk.choices?.[0]?.delta?.content || '';
      if (d){ full += d; onToken && onToken(full); }
    }
    history.push({ role:'assistant', content: full });
    return parse(full);
  }

  function reset(){ history = []; }

  return { isSupported, isReady, isLoading, load, unload, reply, reset,
           setModel, models, modelId };
})();
