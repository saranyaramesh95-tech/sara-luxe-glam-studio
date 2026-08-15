/* Handles subscribing this device to push notifications. Requires the
   "push_subscriptions" table from README.md (Notifications section). */
(function () {
  const VAPID_PUBLIC_KEY =
    "BBu_FZj8T7I_XN1pLN9SYHqwk4d3RCp3SF_41yZBhjLi6iDjzE6qv-988KdArs756Cj0FaKXHtaK69iKFur78W8";

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  window.pushNotifications = {
    isSupported() {
      return "serviceWorker" in navigator && "PushManager" in window;
    },

    async permissionState() {
      if (!this.isSupported()) return "unsupported";
      return Notification.permission; // "default" | "granted" | "denied"
    },

    async currentSubscription() {
      if (!this.isSupported()) return null;
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return null;
      return reg.pushManager.getSubscription();
    },

    async enable() {
      if (!this.isSupported()) throw new Error("Push isn't supported on this browser.");

      const reg = await navigator.serviceWorker.register("sw.js");

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notification permission was not granted.");

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      const { error } = await window.supabaseClient.from("push_subscriptions").upsert(
        {
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;

      return sub;
    },

    async disable() {
      const sub = await this.currentSubscription();
      if (!sub) return;
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      if (window.supabaseClient) {
        await window.supabaseClient.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
    },
  };
})();
