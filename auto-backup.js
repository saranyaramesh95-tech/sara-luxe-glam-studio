/* Weekly automatic backup to Supabase Storage, with anything older than
   90 days cleaned up automatically. Runs quietly whenever the app is
   opened and it's been a week (or more) since the last one — no button,
   no reminder needed. Requires the "backups" storage bucket + policy from
   README.md (Automatic backups section). */
(function () {
  const BUCKET = "backups";
  const INTERVAL_DAYS = 7;
  const RETENTION_DAYS = 90;
  const LAST_BACKUP_KEY = "slg:lastAutoBackupAt";

  async function currentUserId() {
    const { data, error } = await window.supabaseClient.auth.getUser();
    if (error) throw error;
    return data && data.user && data.user.id;
  }

  async function gatherBundle() {
    const [clients, ratesRaw, templates, gigs, biz] = await Promise.all([
      window.cloudStore.get("slg:clients"),
      window.cloudStore.get("slg:rates:v4"),
      window.cloudStore.get("slg:templates:v4"),
      window.cloudStore.get("slg:gigs"),
      window.cloudStore.get("slg:biz"),
    ]);
    return {
      app: "sara-luxe-glam",
      version: 1,
      exportedAt: new Date().toISOString(),
      clients: clients || [],
      gigs: gigs || [],
      rates: (ratesRaw && ratesRaw.services) || [],
      settings: (ratesRaw && ratesRaw.settings) || {},
      templates: templates || [],
      biz: biz || {},
    };
  }

  async function pruneOld(uid) {
    const { data: files, error } = await window.supabaseClient.storage
      .from(BUCKET)
      .list(uid, { limit: 1000 });
    if (error || !files || !files.length) return;

    const cutoff = Date.now() - RETENTION_DAYS * 86400000;
    const stale = files.filter((f) => {
      const t = f.created_at ? new Date(f.created_at).getTime() : 0;
      return t && t < cutoff;
    });
    if (!stale.length) return;

    await window.supabaseClient.storage
      .from(BUCKET)
      .remove(stale.map((f) => `${uid}/${f.name}`));
    console.log(`Auto-backup: removed ${stale.length} backup(s) older than ${RETENTION_DAYS} days.`);
  }

  window.runAutoBackupIfDue = async function () {
    try {
      if (!window.supabaseClient || !window.cloudStore) return;

      const uid = await currentUserId();
      if (!uid) return;

      const lastRaw = await window.cloudStore.get(LAST_BACKUP_KEY);
      const last = lastRaw ? new Date(lastRaw).getTime() : 0;
      const due = Date.now() - last >= INTERVAL_DAYS * 86400000;
      if (!due) return;

      const bundle = await gatherBundle();
      const fname = `${uid}/sara-luxe-glam-backup-${bundle.exportedAt.slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });

      const { error: upErr } = await window.supabaseClient.storage
        .from(BUCKET)
        .upload(fname, blob, { upsert: true, contentType: "application/json" });
      if (upErr) throw upErr;

      await window.cloudStore.set(LAST_BACKUP_KEY, new Date().toISOString());
      await pruneOld(uid);
      console.log("Auto-backup saved:", fname);
    } catch (e) {
      console.error("Auto-backup failed:", e);
    }
  };
})();
