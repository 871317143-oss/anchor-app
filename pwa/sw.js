const CACHE = 'mhl-shell-v2'
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo-mark.png',
  './logo-black.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './assets/index-BS3SyPSE.css',
  './assets/index-Tm7XuWC7.js',
  './assets/Anchors-BNx4tdkW.js',
  './assets/BossLine-DteHslTI.js',
  './assets/CardModal-DIai5a3C.js',
  './assets/ClipCard-BDXQDDMi.js',
  './assets/ConfirmSheet-BWGLp6YK.js',
  './assets/FanDetail-CfX-mko-.js',
  './assets/FansTab-BPyLekMA.js',
  './assets/HrLine-D8m-hUXr.js',
  './assets/OpsLine-Xl3y01Zg.js',
  './assets/ProdFanDetail-Krw762vp.js',
  './assets/ProdFans-C1Jdpwr6.js',
  './assets/ProdHome-Bl9wXn-A.js',
  './assets/ProdMe-fV9n0teG.js',
  './assets/ProdOpsApprovals-CUbkvgnP.js',
  './assets/ProdXiu-CgSWhD0S.js',
  './assets/ScoutLine-BhyqiheS.js',
  './assets/SimpleTabs-CLVFHc-K.js',
  './assets/StaffLine-vbRReJMz.js',
  './assets/SubmitRequest-c4BHB7eW.js',
  './assets/SwipeTabs-BAuMmOrN.js',
  './assets/Wheel-BbEeWq8Z.js',
  './assets/XiuxingTab-CvqKlyki.js',
  './assets/prodAdapters-Dckjptk2.js',
  './assets/useAnchorRequest-D8X9ViOJ.js',
  './assets/useSwipeFling-Bjgc7S_2.js',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('mhl-shell-') && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET' || request.headers.has('range')) return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) return
  if (/\.(mp4|mov|m4v|ts|m3u8)$/i.test(url.pathname)) return

  event.respondWith((async () => {
    const cached = await caches.match(request, { ignoreSearch: request.mode === 'navigate' })
    const network = fetch(request, { cache: 'no-cache' }).then(async response => {
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE)
        await cache.put(request, response.clone())
      }
      return response
    })
    if (cached) {
      event.waitUntil(network.catch(() => undefined))
      return cached
    }
    try {
      return await network
    } catch (error) {
      if (request.mode === 'navigate') {
        const shell = await caches.match('./index.html')
        if (shell) return shell
      }
      throw error
    }
  })())
})
