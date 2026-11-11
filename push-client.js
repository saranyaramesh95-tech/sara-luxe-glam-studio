/* Handles subscribing this device to push notifications. Requires the
   "push_subscriptions" table from README.md (Notifications section). */
(function () {
  const VAPID_PUBLIC_KEY =
    "BBvsNR35PHqA0LXxUDsH1uXVOAy0o40hpxfLQPFhE0oaIOKRvyyGsEBJrShxDLHxIqn-iqVGgpcSHdOOxzzOgOU";

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
  }

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isInstalledApp = () =>
    window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);

  window.pushNotifications = {
    /* Why it can't be switched on here, in words she can act on */
    unsupportedReason() {
      if (isIOS() && !isInstalledApp()) {
        return (
          "On iPhone, notifications only work from the Home Screen app, not from Safari.\n\n" +
          "1. In Safari, tap the Share button (square with an arrow).\n" +
          "2. Tap Add to Home Screen, then Add.\n" +
          "3. Close Safari and open the app from the NEW icon on your Home Screen.\n" +
          "4. Sign in and tap Enable notifications again."
        );
      }
      return "This browser can't receive notifications. Try Chrome or Safari, or the app from your Home Screen.";
    },

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
      if (!this.isSupported()) throw new Error(this.unsupportedReason());
      if (!window.supabaseClient) throw new Error("Not signed in yet.");

      // Ask first, straight from the tap (iPhone requires that).
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error(
          "Notifications are turned off for this app. On iPhone: Settings > Notifications > SLG Studio > Allow Notifications. Then tap Enable again."
        );
      }

      await navigator.serviceWorker.register("sw.js");
      // Must be fully active before subscribing, or iPhone refuses.
      const reg = await navigator.serviceWorker.ready;

      const options = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      };
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe(options);
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
      if (error) {
        throw new Error(
          "Couldn't save this device (" + (error.message || "unknown error") + "). " +
            "The notification tables may not be set up in Supabase yet."
        );
      }

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
