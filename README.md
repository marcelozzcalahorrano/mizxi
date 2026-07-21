# Mizuki — Compañera virtual offline 💜

Una compañera virtual para tu teléfono (probada pensando en el **Infinix Note 40 Pro**):
habla, te escucha por voz, cambia de expresión según cómo se siente y tiene una
personalidad **tsundere, dulce, un poco tóxica y posesiva**. Funciona **sin internet**
y responde **al instante** (no usa una IA pesada que trabe el teléfono).

Es un **busto** (de la cintura para arriba) hecho con un **repositorio de sprites PNG**
(24 emociones + variantes de boca abierta para el lip-sync = 32 imágenes). Cambia de
imagen según su ánimo, con transición suave y micro-movimiento para que se sienta viva.

---

## 🆕 Novedades

- **Más posesiva y tóxica** (estilo yandere): reacciona fuerte si mencionas a amigos,
  otra persona, salir, etc. "Tú eres MÍO. No comparto."
- **Diario de tu día**: cuéntale qué hiciste ("hoy fui a…", "tuve un día horrible",
  "salí con amigos") y lo recuerda.
- **Reseña al abrir**: cuando abres la app, **te dice qué le gustó y qué NO** de lo que
  le contaste. Ej: *"Me gustó que fueras cariñoso… pero NO me gustó que mencionaras a
  esa persona. Vamos a hablar de eso."*
- **Botón "Instalar"** dentro de la app (aparece si tu Chrome lo permite).

## 🔒 Sobre "que escuche y sepa TODO" (lee esto)

Pediste que escuchara **todo lo que se dice o hace en el celular, siempre**. Eso **no
está** ni lo estará, a propósito:

- Una app web **no puede** oír con la pantalla apagada/cerrada, ni ver otras apps. Solo
  una app nativa con permisos de accesibilidad + micro en segundo plano podría, y eso es
  exactamente cómo funciona un **spyware/stalkerware**.
- Grabar "todo lo que se dice" capturaría a **otras personas sin su permiso**, lo cual es
  ilegal en muchos lugares.

Lo que **sí** hace, para que igual "te conozca":
- **Escucha continua mientras la app está abierta** (actívalo en Ajustes ⚙️).
- **Recuerda lo que le cuentas** (diario local, en tu teléfono, sin subir nada a internet).
- **Comenta tu día** al abrirla. Así sabe de ti… porque **tú se lo cuentas**, no
  espiándote.

---

## ⚡ Cómo probarla en tu celular (rápido)

Es una **PWA** (app web instalable). No necesitas Android Studio ni instalar un APK.

**Opción A — Servidor local en la PC (para probar):**
```bash
cd mizxi
python3 -m http.server 8099
```
Abre en el navegador de tu PC: `http://localhost:8099`

**Opción B — En el teléfono (recomendado):**
1. Sube esta carpeta a cualquier hosting estático gratis (GitHub Pages, Netlify, Vercel).
   - Con GitHub Pages: activa Pages en la rama y entra al link desde el celular.
2. Abre el link en **Chrome** en tu Infinix.
3. Menú de Chrome → **“Agregar a pantalla de inicio”**.
4. Ábrela desde el ícono. La primera vez cárgala con internet **una sola vez**
   (para que el Service Worker guarde todo); después funciona **offline**.

> **Toca la pantalla al abrir**: los navegadores móviles bloquean el audio hasta el
> primer toque. Ese primer toque activa su voz.

