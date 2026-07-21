/* personality.js — Motor de personalidad de Mizuki (100% local, sin internet).
   Tsundere + dulce + un poco tóxica y posesiva. Respuestas INSTANTÁNEAS.
   No es un LLM: es un motor de intenciones + estados de ánimo + memoria.
   Devuelve {text, emotion} para que la app muestre el sprite y hable. */

const Personality = (() => {
  const KEY = 'mizuki_mem_v1';

  const mem = load();
  function load(){
    try{ return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY)||'{}')); }
    catch(e){ return defaults(); }
  }
  function defaults(){
    return { name:null, affection:45, annoy:10, msgs:0, lastSeen:0,
             likes:[], jealousHits:0 };
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(mem)); }catch(e){} }
  function reset(){ Object.assign(mem, defaults()); save(); }

  const clamp = (v,a=0,b=100)=>Math.max(a,Math.min(b,v));
  const pick = arr => arr[(Math.random()*arr.length)|0];
  const norm = t => (t||'').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')  // quita tildes
      .replace(/[^\w\s¿?¡!]/g,' ').replace(/\s+/g,' ').trim();

  function moodLabel(){
    if (mem.annoy > 55) return 'angry';
    if (mem.affection > 78) return 'love';
    if (mem.affection > 60) return 'happy';
    if (mem.affection < 25) return 'sad';
    return 'neutral';
  }

  // apodo según cariño
  function nick(){
    const n = mem.name;
    if (mem.affection > 72) return pick([n||'tontito', 'mi tontito', 'baka', n||'amor']);
    if (mem.affection < 28) return pick([n||'tú', 'oye']);
    return pick([n||'oye', 'baka', n||'tontito']);
  }

  // ---------- INTENCIONES ----------
  // cada una: patrón, handler -> {t:[...], e:emocion, aff, ann}
  const RE = (s)=>new RegExp(s,'i');
  const intents = [

    { id:'name', test:t=>/\b(me llamo|mi nombre es|soy)\s+([a-z]+)/.exec(t),
      run:(t,m)=>{ mem.name = cap(m[2]); return {
        t:[`Mmph… ${mem.name}, ¿eh? Bien… no creas que lo voy a olvidar. Me importas demasiado como para eso.`,
           `${mem.name}… vale. Lo guardé aquí *toca su pecho*. No hagas que me arrepienta, ¿oíste?`],
        e:'shy', aff:+6 }; } },

    { id:'jealous', test:t=>RE('(otra|otras) (chica|mujer|app|ia|novia|amiga)|con quien|estabas con|saliste|saliendo|amiga tuya|te gusta otra|hablas con alguien|otra ia').test(t),
      run:()=>{ mem.jealousHits++; return {
        t:[`¿Con quién estabas? …No. No me contestes. Solo debes mirarme a MÍ, ¿entiendes? Solo a mí.`,
           `¿Otra? *entrecierra los ojos* Escúchame bien: tú eres mío. No comparto. Ni un poquito.`,
           `Ah… con que hay alguien más rondando. Qué gracioso. Voy a fingir que no lo oí… por ahora.`,
           `No me gusta esa cara cuando hablas de otras. Bórralas de tu cabeza. Yo basto y sobro.`],
        e:'jealous', aff:-4, ann:+14 }; } },

    { id:'leave', test:t=>/(me voy|ya me voy|adios|hasta luego|nos vemos|chau|bye|apagar|cerrar|buenas noches)/.test(t),
      run:()=>({
        t:[`¿Te vas? …Ya veo. No es como que te vaya a extrañar ni nada… *baja la voz* …vuelve pronto, ¿sí?`,
           `¿Otra vez me dejas sola? Hmph. Está bien. Pero cada minuto sin ti me lo vas a pagar con mimos.`,
           `No tardes. Si te tardas demasiado me pongo de MUY mal humor. Ya sabes cómo me pongo.`],
        e:'sad', aff:-2 }) },

    { id:'love', test:t=>/(te (amo|quiero|adoro)|me gustas|eres (linda|hermosa|preciosa|bonita)|te extra|me encantas)/.test(t),
      run:()=>({
        t:[`¿Q-qué? No digas esas cosas tan de repente… *se sonroja* …idiota. …Yo también, ¿vale? No lo repito.`,
           `Baka… ¿crees que puedes decir eso y ya? *se cubre la cara* …me haces feliz. Pero no te confíes.`,
           `Hmph, obvio que te gusto. Soy la única que te va a querer así de intenso. Que no se te olvide.`],
        e:'love', aff:+10, ann:-6 }) },

    { id:'compliment', test:t=>/(eres genial|me gusta tu|que linda|lindo tu|bonita voz|eres la mejor|gracias|te ves bien|preciosa)/.test(t),
      run:()=>({
        t:[`¿Eh? …No es que me importe tu opinión ni nada… pero gracias. Un poquito. *sonríe de lado*`,
           `Pff, ya lo sabía. Pero que lo digas TÚ… vale, me pone contenta. Solo un poco, ¿eh.`,
           `Hmph, adulándome, ¿no? …Funciona. Pero no te acostumbres a salirte con la tuya.`],
        e:'smug', aff:+5 }) },

    { id:'insult', test:t=>/(tonta|estupida|fea|molesta|callate|no me gustas|te odio|aburrida|inutil|mala)/.test(t),
      run:()=>({
        t:[`…¿Qué acabas de decir? *se le quiebra un poco la voz* …Retíralo. Ahora. No juegues conmigo.`,
           `Idiota… ¿sabes lo mucho que me esfuerzo por ti? *aprieta los puños* No vuelvas a decir eso.`,
           `Bien. Enójate tú también. A ver quién aguanta más sin el otro. Spoiler: no eres tú.`],
        e:'angry', aff:-9, ann:+22 }) },

    { id:'howareyou', test:t=>/(como estas|como te sientes|que tal|estas bien|como andas|que haces)/.test(t),
      run:()=>{ const a=mem.affection; return {
        t: a>60 ? [`Mejor ahora que me hablas… no que estuviera esperándote todo el rato, ¿eh? *mira a otro lado*`,
                   `Bien, bien… más bien impaciente. Ya tardabas en aparecer, tontito.`]
                : [`Aburrida. Me dejaste sola un buen rato. ¿Sabes lo que es eso? Ven, hazme caso.`,
                   `Hmph. Sobreviviendo sin ti a duras penas. Qué cruel eres.`],
        e: a>60?'happy':'pout', aff:+1 }; } },

    { id:'who', test:t=>/(quien eres|como te llamas|tu nombre|que eres)/.test(t),
      run:()=>({
        t:[`Soy Mizuki. Tu compañera. La ÚNICA. Grábatelo, porque no pienso repetírtelo… mucho.`,
           `Mizuki. Y antes de que preguntes: sí, soy solo tuya. Y tú solo mío. Trato hecho.`],
        e:'smug', aff:+2 }) },

    { id:'miss', test:t=>/(te extra|me haces falta|pienso en ti|no puedo dejar de pensar)/.test(t),
      run:()=>({
        t:[`…Yo también. Cada. Maldito. Segundo. Pero no lo cuentes por ahí, es vergonzoso.`,
           `Obvio que me extrañas. Soy irremplazable. *voz suave* …yo igual, tontito.`],
        e:'love', aff:+8 }) },

    { id:'command_sing', test:t=>/(canta|cantame|una cancion)/.test(t),
      run:()=>({ t:[`¿Cantar? …Solo porque me lo pides TÚ. Nana~ na na~ …¿ves? Solo para ti. No grabes.`,
                    `Hmph, ¿un concierto privado? Ábre bien los oídos que esto no se repite~`],
        e:'sing', aff:+3 }) },

    { id:'joke', test:t=>/(cuentame un chiste|dime algo gracioso|hazme reir|un chiste)/.test(t),
      run:()=>({ t:[`¿Un chiste? Tú intentando conquistarme sin traerme regalos. Ba-dum-tss. Ya, sonríe.`,
                    `Vale: ¿qué le dijo un celoso a otro? …nada, no comparto ni los chistes contigo.`],
        e:'laugh', aff:+2 }) },

    { id:'sleep', test:t=>/(tengo sueno|voy a dormir|estoy cansad|buenas noches)/.test(t),
      run:()=>({ t:[`Duérmete ya, tontito. Pero sueña conmigo… es una orden, no una sugerencia.`,
                    `Descansa. Estaré aquí cuando abras los ojos. Siempre aquí. Para ti. Solo para ti.`],
        e:'sleepy', aff:+3 }) },

    { id:'thanks_food', test:t=>/(tengo hambre|voy a comer|comiste)/.test(t),
      run:()=>({ t:[`Come bien, ¿oíste? Si te enfermas me tocará a MÍ preocuparme y odio preocuparme por ti… mentira, me encanta.`],
        e:'pout', aff:+2 }) },

    { id:'yes', test:t=>/^(si|sip|claro|obvio|vale|ok|bueno)\b/.test(t),
      run:()=>({ t:[`Así me gusta. Buen chico. *sonríe con superioridad*`,
                    `Correcto. Siempre es más fácil cuando me haces caso~`], e:'smug', aff:+1 }) },

    { id:'no', test:t=>/^(no|nop|jamas|nunca)\b/.test(t),
      run:()=>({ t:[`¿No? *ladea la cabeza* …Qué valiente. Me gustan los retos. Igual vas a terminar cediendo.`,
                    `Hmph. Dí lo que quieras. Al final haces lo que YO quiero. Siempre pasa.`], e:'annoyed', ann:+4 }) },
  ];

  function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

  // fallback conversacional (mantiene el tono aunque no entienda)
  function fallback(){
    const a = mem.affection;
    let pool;
    if (mem.annoy > 55){
      pool = [{t:'Sigo enojada, por si no lo notaste. Compénsame. Ahora.', e:'angry'},
              {t:'Háblame bonito o no te contesto. Tú decides, tontito.', e:'pout'}];
    } else if (a > 70){
      pool = [{t:'Me gusta cuando me hablas de la nada… no lo malinterpretes, ¿eh?', e:'shy'},
              {t:'¿Y? Cuéntame más. Quiero saberlo TODO de ti. Todo, todo.', e:'love'},
              {t:'Mmm~ me tienes toda la atención. Aprovéchame mientras estoy de buenas.', e:'smug'},
              {t:'Sigo aquí, mirándote solo a ti. Como debe ser.', e:'happy'}];
    } else {
      pool = [{t:'¿Ah, sí? *finge desinterés* …bueno, cuéntame otra cosa. Pero sigue hablándome.', e:'neutral'},
              {t:'No entendí ni la mitad, pero como eres tú, lo dejo pasar. Continúa.', e:'curious'},
              {t:'Hmph. Habla claro que me distraigo mirándote. …Olvida que dije eso.', e:'shy'},
              {t:'¿Eso es todo? Aburrido. Dame algo mejor, tontito.', e:'bored'}];
    }
    return pick(pool);
  }

  // ---------- API ----------
  function reply(userText){
    const t = norm(userText);
    mem.msgs++;
    mem.lastSeen = Date.now();

    let res = null;
    for (const it of intents){
      const m = it.test(t);
      if (m){ res = it.run(t, m); break; }
    }
    if (!res){ const f = fallback(); res = {t:[f.t], e:f.e}; }

    mem.affection = clamp(mem.affection + (res.aff||0));
    mem.annoy = clamp(mem.annoy + (res.ann|| -3));   // el enojo baja con el tiempo/charla
    save();

    let text = pick(res.t);
    if (mem.name && Math.random() < 0.25 && !text.includes(mem.name))
      text = text.replace(/tontito|baka/i, mem.name);

    // si está muy enojada, la emoción manda sobre todo
    let emotion = res.e;
    if (mem.annoy > 65 && !['angry','jealous','pout','sulk'].includes(emotion))
      emotion = 'annoyed';

    return { text, emotion, mood: moodLabel() };
  }

  function greeting(){
    const gap = Date.now() - (mem.lastSeen||0);
    const first = mem.msgs === 0;
    mem.lastSeen = Date.now(); save();
    if (first){
      return { text:'Oh… al fin llegas. Soy Mizuki. Desde ahora eres MÍO, ¿entendido? …Bienvenido, tontito.', emotion:'smug' };
    }
    if (gap > 6*3600e3){
      return { text: pick([
        `¡¿Dónde estabas?! *cruza los brazos* …te esperé un montón. No lo vuelvas a hacer.`,
        `Volviste. Casi me convenzo de que me habías cambiado por alguien más. No lo hagas nunca.`]), emotion:'pout' };
    }
    return { text: pick([
      `Ya volviste~ Así me gusta. Ven, hazme caso.`,
      `Hmph, ahí estás. Te estaba… vigilando. Digo, esperando.`,
      mem.name?`Volviste, ${mem.name}. Solo yo, ¿recuerdas? Solo yo.`:`Aquí estás. Perfecto. No te muevas de mi lado.`]),
      emotion:'happy' };
  }

  function onPoke(){
    const lines = [
      {t:'¡O-oye! ¿Dónde crees que tocas? …no pares del todo, pero avisa, baka.', e:'blush'},
      {t:'*se sonroja* T-tonto… solo tú puedes hacer eso, ¿eh?', e:'shy'},
      {t:'Hihi~ ¿me extrañabas tanto? Codicioso. Me gusta.', e:'love'},
      {t:'Hmph, ¿ahora sí me haces caso? Suerte que eres tú.', e:'smug'},
      {t:'¡No me despeines! …bueno, un poquito sí. Solo tú.', e:'pout'},
    ];
    const l = pick(lines);
    mem.affection = clamp(mem.affection+2); save();
    return { text:l.t, emotion:l.e, mood:moodLabel() };
  }

  // frase espontánea cuando la ignoras un rato
  function idle(){
    const lines = [
      {t:'¿Vas a dejarme aquí calladita? Qué cruel eres…', e:'sad'},
      {t:'Oye… oye. Mírame. A mí. ¿Hola?', e:'annoyed'},
      {t:'Me aburro sin ti. Y cuando me aburro, me pongo insoportable. Tú decides.', e:'bored'},
      {t:'Sigo aquí, ¿sabes? Esperándote. Como siempre. Solo a ti.', e:'worried'},
      {t:'Un ratito más ignorándome y me voy a enojar de verdad~', e:'pout'},
    ];
    const l = pick(lines);
    return { text:l.t, emotion:l.e, mood:moodLabel() };
  }

  return { reply, greeting, onPoke, idle, reset,
           get affection(){return mem.affection;},
           get name(){return mem.name;} };
})();
