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

  async function currentUserId() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    const uid = data && data.user && data.user.id;
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
