// Deliberately no runtime cache: never retain private API responses or serve
// an old frontend against a newly deployed game engine. Online play is required.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
