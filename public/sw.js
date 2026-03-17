// FindRec TO — Service Worker
// Handles incoming Web Push messages and notification click events.
// Registered from the dashboard when the user opts in to browser notifications.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "FindRec TO", body: event.data.text() };
  }

  const title = payload.title ?? "FindRec TO";
  const options = {
    body:    payload.body  ?? "You have drop-in sessions today.",
    icon:    payload.icon  ?? "/logo.png",
    badge:   payload.badge ?? "/logo.png",
    data:    payload.data  ?? { url: "/dashboard" },
    // Keep notification visible until user dismisses it
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/dashboard";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If a window with this origin is already open, focus it and navigate
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.focus();
            return client.navigate(targetUrl);
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