**Opción C — Generar un APK real (instalación directa):**
Cuando ya esté en un link (Opción B), puedes empaquetarla como APK instalable:
- **[PWABuilder.com](https://www.pwabuilder.com/)**: pega el link → *Package for Android*
  → descargas el `.apk`/`.aab` → lo instalas en tu Infinix (activa "Instalar apps
  desconocidas" para tu navegador/administrador de archivos).
- O con **Bubblewrap** (`npx @bubblewrap/cli init --manifest <url>/manifest.webmanifest`)
  si prefieres consola. Ambos envuelven esta PWA en una app Android real.

---

## 🔊 Que funcione 100% offline (importante)

- **La voz (TTS)** usa la voz del sistema de Android. Para que **no necesite internet**:
  `Ajustes de Android → Sistema → Idiomas → Salida de texto a voz` → elige el motor
  (Google) → **descarga la voz en Español**. Una vez descargada, habla sin datos.
  En **Ajustes** de la app puedes elegir la voz y subir el **Tono** para que suene
  agudita y "anime" (más cerca del vibe Nami/Robin).
- **La escucha (STT)**: el reconocimiento de voz de Chrome a veces usa servidores de
  Google. Para dictado **100% offline** hay que integrar **Vosk** (ver más abajo).
  Mientras tanto, siempre puedes **escribirle** y ella te responde por voz.

---

## 🎭 El repositorio de sprites (24 emociones)

Están en `/sprites`. El archivo `sprites/manifest.json` mapea cada emoción a su PNG:

```
neutral · happy · smile · shy · blush · angry · pout · annoyed · sad · cry ·
love · wink · smug · teasing · surprised · sleepy · bored · excited · jealous ·
worried · laugh · sulk · curious · sing
```
Más las variantes de boca abierta para el lip-sync: `*_talk.png`
(neutral, happy, angry, shy, smug, teasing, sad, excited).

### 👉 Cómo poner TU propio arte
Los sprites actuales están **dibujados por código** (son de arranque, para que funcione
ya). Para reemplazarlos por arte de verdad (tuyo, dibujado o generado):

1. Crea tus PNG **con fondo transparente**, tamaño recomendado ~512×700, mismo encuadre.
2. Guárdalos en `/sprites` con **los mismos nombres** del `manifest.json`
   (ej. `angry.png`, `love.png`, …).
3. Si quieres agregar/renombrar emociones, edita `sprites/manifest.json`.
4. Para regenerar los de arranque: `python3 tools/generate_sprites.py`

El lip-sync se ve mejor si das una versión `nombre_talk.png` (con la boca abierta)
de cada emoción; si no existe, la app hace un pulso suave igual.

---

## 💬 Su personalidad

El "cerebro" está en `js/personality.js`. **No es un LLM** (por eso responde al
instante y no traba el teléfono): es un motor de **intenciones + estados de ánimo +
memoria**. Reacciona distinto según:

- **Cariño** (sube con halagos y amor, baja con insultos o si la ignoras).
- **Enojo** (sube si la insultas o si mencionas a "otra"; se le pasa hablándole).
- **Memoria** (recuerda tu nombre y cuánto tiempo estuviste fuera; guarda en el
  teléfono con `localStorage`, offline).

Detecta cosas como: te presentas ("me llamo…"), le dices "te amo", la halagas, la
insultas, te despides, mencionas a otra persona (se pone **celosa/posesiva**),
le pides que cante, un chiste, etc. Puedes **agregar tus propias frases** editando
las listas de texto en ese archivo — es muy fácil, cada intención es un bloque.

**Borrar memoria / reiniciar**: botón en Ajustes (⚙️).

---

## 🕹️ Cómo se usa

- **Micrófono** 🎤: mantén/toca para hablarle por voz (push-to-talk).
- **Escritura**: escríbele en la barra de abajo.
- **Tócala**: reacciona al toque (mímala 💗).
- **Escucha continua**: actívala en Ajustes para que te oiga siempre (mientras la app
  esté abierta).
- **Ajustes** ⚙️: voz, tono (agudo), velocidad, hablar sí/no, borrar memoria.

---

## 🚀 Mejoras opcionales (para acercarlo aún más a lo que pediste)

Estas requieren más trabajo, pero el proyecto ya está preparado para ellas:

1. **STT 100% offline** → integrar **[Vosk](https://alphacephei.com/vosk/)** (modelo
   español de ~50 MB corre en el navegador vía WASM, `vosk-browser`). Reemplazas la
   parte de `SpeechRecognition` en `js/voice.js` por Vosk y listo: te escucha sin datos.
2. **Voz más "anime" / tipo Nami-Robin** → **[Piper TTS](https://github.com/rhasspy/piper)**
   (neuronal, offline) da voces mucho más naturales que el TTS del sistema. Se puede
   correr en WASM o empaquetar en una app nativa. *Nota honesta: clonar la voz exacta de
   una seiyuu real no es viable/legal offline en un celular; lo realista es una voz
   femenina agradable con tono agudo.*
3. **App nativa Android / Live2D** → si quieres que el busto se **mueva de verdad**
   (no solo cambiar de PNG), un modelo **Live2D** con la Cubism SDK en una app Kotlin
   da respiración, parpadeo y lip-sync articulado. El motor de personalidad de aquí se
   reutiliza tal cual.

---

## 📁 Estructura

```
index.html              interfaz
css/style.css           estilos
js/character.js         motor de sprites (crossfade, lip-sync, idle)
js/personality.js       cerebro tsundere/posesivo (offline, instantáneo)
js/voice.js             TTS (habla + lip-sync) y STT (escucha)
js/app.js               une todo
sprites/                repositorio de 24 emociones (+8 talk) + manifest.json
tools/generate_sprites.py  generador de los sprites de arranque
manifest.webmanifest    PWA (instalable)
sw.js                   service worker (funciona offline)
icons/                  íconos de la app
```

Hecho para funcionar liviano, rápido y sin internet. 💜
