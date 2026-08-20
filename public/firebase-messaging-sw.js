/* eslint-disable no-restricted-globals */

importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

const urlParams = new URLSearchParams(location.search);

const firebaseConfig = {
  apiKey: urlParams.get("apiKey"),
  authDomain: urlParams.get("authDomain"),
  projectId: urlParams.get("projectId"),
  storageBucket: urlParams.get("storageBucket"),
  messagingSenderId: urlParams.get("messagingSenderId"),
  appId: urlParams.get("appId"),
};

if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "undefined") {
  firebase.initializeApp(firebaseConfig);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "BACKGROUND_FCM", payload });
      });
    });

    if (payload.notification) return;

    const title = payload.notification?.title || payload.data?.title || "New notification";
    const body = payload.notification?.body || payload.data?.body || "";
    const actionUrl = payload.data?.action_url || null;
    const notificationId = payload.data?.notificationId || null;

    self.registration.showNotification(title, {
      body,
      icon: "/vite.svg",
      badge: "/vite.svg",
      data: { action_url: actionUrl },
      tag: notificationId || title,
    });
  });

  self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const fcmData = event.notification.data?.FCM_MSG?.data || event.notification.data || {};
    const actionUrl = fcmData.action_url || null;
    const targetUrl =
      actionUrl && actionUrl.startsWith("/")
        ? self.location.origin + actionUrl
        : self.location.origin + "/notifications";

    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl);
      })
    );
  });
}
