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
    if (session && window.runAutoBackupIfDue) {
      window.runAutoBackupIfDue();
    }
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
      <button
        onClick={() => window.supabaseClient.auth.signOut()}
        style={{
          position: "fixed",
          top: 8,
          right: 8,
          zIndex: 1000,
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
      <SaraLuxeGlamStudio />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
