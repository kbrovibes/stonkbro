// stonkbro Service Worker — Push Notifications

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "stonkbro";
  const options = {
    body: data.body || "New update",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "stonkbro-notification",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
