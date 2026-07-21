/* sw.js — Service Worker: cachea todo para funcionar OFFLINE.
   Nota: el Modo IA (WebLLM) se descarga desde su CDN y gestiona su propio
   cache del modelo; por eso no lo incluimos aqui. */
const CACHE = 'mizuki-v2';
const ASSETS = [
  "./",
  "index.html",
  "css/style.css",
  "js/character.js",
  "js/personality.js",
  "js/ai.js",
  "js/voice.js",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "sprites/angry.png",
  "sprites/angry_talk.png",
  "sprites/annoyed.png",
  "sprites/blush.png",
  "sprites/bored.png",
  "sprites/cry.png",
  "sprites/curious.png",
  "sprites/excited.png",
  "sprites/excited_talk.png",
  "sprites/happy.png",
  "sprites/happy_talk.png",
  "sprites/jealous.png",
  "sprites/laugh.png",
  "sprites/love.png",
  "sprites/neutral.png",
  "sprites/neutral_talk.png",
  "sprites/pout.png",
  "sprites/sad.png",
  "sprites/sad_talk.png",
  "sprites/shy.png",
  "sprites/shy_talk.png",
  "sprites/sing.png",
  "sprites/sleepy.png",
  "sprites/smile.png",
  "sprites/smug.png",
  "sprites/smug_talk.png",
  "sprites/sulk.png",
  "sprites/surprised.png",
  "sprites/teasing.png",
  "sprites/teasing_talk.png",
  "sprites/wink.png",
  "sprites/worried.png",
  "sprites/manifest.json"
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // solo gestionamos peticiones de nuestro propio origen; la IA (CDN) pasa directo
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
