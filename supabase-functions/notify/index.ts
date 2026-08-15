// Supabase Edge Function: notify
//
// Called on a schedule (every ~10 minutes) by pg_cron. Each run:
//   1. Sends a push for any inquiry that hasn't been notified yet.
//   2. Once a day (after 8am America/Chicago), sends a morning digest —
//      today's routine focus + any follow-ups that are due or overdue.
//
// Deploy this by pasting it into the Supabase dashboard's Edge Functions
// editor as a function named "notify" — see README.md (Notifications
// section) for the full setup, including the secrets this needs.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;

webpush.setVapidDetails(
  "mailto:bookings@saraluxeglam.com",
  vapidPublic,
  vapidPrivate
);

const supabase = createClient(supabaseUrl, serviceKey);

// Same wording as the app's "shape of your week" (Business tab).
const WEEKLY_ROUTINE: Record<number, { focus: string; note: string } | null> = {
  0: null, // Sunday
  1: {
    focus: "Client promises",
    note:
      "Anything you owe a booked client — folders, timelines, quotes, trials, hold check-ins.",
  },
  2: {
    focus: "Outreach",
    note: "Collab pitches and vendor relationships. Two collabs a month.",
  },
  3: {
    focus: "Content production",
    note: "Edit, caption, schedule. CapCut templates, then batch by mode.",
  },
  4: { focus: "The archive", note: "Website, plus centralising documents." },
  5: {
    focus: "Shoot prep + close",
    note: "Confirm collab logistics, practise the look, close out the week.",
  },
  6: null, // Saturday
};

async function sendToAll(payload: { title: string; body: string; url?: string }) {
  const { data: subs } = await supabase.from("push_subscriptions").select("*");
  if (!subs || !subs.length) return;

  await Promise.all(
    subs.map(async (sub: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
      } catch (e: any) {
        // Gone/expired subscription (uninstalled, permission revoked) — clean it up.
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push failed", sub.id, e);
        }
      }
    })
  );
}

Deno.serve(async () => {
  // ---- 1) New inquiries ----
  const { data: newInquiries } = await supabase
    .from("inquiries")
    .select("id, answers")
    .eq("notified", false);

  if (newInquiries && newInquiries.length) {
    for (const inq of newInquiries) {
      const name = (inq.answers && inq.answers.name) || "Someone";
      await sendToAll({
        title: "New inquiry 🤍",
        body: `${name} just sent an inquiry through your website.`,
        url: "./",
      });
    }
    await supabase
      .from("inquiries")
      .update({ notified: true })
      .in(
        "id",
        newInquiries.map((i: any) => i.id)
      );
  }

  // ---- 2) Once-a-day morning digest ----
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })
  );
  const todayStr = now.toISOString().slice(0, 10);
  const hour = now.getHours();

  const { data: stateRow } = await supabase
    .from("notification_state")
    .select("value")
    .eq("key", "last_digest_date")
    .maybeSingle();
  const alreadySentToday = stateRow?.value === todayStr;

  if (!alreadySentToday && hour >= 8) {
    const { data: clientsRow } = await supabase
      .from("app_state")
      .select("value")
      .eq("key", "slg:clients")
      .maybeSingle();
    const clientsList: any[] = (clientsRow && clientsRow.value) || [];

    const overdue = clientsList.filter((c) => {
      if (!c.nudgeOn || (c.stage ?? 0) >= 3) return false;
      const d = new Date(c.nudgeOn + "T00:00:00");
      return d <= now;
    });

    const routine = WEEKLY_ROUTINE[now.getDay()];
    const parts: string[] = [];
    if (routine) parts.push(`Today: ${routine.focus}.`);
    if (overdue.length)
      parts.push(
        `${overdue.length} follow-up${overdue.length === 1 ? "" : "s"} due: ${overdue
          .map((c) => c.name || "Untitled")
          .join(", ")}.`
      );

    if (parts.length) {
      await sendToAll({
        title: "Good morning 🤍",
        body: parts.join(" "),
        url: "./",
      });
    }

    await supabase
      .from("notification_state")
      .upsert({ key: "last_digest_date", value: todayStr });
  }

  return new Response("ok");
});
