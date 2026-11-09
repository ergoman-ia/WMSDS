// 디지털 각도기 서비스 워커
// 역할: (1) 설치 조건 충족, (2) 오프라인에서도 열리도록 파일 캐시
// 파일을 수정해 배포할 때마다 CACHE_VERSION 숫자를 올리면 예전 캐시가 정리된다.
const CACHE_VERSION = 20;
const CACHE_NAME = `angle-app-v${CACHE_VERSION}`;
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // 아이콘 파일이 아직 없어도 설치가 실패하지 않도록 개별 저장
      Promise.allSettled(PRECACHE.map((url) => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 네트워크 우선, 실패하면 캐시(오프라인). 성공한 응답은 캐시에 갱신 저장.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // 페이지(HTML) 요청은 브라우저 HTTP 캐시를 건너뛰고 항상 서버에서 새로 받는다 → 업데이트가 바로 반영
  const req = event.request.mode === 'navigate'
    ? new Request(event.request, { cache: 'reload' })
    : event.request;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && new URL(event.request.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(event.request).then((hit) => hit || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});
