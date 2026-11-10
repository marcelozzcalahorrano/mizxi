/* tts_natural.js — Voz NATURAL femenina en español (neuronal, Piper/VITS en el
   navegador vía onnxruntime-web). Mucho menos robótica que el TTS del sistema.

   - Descarga la voz UNA vez (con internet, ~20-60 MB) y la cachea; luego funciona
     offline. Si falla (sin internet / navegador viejo), la app usa el TTS del sistema.
   - Voces (femeninas, español):
       es_AR-daniela-high   -> Argentina, dulce (por defecto)
       es_ES-sharvard-medium-> España
       es_MX-claude-high    -> México
   Genera un WAV que reproducimos con Web Audio para hacer lip-sync REAL. */

const NaturalTTS = (() => {
  const CDN = 'https://esm.run/@diffusionstudio/vits-web';
  const VOICES = {
    'daniela': 'es_AR-daniela-high',
    'sharvard': 'es_ES-sharvard-medium',
    'claude':  'es_MX-claude-high',
  };
  let mod = null, ready = false, loading = false;

  function key(){ return localStorage.getItem('mizuki_nat_voice') || 'daniela'; }
  function voiceId(){ return VOICES[key()] || VOICES.daniela; }
  function voices(){ return VOICES; }
  function setVoice(k){ if (VOICES[k]){ localStorage.setItem('mizuki_nat_voice', k); ready = false; } }
  function isReady(){ return ready; }
  function isLoading(){ return loading; }
  function isSupported(){ return typeof WebAssembly === 'object'; }

  async function load(onProgress){
    if (ready) return true;
    if (loading) return false;
    loading = true;
    try{
      if (!mod) mod = await import(/* @vite-ignore */ CDN);
      await mod.download(voiceId(), (p) => {
        // p = {url, total, loaded} o {progress}
        let pct = null;
        if (p && typeof p.loaded === 'number' && p.total) pct = p.loaded / p.total;
        else if (p && typeof p.progress === 'number') pct = p.progress;
        onProgress && onProgress(pct);
      });
      ready = true;
      return true;
    } finally { loading = false; }
  }

  // Devuelve un Blob WAV (audio/wav) con la frase hablada
  async function synth(text){
    if (!ready) throw new Error('no-listo');
    return await mod.predict({ text, voiceId: voiceId() });
  }

  return { load, synth, setVoice, voices, voiceId, isReady, isLoading, isSupported };
})();
