/* Login gate + render root. Runs after app.jsx, so SaraLuxeGlamStudio
   is already defined as a global by the time this executes. */
const { useState: useState2, useEffect: useEffect2 } = React;

function LoginScreen() {
  const [email, setEmail] = useState2("");
  const [password, setPassword] = useState2("");
  const [err, setErr] = useState2("");
  const [busy, setBusy] = useState2(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await window.supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <div
      style={{
        maxWidth: 360,
        margin: "12vh auto",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "0 24px",
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Sara Luxe Glam Studio</h1>
      <p style={{ fontSize: 13, color: "#777", marginBottom: 20 }}>
        Sign in to see your clients.
      </p>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            style={{
              width: "100%",
              padding: 10,
              boxSizing: "border-box",
              fontSize: 15,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 10,
              boxSizing: "border-box",
              fontSize: 15,
              border: "1px solid #ccc",
              borderRadius: 6,
            }}
          />
        </div>
        {err && (
          <div style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          style={{
            width: "100%",
            padding: 11,
            cursor: "pointer",
            fontSize: 15,
            border: "none",
            borderRadius: 6,
            background: "#111",
            color: "#fff",
          }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Root() {
  // undefined = still checking, null = signed out, object = signed in
  const [session, setSession] = useState2(undefined);

  useEffect2(() => {
    if (!window.supabaseClient) return;
    window.supabaseClient.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
    });
    const { data: sub } = window.supabaseClient.auth.onAuthStateChange(
      (_event, sess) => setSession(sess || null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect2(() => {
    if (!session) return;

    const checkForUpdates = () => {
      if (window.runAutoBackupIfDue) window.runAutoBackupIfDue();
      if (window.runInquiryImportIfDue) window.runInquiryImportIfDue();
    };

    checkForUpdates();

    /* Previously these only ran once at sign-in, so a new website inquiry
       arriving while the app was already open (not freshly reloaded)
       wouldn't get pulled in until the next full close/reopen. Now
       coming back to the tab re-checks too. */
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdates();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [session]);

  if (!window.supabaseClient) {
    return (
      <div
        style={{
          maxWidth: 420,
          margin: "15vh auto",
          fontFamily: "sans-serif",
          padding: "0 24px",
          color: "#c0392b",
        }}
      >
        {window.supabaseConfigError ||
          "Supabase isn't set up yet — edit config.js."}
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div style={{ padding: 40, fontFamily: "sans-serif", color: "#777" }}>
        Loading…
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div>
      <div
        style={{
          position: "fixed",
          top: 8,
          right: 8,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <SaveStatus />
        <NotificationToggle />
        <button
          onClick={() => window.supabaseClient.auth.signOut()}
          style={{
            fontSize: 12,
            padding: "5px 10px",
            cursor: "pointer",
            border: "1px solid #ccc",
            borderRadius: 6,
            background: "#fff",
          }}
        >
          Sign out
        </button>
      </div>
      <SaraLuxeGlamStudio />
    </div>
  );
}

function SaveStatus() {
  const [pending, setPending] = useState2(window.__pendingSaves || 0);
  const [showSaved, setShowSaved] = useState2(false);

  useEffect2(() => {
    let savedTimer = null;
    const onStatus = (e) => {
      const p = e.detail.pending;
      setPending(p);
      if (p === 0) {
        setShowSaved(true);
        clearTimeout(savedTimer);
        savedTimer = setTimeout(() => setShowSaved(false), 2000);
      }
    };
    window.addEventListener("slg-save-status", onStatus);
    return () => {
      window.removeEventListener("slg-save-status", onStatus);
      clearTimeout(savedTimer);
    };
  }, []);

  if (pending > 0) {
    return (
      <span style={{ fontSize: 12, color: "#a67c1d", fontWeight: 500 }}>
        Saving…
      </span>
    );
  }
  if (showSaved) {
    return (
      <span style={{ fontSize: 12, color: "#3a7d44" }}>All changes saved</span>
    );
  }
  return null;
}

function NotificationToggle() {
  // "unknown" while checking, then "unsupported" | "off" | "on"
  const [state, setState] = useState2("unknown");
  const [busy, setBusy] = useState2(false);
  const [msg, setMsg] = useState2("");

  const refresh = async () => {
    if (!window.pushNotifications || !window.pushNotifications.isSupported()) {
      setState("unsupported");
      return;
    }
    const sub = await window.pushNotifications.currentSubscription();
    setState(sub ? "on" : "off");
  };

  useEffect2(() => {
    refresh();
  }, []);

  const toggle = async () => {
    setBusy(true);
    setMsg("");
    try {
      if (state === "on") {
        await window.pushNotifications.disable();
      } else {
        await window.pushNotifications.enable();
      }
      await refresh();
    } catch (e) {
      setMsg(e.message || "Couldn't change that.");
    }
    setBusy(false);
  };

  if (state === "unsupported" || state === "unknown") return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {msg && (
        <span style={{ fontSize: 11, color: "#c0392b", maxWidth: 160 }}>{msg}</span>
      )}
      <button
        onClick={toggle}
        disabled={busy}
        style={{
          fontSize: 12,
          padding: "5px 10px",
          cursor: "pointer",
          border: "1px solid #ccc",
          borderRadius: 6,
          background: state === "on" ? "#111" : "#fff",
          color: state === "on" ? "#fff" : "#111",
        }}
      >
        {busy ? "…" : state === "on" ? "Notifications on" : "Enable notifications"}
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
