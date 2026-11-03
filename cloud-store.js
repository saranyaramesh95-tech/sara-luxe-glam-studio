/* Cloud storage adapter — backs app.jsx's load()/save() with a Supabase
   table instead of Claude's window.storage, so data is the same on every
   device you sign into. Plain JS (no JSX), loaded before app.jsx. */
(function () {
  let client;
  try {
    client = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
  } catch (e) {
    console.error("Supabase is not configured yet:", e.message);
    window.supabaseConfigError =
      "Supabase isn't set up yet — edit config.js with your project URL and anon key.";
    return;
  }
  window.supabaseClient = client;

  /* The signed-in user comes from the locally stored session. This used to
     call auth.getUser() — a network request — before EVERY read and write.
     When several fired at once (opening the app fires five reads together)
     they could collide and fail, and a failed read made the app fall back
     to its built-in sample clients and save those over the real ones. */
  async function currentUserId() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    const uid = data && data.session && data.session.user && data.session.user.id;
    if (!uid) throw new Error("Not signed in");
    return uid;
  }

  window.cloudStore = {
    async get(key) {
      const uid = await currentUserId();
      const { data, error } = await client
        .from("app_state")
        .select("value")
        .eq("user_id", uid)
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return data ? data.value : undefined;
    },
    async set(key, value) {
      const uid = await currentUserId();
      const { error } = await client.from("app_state").upsert(
        {
          user_id: uid,
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key" }
      );
      if (error) throw error;
    },
  };
})();
