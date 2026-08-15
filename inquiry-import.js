/* On sign-in, pulls any new website inquiries into the client pipeline
   automatically, then marks them imported so they're never pulled in
   twice. Requires the "inquiries" table + policies from README.md
   (Website inquiries section). */
(function () {
  const EVENT_TYPE_MAP = {
    "Wedding (I'm the Bride)": { type: "Bridal", occasion: "wedding" },
    "Wedding (I'm a attendee)": { type: "Special event", occasion: "wedding guest" },
    "Engagement": { type: "Special event", occasion: "engagement" },
    "Photoshoot": { type: "Shoot", occasion: "photoshoot" },
    "Prom": { type: "Special event", occasion: "prom" },
    "Special Event": { type: "Special event", occasion: "" },
    "Makeup class": { type: "Class", occasion: "makeup class" },
    "Flim": { type: "Shoot", occasion: "film" },
  };

  function isoOf(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }

  function inquiryToClient(row) {
    const a = row.answers || {};
    const mapped = EVENT_TYPE_MAP[a.eventType] || { type: "Special event", occasion: a.eventType || "" };
    const today = new Date();

    const noteLines = [
      "New inquiry from the website:",
      a.message ? `"${a.message}"` : null,
      `Prefers to be contacted: ${a.preferredContactTime || "—"}`,
      `Makeup services wanted: ${a.makeupQty ?? "—"} · Hair services wanted: ${a.hairQty ?? "—"}`,
      `Heard about us via: ${a.source || "—"}`,
      a.eventType === "Other ( Kindly specify in your message field)"
        ? "(She picked \"Other\" for event type — check the message above.)"
        : null,
    ].filter(Boolean);

    return {
      id: "c" + Date.now() + Math.floor(Math.random() * 1000),
      name: a.name || "Website inquiry",
      type: mapped.type,
      occasion: mapped.occasion,
      eventDate: a.eventDate || "",
      city: "",
      phone: a.phone || "",
      email: a.email || "",
      stage: 0,
      services: {},
      travel: false,
      secondArtistTravel: false,
      trial: false,
      retainerMonth: null,
      notes: noteLines.join("\n"),
      todos: [],
      inquiryDate: isoOf(today),
      nudgeOn: isoOf(new Date(today.getTime() + 3 * 86400000)),
      readyTime: "",
      location: a.location || "",
    };
  }

  window.runInquiryImportIfDue = async function () {
    try {
      if (!window.supabaseClient || !window.cloudStore) return;

      const { data: rows, error } = await window.supabaseClient
        .from("inquiries")
        .select("id, answers")
        .eq("imported", false)
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (!rows || !rows.length) return;

      const existing = (await window.cloudStore.get("slg:clients")) || [];
      const newClients = rows.map(inquiryToClient);
      // Newest first, so among same-priority fresh inquiries the latest one
      // still lands on top.
      await window.cloudStore.set("slg:clients", [...newClients, ...existing]);

      const { error: markErr } = await window.supabaseClient
        .from("inquiries")
        .update({ imported: true })
        .in("id", rows.map((r) => r.id));
      if (markErr) throw markErr;

      console.log(`Imported ${rows.length} new inquir${rows.length === 1 ? "y" : "ies"}.`);
      // The app already finished its own initial load by the time this
      // resolves, so reload once to bring the freshly-imported cards in.
      window.location.reload();
    } catch (e) {
      console.error("Inquiry import failed:", e);
    }
  };
})();
