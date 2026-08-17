/* React globals — loaded via CDN <script> tags in index.html, no bundler here. */
const { useState, useEffect, useMemo } = React;

/* ---------------- data helpers ---------------- */

const STAGES = [
  "Inquiry",
  "Pricing sent",
  "Details in",
  "Retainer paid",
  "Balance paid",
  "Done",
];

const DEFAULT_RATES = [
  { id: "p0", name: "Event hair & makeup package", price: 285 },
  { id: "p0b", name: "Event hair, makeup & draping package", price: 360 },
  { id: "p1", name: "Bridal hair & makeup bundle", price: 400 },
  { id: "p1b", name: "Bridal hair, makeup & draping bundle", price: 460 },
  { id: "p3", name: "Half day package", price: 600 },
  { id: "p2", name: "Full day bridal package", price: 1100 },
  { id: "m1", name: "Bridal Muhurtham makeup", price: 275 },
  { id: "m2", name: "Bridal reception makeup", price: 275 },
  { id: "m3", name: "Airbrush makeup", price: 325 },
  { id: "m4", name: "Bridesmaid / special event makeup", price: 120 },
  { id: "m5", name: "Bridal makeup trial", price: 175 },
  { id: "h3", name: "Hairstyle", price: 165 },
  { id: "h4", name: "Bridal Muhurtham hairdo", price: 175 },
  { id: "d2", name: "Saree draping (incl. ironing)", price: 75 },
];

/* Two live threads, seeded so the pipeline isn't empty on day one.
   Rename them once you've got the names in front of you. */
const SEED_CLIENTS = [
  {
    id: "seed-april",
    name: "April 2027 enquiry",
    type: "Bridal",
    occasion: "wedding",
    eventDate: "",
    city: "Austin",
    stage: 1,
    services: {},
    travel: false,
    secondArtistTravel: false,
    trial: false,
    retainerMonth: null,
    nudgeOn: "2026-08-21",
    readyTime: "",
    location: "",
    notes:
      "Quote + contract sent under BRIDAL. She asked whether it falls under special event; I explained the charge follows the look, not the event, and offered to move her. No answer yet — that question is the blocker, not the price.\n\nShe SAID she will confirm. She is pending, not cold. Don't chase.\n\nNo trial offer until she confirms bridal. Even then, April 2027 is ~20 months out — the trial gets scheduled 1-2 months before the date, not at booking.\n\nExact date not given yet.",
  },
  {
    id: "seed-thursday",
    name: "Thursday enquiry (Jul 30)",
    type: "Special event",
    occasion: "",
    eventDate: "",
    city: "Austin",
    stage: 1,
    services: {},
    travel: false,
    secondArtistTravel: false,
    trial: false,
    retainerMonth: null,
    nudgeOn: "2026-08-07",
    readyTime: "",
    location: "",
    notes:
      "Pricing sent Thursday Jul 30. Decision still open: did she never reply at all, or did she give a pending answer?\n\nNever replied → light nudge is fine, late afternoon or early evening.\nSaid she'd get back → leave her alone.\n\nFill in the occasion and date so this stops being a mystery card.",
  },
];

const DEFAULT_SETTINGS = {
  retainerPct: 30,
  balanceLeadDays: 7,
  travelFee: 30,
  travelRadius: 20,
  secondArtistTravel: 30,
  minimumBooking: 250,
  ballparkBridal: "$400",
  ballparkEvent: "$285",
};

const DEFAULT_TEMPLATES = [
  {
    id: "t1",
    name: "\u201CAre you available on…\u201D",
    when: "She gave you a date and nothing else. Confirm, price, ask ONE thing. Never ask for the date back.",
    body: `Hi {name}! Yes, {date} is open 🤍

For one person, makeup and hair together usually runs {ballpark} depending on the look.

What's the occasion, and how many of you are getting ready?`,
  },
  {
    id: "t1b",
    name: "\u201CWhat do you charge for…\u201D",
    when: "Answer the arithmetic yourself. Don't send the price list — she asked you, not a menu.",
    body: `Hi {name}! Happy to help.

[Give the actual number for exactly what she asked. Hair + makeup together is $285. Add draping and it's $360. Makeup alone $120, hairstyle alone $165, draping alone $75.]

Which way are you leaning? Once I know that I'll confirm your exact pricing.`,
  },
  {
    id: "t2",
    name: "She gave you the full brief",
    when: "Date, services, everything. Price it and stop. No retainer, no Venmo, not yet.",
    body: `Hi {name}! Lovely to hear from you, and yes — {date} is free.

Here's your pricing:
{services}
Total: {total}

Travel is included within 20 miles, $30 flat beyond that.

Does that work for you? Happy to jump on a quick call if it's easier to talk through the look.`,
  },
  {
    id: "t2b",
    name: "Fill the last gaps",
    when: "One or two questions at a time, inside the chat. Never a list, never anything she already told you.",
    body: `Perfect, {name}!

Two more things and I can lock your pricing in — where you'll be getting ready, and what time you need to be finished.`,
  },
  {
    id: "t2c",
    name: "\u201CThanks, will let you know\u201D",
    when: "Don't answer with a thumbs up. Leave one small hook and a reason to come back.",
    body: `Of course, {name} — take your time 🤍

If it helps, send me a photo of your outfit or anything you've saved and I'll tell you honestly what look would suit it. No commitment either way.`,
  },
  {
    id: "t3",
    name: "Retainer and hold the date",
    when: "Only after she's said yes to the pricing.",
    body: `So happy we're doing this, {name}! 🤍

Here's everything for {date}:
{services}
Total: {total}

To hold the date it's a {retainerPct} retainer of {retainer} — non-refundable, and it comes off your total. The remaining {balance} is due by {balanceDue}, a week before.

Once the retainer is in, the date is yours and I'll stop taking other inquiries for it.`,
  },
  {
    id: "t4",
    name: "Complimentary trial offer",
    when: "Brides only. Two a month, tied to when the retainer lands.",
    body: `One more thing, {name} — I keep two complimentary trial spots open each month for brides who confirm, and there's still {trialsLeft} for {month}.

If your retainer is in this month, your trial is on me. We'd schedule it closer to the wedding so we have time to play with the look properly.

One thing to mention so there's no confusion later — the trial is something I add on top, not something priced into your package. So if you decide you'd rather skip it, your pricing stays exactly the same.`,
  },
  {
    id: "t5",
    name: "Follow-up — she never replied",
    when: "Light touch. Give her a reason, not a guilt trip.",
    body: `Hi {name}! Floating this back up in case it got buried — I'd still love to be part of your {occasion}.

No rush at all, but {date} is one I'd hate for you to lose if you're still deciding. Happy to answer anything.`,
  },
  {
    id: "t6",
    name: "Follow-up — she said she'd get back",
    when: "She gave you a maybe. Ask what's actually in the way.",
    body: `Hey {name}! No pressure at all, just checking in on the {occasion}.

Have you had a chance to think it over? If anything's holding you up — pricing, timing, services — tell me and we'll figure it out.`,
  },
  {
    id: "t7",
    name: "Balance due reminder",
    when: "Send it a few days ahead of {balanceDue}.",
    body: `Hi {name}! Getting excited for {date} 🤍

Quick note that the remaining {balance} is due by {balanceDue}. Once that's in we're all set, and I'll send over the timeline for the morning.`,
  },
  {
    id: "t8",
    name: "Week-of details",
    when: "Everything she needs so the morning runs on time.",
    body: `{name}! {date} is almost here.

I'll be arriving at {time} to {location}. Come with a clean, moisturized face, and wear something that buttons or zips in the front so we don't disturb the hair and makeup.

Anything you want to go over before then, just message me.`,
  },
  {
    id: "v1",
    kind: "vendor",
    name: "Vendor — team already sorted",
    when: "Outfits, jewellery, anyone lending pieces. Name who's in — it makes it real.",
    body: `Hi! I'm planning a bridal shoot and would love to feature your [outfits / jewellery]!

Are you open to a collaboration? Our team is already locked in:

Model: @[handle]
Photographer: @[handle]

If you're interested, I'd love to drop our mood board in your inbox!`,
  },
  {
    id: "v2",
    kind: "vendor",
    name: "Vendor — team not sorted yet",
    when: "Same ask, earlier. Lead with the concept instead of the line-up.",
    body: `Hi! I'm putting together a bridal shoot and would love to feature your [outfits / jewellery]!

I'm building the team now and wanted to reach out early in case you'd like to be part of it. Everything would be credited and tagged, and you'd get all the images to use.

Happy to send over the mood board if you're interested!`,
  },
  {
    id: "v3",
    kind: "vendor",
    name: "Photographer — shoot pitch",
    when: "You bring the artistry, they bring the camera. Say what's in it for them.",
    body: `Hi! I'm a bridal hair and makeup artist in Austin and I'm planning a shoot — I love your work and would love to collaborate.

I'd be handling hair, makeup and draping. Full creative input on the concept from both sides, and we'd both keep the images.

Would you be interested? Happy to share the mood board.`,
  },
  {
    id: "v4",
    kind: "vendor",
    name: "Model — shoot pitch",
    when: "Short. Tell her the date, the look, and what she gets.",
    body: `Hi! I'm a bridal hair and makeup artist and I'm putting together a shoot — I think you'd be perfect for it.

It'd be [date], around [x] hours, [location]. Full bridal hair and makeup, and you'd get all the images for your portfolio.

Would you be up for it?`,
  },
  {
    id: "v5",
    kind: "vendor",
    name: "Vendor — follow-up",
    when: "One nudge, a week later. If nothing, leave it.",
    body: `Hi! Just floating this back up in case it got buried — still would love to have you involved in the shoot.

No worries at all if it's not the right fit. Happy to keep you in mind for the next one!`,
  },
];


/* ---------------- date + money ---------------- */

const parseDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const fmtDate = (s) => {
  const d = parseDate(s);
  return d
    ? d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
};
const shiftDays = (s, n) => {
  const d = parseDate(s);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
const daysUntil = (s) => {
  const d = parseDate(s);
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((d - t) / 86400000);
};
const money = (n) =>
  "$" + Math.round(Number(n) || 0).toLocaleString("en-US");

/* what this client actually agreed to pay for a service —
   her own figure if one was set, otherwise the current rate */
const priceFor = (c, s) => {
  const o = (c.priceOverrides || {})[s.id];
  return o === undefined || o === "" ? Number(s.price) || 0 : Number(o) || 0;
};
const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthName = (d = new Date()) =>
  d.toLocaleDateString("en-US", { month: "long" });

const shiftMonth = (mk, n) => {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
};
const labelMonth = (mk) => {
  const [y, m] = mk.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
};

/* when the enquiry landed — falls back to when the card was created */
const inquiryOf = (c) => {
  if (c.inquiryDate) return c.inquiryDate;
  const stamp = Number(String(c.id || "").replace(/^c/, ""));
  if (stamp > 1000000000000) return isoOf(new Date(stamp));
  return c.eventDate || "";
};

const weekKey = (d = new Date()) => {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 4 - (t.getDay() || 7));
  const start = new Date(t.getFullYear(), 0, 1);
  const wk = Math.ceil(((t - start) / 86400000 + 1) / 7);
  return `${t.getFullYear()}-W${String(wk).padStart(2, "0")}`;
};

/* one artist's agreed total */
const artistOne = (a) =>
  (Number(a.makeupQty) || 0) * (Number(a.makeupRate) || 0) +
  (Number(a.hairQty) || 0) * (Number(a.hairRate) || 0) +
  (Number(a.travel) || 0);

/* what she owes second artists on a booking */
const artistPayout = (c) =>
  (c.artists || []).reduce(
    (s, a) =>
      s +
      (Number(a.makeupQty) || 0) * (Number(a.makeupRate) || 0) +
      (Number(a.hairQty) || 0) * (Number(a.hairRate) || 0) +
      (Number(a.travel) || 0),
    0
  );

const SPEND_KINDS = [
  "Marketing / ads",
  "Kit & products",
  "Travel",
  "Subscriptions",
  "Education",
  "Other",
];

const WEEK_SHAPE = [
  {
    d: 1,
    day: "Mon",
    focus: "Client promises",
    note: "Anything you owe a booked client — folders, timelines, quotes, trials, hold check-ins.",
  },
  {
    d: 2,
    day: "Tue",
    focus: "Outreach",
    note: "Collab pitches and vendor relationships. Two collabs a month.",
    firm: true,
  },
  {
    d: 3,
    day: "Wed",
    focus: "Content production",
    note: "Edit, caption, schedule. CapCut templates, then batch by mode.",
    firm: true,
  },
  {
    d: 4,
    day: "Thu",
    focus: "The archive",
    note: "Website, plus centralising documents.",
  },
  {
    d: 5,
    day: "Fri",
    focus: "Shoot prep + close",
    note: "Confirm the collab logistics, practise the look, then close out the week.",
  },
];

const DEFAULT_CONTENT = {
  v: 2,
  pillars: [
    {
      id: "cp1",
      name: "Educational",
      note: "Technique, product, the \u201Cwhy\u201D.",
      ideas: [{ id: "ci1", text: "Effortless glam \u2014 why less product photographs better" }],
    },
    {
      id: "cp2",
      name: "Before / after transformation",
      note: "The work.",
      ideas: [],
    },
    {
      id: "cp3",
      name: "Promotional",
      note: "Bookings, classes, offers.",
      ideas: [],
    },
    {
      id: "cp4",
      name: "Founder",
      note: "You as the artist \u2014 opinions, press, decisions, business point of view.",
      ideas: [],
    },
  ],
  aesthetic: [
    "Cream and taupe tones",
    "Minimal on-screen text",
    "Caption-driven storytelling",
    "Five hashtags per post",
  ],
};

/* keep her ideas, refresh the pillar wording, add any pillar she doesn't have yet */
const mergeContent = (saved) => {
  if (!saved || !Array.isArray(saved.pillars)) return DEFAULT_CONTENT;
  if (saved.v === DEFAULT_CONTENT.v) return saved;
  const byId = {};
  saved.pillars.forEach((p) => (byId[p.id] = p));
  const pillars = DEFAULT_CONTENT.pillars.map((d) => ({
    ...d,
    ideas: (byId[d.id] && byId[d.id].ideas) || d.ideas || [],
  }));
  saved.pillars
    .filter((p) => !DEFAULT_CONTENT.pillars.some((d) => d.id === p.id))
    .forEach((p) => pillars.push(p));
  return { ...DEFAULT_CONTENT, ...saved, v: DEFAULT_CONTENT.v, pillars };
};

const VENDOR_KINDS = [
  "Second artist",
  "Photographer",
  "Model",
  "Jewellery provider",
  "Outfit provider",
  "Other",
];

const CLIENT_TYPES = ["Bridal", "Special event", "Class", "Shoot"];

const LOST_REASONS = [
  "Date already booked",
  "Price",
  "Went with someone else",
  "Never replied",
  "Other",
];

const DEFAULT_BIZ = {
  goals: { yearRevenue: 0, yearBookings: 0, monthRevenue: 0, monthBookings: 0 },
  myGoals: [],
  content: DEFAULT_CONTENT,
  vendors: [],
  shoots: [],
  todos: [],
  todoDone: {},
  spend: [],
  routine: {
    weekly: [
      { id: "w1", text: "Reply to every new DM the same day" },
      { id: "w2", text: "Clear the follow-ups that are due" },
      { id: "w3", text: "Batch this week's content — 3 posts, 1 reel" },
      { id: "w4", text: "Check balances coming due" },
      { id: "w5", text: "Clear anything you promised a client" },
    ],
    monthly: [
      { id: "m1", text: "Count inquiries vs bookings — did the ratio move?" },
      { id: "m2", text: "Review ad spend against what it actually booked" },
      { id: "m3", text: "Message one photographer or planner" },
      { id: "m4", text: "Ask last month's brides for a review" },
      { id: "m5", text: "Download a backup" },
    ],
    done: {},
    wk: "",
    mo: "",
  },
};

/* ---------------- storage ---------------- */

const KEYS = {
  clients: "slg:clients",
  rates: "slg:rates:v4",
  templates: "slg:templates:v4",
  gigs: "slg:gigs",
  biz: "slg:biz",
};

/* Cloud storage: backed by Supabase (see cloudStore in index.html) so the
   same data shows up on every device you sign into, instead of the
   Claude-only window.storage API this app was originally written against. */
async function load(key, fallback) {
  try {
    const value = await window.cloudStore.get(key);
    return value === null || value === undefined ? fallback : value;
  } catch (e) {
    console.error("Could not load", key, e);
    return fallback;
  }
}
async function save(key, value) {
  try {
    await window.cloudStore.set(key, value);
  } catch (e) {
    console.error("Could not save", key, e);
  }
}

/* ---------------- app ---------------- */

function SaraLuxeGlamStudio() {
  const [tab, setTab] = useState("pipeline");
  const [ready, setReady] = useState(false);
  const [clients, setClients] = useState([]);
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);
  const [openId, setOpenId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [msgClient, setMsgClient] = useState("");
  const [gigs, setGigs] = useState([]);
  const [biz, setBiz] = useState(DEFAULT_BIZ);

  useEffect(() => {
    (async () => {
      const [c, r, t, g, b] = await Promise.all([
        load(KEYS.clients, SEED_CLIENTS),
        load(KEYS.rates, { services: DEFAULT_RATES, settings: DEFAULT_SETTINGS }),
        load(KEYS.templates, DEFAULT_TEMPLATES),
        load(KEYS.gigs, []),
        load(KEYS.biz, DEFAULT_BIZ),
      ]);
      /* one-time backfill: give any client from before this feature existed
         the same 2-weeks-before checklist new clients get automatically */
      const rawClients = Array.isArray(c) ? c : [];
      let backfilled = false;
      const withPreWedding = rawClients.map((cl) => {
        if (cl.preWeddingTodos !== undefined) return cl;
        backfilled = true;
        return { ...cl, preWeddingTodos: seedPreWeddingTodos() };
      });
      setClients(withPreWedding);
      if (backfilled) save(KEYS.clients, withPreWedding);
      setRates(r.services || DEFAULT_RATES);
      setSettings({ ...DEFAULT_SETTINGS, ...(r.settings || {}) });
      /* keep any wording she's edited, add templates she doesn't have yet */
      const saved = Array.isArray(t) && t.length ? t : [];
      const mergedTemplates = saved.length
        ? [...saved, ...DEFAULT_TEMPLATES.filter((d) => !saved.some((x) => x.id === d.id))]
        : DEFAULT_TEMPLATES;
      setTemplates(mergedTemplates);
      setGigs(Array.isArray(g) ? g : []);

      /* wipe last week's / last month's ticks so the routine starts clean */
      const merged = {
        ...DEFAULT_BIZ,
        ...(b || {}),
        goals: { ...DEFAULT_BIZ.goals, ...((b || {}).goals || {}) },
        content: mergeContent((b || {}).content),
        routine: { ...DEFAULT_BIZ.routine, ...((b || {}).routine || {}) },
      };
      const nowWk = weekKey();
      const nowMo = monthKey();
      const done = { ...(merged.routine.done || {}) };
      const wipe = (x) => {
        delete done[x.id];
        (x.subs || []).forEach((y) => delete done[y.id]);
      };
      if (merged.routine.wk !== nowWk) merged.routine.weekly.forEach(wipe);
      if (merged.routine.mo !== nowMo) merged.routine.monthly.forEach(wipe);
      merged.routine = { ...merged.routine, done, wk: nowWk, mo: nowMo };
      setBiz(merged);
      setReady(true);
    })();
  }, []);

  const writeBiz = (next) => {
    setBiz(next);
    save(KEYS.biz, next);
  };

  const writeGigs = (next) => {
    setGigs(next);
    save(KEYS.gigs, next);
  };

  const writeClients = (next) => {
    setClients(next);
    save(KEYS.clients, next);
  };
  const writeRates = (services, s) => {
    setRates(services);
    setSettings(s);
    save(KEYS.rates, { services, settings: s });
  };
  const writeTemplates = (next) => {
    setTemplates(next);
    save(KEYS.templates, next);
  };

  /* ---- money math ---- */
  const totals = (c) => {
    const agreed = Number(c.agreedTotal) || 0;
    let sum = 0;
    if (agreed > 0) {
      sum = agreed;
    } else {
      Object.entries(c.services || {}).forEach(([id, qty]) => {
        const s = rates.find((r) => r.id === id);
        if (s) sum += priceFor(c, s) * (Number(qty) || 0);
      });
      if (c.travel) sum += Number(settings.travelFee) || 0;
      if (c.secondArtistTravel) sum += Number(settings.secondArtistTravel) || 0;
    }
    const retainer = Math.round((sum * (Number(settings.retainerPct) || 0)) / 100);
    return {
      total: sum,
      agreed: agreed > 0,
      retainer,
      balance: sum - retainer,
      balanceDue: c.eventDate
        ? shiftDays(c.eventDate, -(Number(settings.balanceLeadDays) || 0))
        : "",
    };
  };

  const serviceLines = (c) =>
    Object.entries(c.services || {})
      .map(([id, qty]) => {
        const s = rates.find((r) => r.id === id);
        if (!s || !qty) return null;
        return `• ${s.name}${qty > 1 ? ` ×${qty}` : ""} — ${money(
          priceFor(c, s) * qty
        )}`;
      })
      .filter(Boolean)
      .join("\n");

  /* ---- trial slots ---- */
  const thisMonth = monthKey();
  const trialTaken = clients.filter(
    (c) => c.type === "Bridal" && c.retainerMonth === thisMonth
  ).length;
  const trialOpen = Math.max(0, 2 - trialTaken);

  /* ---- sorting ---- */
  const sorted = useMemo(() => {
    const score = (c) => {
      const nudge = c.nudgeOn ? daysUntil(c.nudgeOn) : 9999;
      /* Only actually-past dates count as overdue — today clears the alert
         the moment you set/update it, not a day later. */
      const overdue = c.stage < 3 && nudge !== null && nudge < 0;
      /* Brand new, not-yet-priced inquiry — surface it right under anything
         overdue so a fresh lead never gets buried under dated bookings.
         Ranked by how recently it came in, newest first — not just by
         list position, which isn't reliable to sort by. */
      const freshInquiry = c.stage === 0 && !c.eventDate;
      const ev = c.eventDate ? daysUntil(c.eventDate) : 99999;
      if (overdue) return -100000;
      if (freshInquiry) {
        const d = inquiryOf(c);
        const t = d ? parseDate(d).getTime() : 0;
        return -90000 - t / 1e11; // more recent inquiryDate → more negative → sorts first
      }
      return ev < 0 ? 90000 : ev;
    };
    return [...clients].sort((a, b) => score(a) - score(b));
  }, [clients]);

  const addClient = (draft) => {
    const c = {
      id: "c" + Date.now(),
      stage: 0,
      services: {},
      travel: false,
      secondArtistTravel: false,
      trial: false,
      retainerMonth: null,
      notes: "",
      todos: [],
      preWeddingTodos: seedPreWeddingTodos(),
      inquiryDate: isoOf(new Date()),
      nudgeOn: isoOf(new Date(Date.now() + 3 * 86400000)),
      readyTime: "",
      location: "",
      ...draft,
    };
    writeClients([...clients, c]);
    setAdding(false);
    setOpenId(c.id);
  };

  const patch = (id, p) =>
    writeClients(
      clients.map((c) => {
        if (c.id !== id) return c;
        const next = { ...c, ...p };
        if (
          p.stage !== undefined &&
          p.stage >= 3 &&
          !next.retainerMonth
        )
          next.retainerMonth = monthKey();
        if (p.stage !== undefined && p.stage < 3) next.retainerMonth = null;
        if (p.stage !== undefined && p.stage >= 4 && !next.balanceMonth)
          next.balanceMonth = monthKey();
        if (p.stage !== undefined && p.stage < 4) next.balanceMonth = null;
        return next;
      })
    );

  if (!ready)
    return (
      <div className="slg-root">
        <style>{CSS}</style>
        <div className="slg-loading">Opening the studio…</div>
      </div>
    );

  return (
    <div className="slg-root">
      <style>{CSS}</style>

      <header className="slg-head">
        <div>
          <div className="slg-eyebrow">Austin · San Antonio</div>
          <h1 className="slg-word">Sara Luxe Glam</h1>
        </div>
        <div className="slg-trial" title="Complimentary bridal trials left this month">
          <div className="slg-trial-dots">
            <span className={trialOpen >= 1 ? "dot open" : "dot"} />
            <span className={trialOpen >= 2 ? "dot open" : "dot"} />
          </div>
          <div className="slg-trial-label">
            {trialOpen} trial{trialOpen === 1 ? "" : "s"} left · {monthName()}
          </div>
        </div>
      </header>

      <nav className="slg-tabs">
        {[
          ["pipeline", "Pipeline"],
          ["bookings", "Bookings"],
          ["messages", "Messages"],
          ["payments", "Payments"],
          ["business", "Business"],
          ["rates", "Rates"],
        ].map(([k, label]) => (
          <button
            key={k}
            className={tab === k ? "slg-tab on" : "slg-tab"}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="slg-main">
        {tab === "pipeline" && (
          <Pipeline
            clients={sorted}
            rates={rates}
            settings={settings}
            totals={totals}
            openId={openId}
            setOpenId={setOpenId}
            patch={patch}
            remove={(id) => writeClients(clients.filter((c) => c.id !== id))}
            adding={adding}
            setAdding={setAdding}
            addClient={addClient}
            trialOpen={trialOpen}
            goMessage={(id) => {
              setMsgClient(id);
              setTab("messages");
            }}
          />
        )}

        {tab === "bookings" && (
          <Bookings
            clients={clients}
            gigs={gigs}
            writeGigs={writeGigs}
            totals={totals}
          />
        )}

        {tab === "messages" && (
          <Messages
            templates={templates}
            writeTemplates={writeTemplates}
            clients={clients}
            msgClient={msgClient}
            setMsgClient={setMsgClient}
            totals={totals}
            serviceLines={serviceLines}
            settings={settings}
            trialOpen={trialOpen}
          />
        )}

        {tab === "payments" && (
          <Payments clients={clients} totals={totals} settings={settings} patch={patch} />
        )}

        {tab === "business" && (
          <Business
            biz={biz}
            writeBiz={writeBiz}
            clients={clients}
            gigs={gigs}
            totals={totals}
          />
        )}

        {tab === "rates" && (
          <>
            <Rates
              rates={rates}
              settings={settings}
              writeRates={writeRates}
            />
            <Backup
              clients={clients}
              gigs={gigs}
              rates={rates}
              settings={settings}
              templates={templates}
              biz={biz}
              restore={(d) => {
                if (Array.isArray(d.clients)) writeClients(d.clients);
                if (Array.isArray(d.gigs)) writeGigs(d.gigs);
                if (d.biz) writeBiz(d.biz);
                if (Array.isArray(d.templates) && d.templates.length)
                  writeTemplates([
                    ...d.templates,
                    ...DEFAULT_TEMPLATES.filter(
                      (x) => !d.templates.some((y) => y.id === x.id)
                    ),
                  ]);
                writeRates(
                  Array.isArray(d.rates) && d.rates.length ? d.rates : rates,
                  { ...DEFAULT_SETTINGS, ...(d.settings || settings) }
                );
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}

/* ---------------- pleat meter ---------------- */

function Pleats({ stage, onSet }) {
  return (
    <div className="pleats" role="group" aria-label="Booking stage">
      {STAGES.map((s, i) => (
        <button
          key={s}
          className={i <= stage ? "pleat on" : "pleat"}
          aria-label={s}
          title={s}
          onClick={(e) => {
            e.stopPropagation();
            onSet(i === stage ? Math.max(0, i - 1) : i);
          }}
        />
      ))}
    </div>
  );
}

/* ---------------- her details, read then edit ---------------- */

function Details({ c, patch }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="sub subrow">
        <span>Her details</span>
        <button className="linkbtn" onClick={() => setEditing(!editing)}>
          {editing ? "Save" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="grid2">
          <Field label="Name">
            <input
              value={c.name || ""}
              placeholder="Her name"
              onChange={(e) => patch(c.id, { name: e.target.value })}
            />
          </Field>
          <Field label="Type">
            <select
              value={c.type || "Bridal"}
              onChange={(e) => patch(c.id, { type: e.target.value })}
            >
              {CLIENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Occasion">
            <input
              value={c.occasion || ""}
              placeholder="wedding, engagement, half saree…"
              onChange={(e) => patch(c.id, { occasion: e.target.value })}
            />
          </Field>
          <Field label="City">
            <select
              value={c.city || "Austin"}
              onChange={(e) => patch(c.id, { city: e.target.value })}
            >
              <option>Austin</option>
              <option>San Antonio</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Phone">
            <input
              value={c.phone || ""}
              placeholder="Her number"
              onChange={(e) => patch(c.id, { phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              value={c.email || ""}
              placeholder="Her email"
              onChange={(e) => patch(c.id, { email: e.target.value })}
            />
          </Field>
        </div>
      ) : (
        <div className="ledger flat">
          <div><span>Name</span><b>{c.name || "—"}</b></div>
          <div><span>Type</span><b>{c.type || "—"}</b></div>
          <div><span>Occasion</span><b>{c.occasion || "—"}</b></div>
          <div><span>City</span><b>{c.city || "—"}</b></div>
          {(c.phone || c.email) && (
            <>
              <div><span>Phone</span><b>{c.phone || "—"}</b></div>
              <div><span>Email</span><b>{c.email || "—"}</b></div>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- second artists ---------------- */

function ArtistLine({ a, label, qtyKey, rateKey, set }) {
  const qty = Number(a[qtyKey]) || 0;
  const rate = Number(a[rateKey]) || 0;
  return (
    <div className={qty ? "aline on" : "aline"}>
      <span className="aline-name">{label}</span>
      <div className="stepper">
        <button onClick={() => set(a.id, qtyKey, Math.max(0, qty - 1))}>–</button>
        <span>{qty}</span>
        <button onClick={() => set(a.id, qtyKey, qty + 1)}>+</button>
      </div>
      <div className="svc-price-in">
        <span>$</span>
        <input
          type="number"
          value={a[rateKey]}
          onChange={(e) => set(a.id, rateKey, e.target.value)}
        />
      </div>
      <span className="aline-sum">{money(qty * rate)}</span>
    </div>
  );
}

function SecondArtists({ c, patch, clientTotal }) {
  const artists = c.artists || [];
  const write = (next) => patch(c.id, { artists: next });
  const set = (id, k, v) =>
    write(artists.map((a) => (a.id === id ? { ...a, [k]: v } : a)));

  const add = () =>
    write([
      ...artists,
      {
        id: "a" + Date.now(),
        name: "",
        makeupQty: 0,
        makeupRate: 70,
        hairQty: 0,
        hairRate: 80,
        travel: 0,
        retainerPaidOn: "",
        balancePaidOn: "",
        note: "",
      },
    ]);

  const payout = (a) =>
    (Number(a.makeupQty) || 0) * (Number(a.makeupRate) || 0) +
    (Number(a.hairQty) || 0) * (Number(a.hairRate) || 0) +
    (Number(a.travel) || 0);

  const totalPayout = artists.reduce((s, a) => s + payout(a), 0);
  const takeaway = (Number(clientTotal) || 0) - totalPayout;

  return (
    <>
      <div className="sub subrow">
        <span>
          Second artist{artists.length > 1 ? "s" : ""}
          {totalPayout > 0 ? ` · ${money(totalPayout)} payout` : ""}
        </span>
        <button className="linkbtn" onClick={add}>+ Add artist</button>
      </div>

      {artists.length === 0 && (
        <div className="hint">
          Only if you're bringing someone in. Your rates start at $70 a makeup
          and $80 a hair service — change either one per artist.
        </div>
      )}

      {artists.map((a, i) => {
        const total = payout(a);
        const retainer = Math.round(total * 0.3);
        return (
          <div key={a.id} className="artist">
            <div className="artist-head">
              <span>Artist {i + 1}</span>
              <button
                className="linkbtn"
                onClick={() => write(artists.filter((x) => x.id !== a.id))}
              >
                Remove
              </button>
            </div>

            <Field label="Name">
              <input
                value={a.name}
                placeholder="Her name"
                onChange={(e) => set(a.id, "name", e.target.value)}
              />
            </Field>

            <div className="alines">
              <ArtistLine a={a} label="Makeup" qtyKey="makeupQty" rateKey="makeupRate" set={set} />
              <ArtistLine a={a} label="Hair service" qtyKey="hairQty" rateKey="hairRate" set={set} />
              <div className={Number(a.travel) ? "aline on" : "aline"}>
                <span className="aline-name">Travel</span>
                <div className="stepper" />
                <div className="svc-price-in">
                  <span>$</span>
                  <input
                    type="number"
                    value={a.travel}
                    onChange={(e) => set(a.id, "travel", e.target.value)}
                  />
                </div>
                <span className="aline-sum">{money(a.travel)}</span>
              </div>
            </div>

            {total > 0 && (
              <div className="ledger">
                <div><span>Her total</span><b>{money(total)}</b></div>
                <div><span>Retainer 30%</span><b>{money(retainer)}</b></div>
                <div>
                  <span>Remaining</span>
                  <b className={a.balancePaidOn ? "" : "owed"}>
                    {money(total - retainer)}
                  </b>
                </div>
              </div>
            )}

            <div className="grid2" style={{ marginTop: 10 }}>
              <Field label="Retainer paid on">
                <input
                  type="date"
                  value={a.retainerPaidOn || ""}
                  onChange={(e) => set(a.id, "retainerPaidOn", e.target.value)}
                />
              </Field>
              <Field label="Balance paid on">
                <input
                  type="date"
                  value={a.balancePaidOn || ""}
                  onChange={(e) => set(a.id, "balancePaidOn", e.target.value)}
                />
              </Field>
              <Field label="Anything else">
                <input
                  value={a.note || ""}
                  placeholder="Call time, kit, who she's doing…"
                  onChange={(e) => set(a.id, "note", e.target.value)}
                />
              </Field>
            </div>
          </div>
        );
      })}

      {artists.length > 0 && (
        <div className="takeaway">
          <div><span>Client pays</span><b>{money(clientTotal)}</b></div>
          <div>
            <span>
              Artist payout{artists.length > 1 ? `s (${artists.length})` : ""}
            </span>
            <b>–{money(totalPayout)}</b>
          </div>
          <div className="takeaway-net">
            <span>My takeaway</span>
            <b className={takeaway < 0 ? "owed" : ""}>{money(takeaway)}</b>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- promised tasks ---------------- */

const QUICK = [
  "Send Pinterest board",
  "Send product links",
  "Send morning timeline",
  "Confirm getting-ready address",
  "Book her trial date",
];

/* Seeded onto every new client. Stays out of the way until 2 weeks
   before her event date, then pops into the main "promised" rollup. */
const TWO_WEEK_TASKS = [
  "Send out timeline",
  "Sort inspo pictures",
  "Follow up for balance",
  "Follow the checklist before the day",
];
const seedPreWeddingTodos = () =>
  TWO_WEEK_TASKS.map((t, i) => ({
    id: "pw" + Date.now() + i,
    text: t,
    done: false,
  }));

function Promised({ c, patch }) {
  const [text, setText] = useState("");
  const todos = c.todos || [];
  const preWedding = c.preWeddingTodos || [];

  const write = (next) => patch(c.id, { todos: next });
  const add = (t) => {
    const v = (t || "").trim();
    if (!v) return;
    write([...todos, { id: "t" + Date.now(), text: v, done: false }]);
    setText("");
  };
  const moveToTwoWeeks = (id) => {
    const item = todos.find((x) => x.id === id);
    if (!item) return;
    patch(c.id, {
      todos: todos.filter((x) => x.id !== id),
      preWeddingTodos: [...preWedding, item],
    });
  };

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <>
      <div className="sub">
        Promised her{open.length ? ` · ${open.length} open` : ""}
      </div>

      {todos.length === 0 && (
        <div className="hint">
          Anything you said you'd send or do. It'll show on her card until it's
          ticked off.
        </div>
      )}

      {[...open, ...done].map((t) => (
        <div key={t.id} className={t.done ? "todo done" : "todo"}>
          <button
            className="todo-tick"
            aria-label={t.done ? "Mark not done" : "Mark done"}
            onClick={() =>
              write(
                todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
              )
            }
          >
            {t.done ? "✓" : ""}
          </button>
          <span className="todo-text">
            <EditText
              value={t.text}
              onSave={(v) =>
                write(todos.map((x) => (x.id === t.id ? { ...x, text: v } : x)))
              }
            />
          </span>
          <button
            className="linkbtn"
            style={{ fontSize: 11 }}
            onClick={() => moveToTwoWeeks(t.id)}
            title="Move to the 2-weeks-before list"
          >
            → 2wk
          </button>
          <button
            className="todo-x"
            aria-label="Remove"
            onClick={() => write(todos.filter((x) => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}

      <div className="todo-add">
        <input
          value={text}
          placeholder="Something you promised her…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add(text);
          }}
        />
        <button className="slg-btn" disabled={!text.trim()} onClick={() => add(text)}>
          Add
        </button>
      </div>

      <div className="quicks">
        {QUICK.filter((q) => !todos.some((t) => t.text === q)).map((q) => (
          <button key={q} className="quick" onClick={() => add(q)}>
            + {q}
          </button>
        ))}
      </div>
    </>
  );
}

function PreWeddingChecklist({ c, patch }) {
  const [text, setText] = useState("");
  const items = c.preWeddingTodos || [];
  const todos = c.todos || [];

  const write = (next) => patch(c.id, { preWeddingTodos: next });
  const add = (t) => {
    const v = (t || "").trim();
    if (!v) return;
    write([...items, { id: "pw" + Date.now(), text: v, done: false }]);
    setText("");
  };
  const moveToNormal = (id) => {
    const item = items.find((x) => x.id === id);
    if (!item) return;
    patch(c.id, {
      preWeddingTodos: items.filter((x) => x.id !== id),
      todos: [...todos, item],
    });
  };

  const dLeft = c.eventDate ? daysUntil(c.eventDate) : null;
  const active = dLeft !== null && dLeft <= 14;
  const open = items.filter((t) => !t.done);
  const done = items.filter((t) => t.done);

  return (
    <>
      <div className="sub">
        2 weeks before her day{open.length ? ` · ${open.length} open` : ""}
      </div>
      <div className="hint">
        {active
          ? "Within 2 weeks now — these are showing in your main promised list too."
          : c.eventDate
          ? `Stays out of the way until 2 weeks before ${fmtDate(c.eventDate)}.`
          : "Stays out of the way until 2 weeks before her event date."}
      </div>

      {items.length === 0 && (
        <div className="hint">Nothing here yet.</div>
      )}

      {[...open, ...done].map((t) => (
        <div key={t.id} className={t.done ? "todo done" : "todo"}>
          <button
            className="todo-tick"
            aria-label={t.done ? "Mark not done" : "Mark done"}
            onClick={() =>
              write(
                items.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x))
              )
            }
          >
            {t.done ? "✓" : ""}
          </button>
          <span className="todo-text">
            <EditText
              value={t.text}
              onSave={(v) =>
                write(items.map((x) => (x.id === t.id ? { ...x, text: v } : x)))
              }
            />
          </span>
          <button
            className="linkbtn"
            style={{ fontSize: 11 }}
            onClick={() => moveToNormal(t.id)}
            title="Move to the normal promised list"
          >
            → normal
          </button>
          <button
            className="todo-x"
            aria-label="Remove"
            onClick={() => write(items.filter((x) => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}

      <div className="todo-add">
        <input
          value={text}
          placeholder="Something for the 2-weeks-out list…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add(text);
          }}
        />
        <button className="slg-btn" disabled={!text.trim()} onClick={() => add(text)}>
          Add
        </button>
      </div>
    </>
  );
}

function TaskRollup({ clients, patch }) {
  const [open, setOpen] = useState(true);
  const items = clients.flatMap((c) => {
    /* Once a client is marked Done or Didn't book, her open tasks drop out
       of this rollup — the relationship's over, no need to keep chasing
       them here. They're still on her own card if you open it. */
    const concluded = c.archived === "lost" || c.archived === "done" || c.stage === 5;
    if (concluded) return [];

    const normal = (c.todos || [])
      .filter((t) => !t.done)
      .map((t) => ({ c, t, key: "todos" }));

    /* The 2-weeks-before list only joins this rollup once it's actually
       within 2 weeks of her event date — not before. */
    const dLeft = c.eventDate ? daysUntil(c.eventDate) : null;
    const withinTwoWeeks = dLeft !== null && dLeft <= 14;
    const preWedding = withinTwoWeeks
      ? (c.preWeddingTodos || [])
          .filter((t) => !t.done)
          .map((t) => ({ c, t, key: "preWeddingTodos" }))
      : [];

    return [...normal, ...preWedding];
  });
  if (items.length === 0) return null;

  return (
    <div className="rollup">
      <button className="rollup-head" onClick={() => setOpen(!open)}>
        <span>
          {items.length} thing{items.length === 1 ? "" : "s"} you promised
        </span>
        <span className="rollup-caret">{open ? "–" : "+"}</span>
      </button>
      {open &&
        items.map(({ c, t, key }) => (
          <div key={c.id + t.id} className="todo">
            <button
              className="todo-tick"
              aria-label="Mark done"
              onClick={() =>
                patch(c.id, {
                  [key]: (c[key] || []).map((x) =>
                    x.id === t.id ? { ...x, done: true } : x
                  ),
                })
              }
            />
            <span className="todo-text">
              <b>{c.name}</b> — {t.text}
            </span>
          </div>
        ))}
    </div>
  );
}

/* ---------------- pipeline ---------------- */

function Pipeline({
  clients, rates, settings, totals, openId, setOpenId, patch, remove,
  adding, setAdding, addClient, trialOpen, goMessage,
}) {
  const [filter, setFilter] = useState("active");
  const bucket = (c) =>
    c.archived === "lost" ? "lost" : c.archived === "done" || c.stage === 5 ? "done" : "active";
  const counts = {
    active: clients.filter((c) => bucket(c) === "active").length,
    done: clients.filter((c) => bucket(c) === "done").length,
    lost: clients.filter((c) => bucket(c) === "lost").length,
  };
  const shown = clients.filter((c) => bucket(c) === filter);

  return (
    <>
      {filter === "active" && <TaskRollup clients={clients} patch={patch} />}

      <div className="tpl-list">
        {[
          ["active", "Active", counts.active],
          ["done", "Done", counts.done],
          ["lost", "Didn't book", counts.lost],
        ].map(([k, label, n]) => (
          <button
            key={k}
            className={filter === k ? "tpl on" : "tpl"}
            onClick={() => setFilter(k)}
          >
            {label} {n > 0 && <span className="tplnum">{n}</span>}
          </button>
        ))}
      </div>

      <div className="slg-bar">
        <span className="slg-count">
          {shown.length} {shown.length === 1 ? "client" : "clients"}
        </span>
        <button className="slg-btn" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "Add a client"}
        </button>
      </div>

      {adding && <AddForm onAdd={addClient} />}

      {shown.length === 0 && !adding && (
        <div className="slg-empty">
          <p>
            {filter === "active"
              ? "Nobody live right now."
              : filter === "done"
              ? "Nothing finished yet."
              : "Nothing here."}
          </p>
          <p className="quiet">
            {filter === "active"
              ? "Add the next enquiry that lands and it'll start tracking its own follow-ups."
              : filter === "done"
              ? "Bookings you've completed will collect here."
              : "Enquiries that never turned into a booking live here. They still count in your monthly numbers."}
          </p>
        </div>
      )}

      {shown.map((c) => {
        const t = totals(c);
        const nudge = c.nudgeOn ? daysUntil(c.nudgeOn) : null;
        const overdue = c.stage < 3 && nudge !== null && nudge < 0;
        const dLeft = c.eventDate ? daysUntil(c.eventDate) : null;
        const open = openId === c.id;
        return (
          <article
            key={c.id}
            className={overdue ? "card flag" : "card"}
            onClick={() => setOpenId(open ? null : c.id)}
          >
            <div className="card-top">
              <div className="card-id">
                <h3>
                  {c.name || "Untitled"}
                  {c.type === "Bridal" && c.trial && (
                    <span className="tag gold">trial included</span>
                  )}
                </h3>
                <div className="card-sub">
                  {c.occasion || c.type}
                  {c.eventDate && <> · {fmtDate(c.eventDate)}</>}
                  {c.city && <> · {c.city}</>}
                </div>
              </div>
              <div className="card-right">
                <Pleats stage={c.stage} onSet={(s) => patch(c.id, { stage: s })} />
                <div className="stage-name">{STAGES[c.stage]}</div>
              </div>
            </div>

            <div className="card-strip">
              {dLeft !== null && (
                <span className="chip">
                  {dLeft > 0 ? `${dLeft} days out` : dLeft === 0 ? "today" : "past"}
                </span>
              )}
              {t.total > 0 && <span className="chip">{money(t.total)}</span>}
              {(c.todos || []).some((x) => !x.done) && (
                <span className="chip todo-chip">
                  {(c.todos || []).filter((x) => !x.done).length} to do
                </span>
              )}
              {overdue ? (
                <span className="chip alert">follow up now</span>
              ) : (
                nudge !== null &&
                c.stage < 3 && <span className="chip">nudge in {nudge}d</span>
              )}
              {c.archived === "lost" && c.lostReason && (
                <span className="chip">{c.lostReason}</span>
              )}
            </div>

            {open && (
              <div className="card-open" onClick={(e) => e.stopPropagation()}>
                <Details c={c} patch={patch} />

                <div className="sub">Dates & logistics</div>
                <div className="grid2">
                  <Field label="Event date">
                    <input
                      type="date"
                      value={c.eventDate || ""}
                      onChange={(e) => patch(c.id, { eventDate: e.target.value })}
                    />
                  </Field>
                  <Field label="Enquiry came in">
                    <input
                      type="date"
                      value={inquiryOf(c)}
                      onChange={(e) => patch(c.id, { inquiryDate: e.target.value })}
                    />
                  </Field>
                  {c.stage >= 3 && (
                    <Field label="Retainer paid in">
                      <input
                        type="month"
                        value={c.retainerMonth || ""}
                        onChange={(e) =>
                          patch(c.id, { retainerMonth: e.target.value })
                        }
                      />
                    </Field>
                  )}
                  {c.stage >= 4 && (
                    <Field label="Balance paid in">
                      <input
                        type="month"
                        value={c.balanceMonth || ""}
                        onChange={(e) =>
                          patch(c.id, { balanceMonth: e.target.value })
                        }
                      />
                    </Field>
                  )}
                  <Field label="Follow up on">
                    <input
                      type="date"
                      value={c.nudgeOn || ""}
                      onChange={(e) => patch(c.id, { nudgeOn: e.target.value })}
                    />
                  </Field>
                  <Field label="Ready by">
                    <input
                      type="time"
                      value={c.readyTime || ""}
                      onChange={(e) => patch(c.id, { readyTime: e.target.value })}
                    />
                  </Field>
                  <Field label="Getting ready at">
                    <input
                      value={c.location || ""}
                      placeholder="Hotel, address…"
                      onChange={(e) => patch(c.id, { location: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="sub">Services</div>
                <div className="svc">
                  {rates.map((s) => {
                    const qty = (c.services || {})[s.id] || 0;
                    const custom =
                      (c.priceOverrides || {})[s.id] !== undefined &&
                      (c.priceOverrides || {})[s.id] !== "" &&
                      Number((c.priceOverrides || {})[s.id]) !== Number(s.price);
                    return (
                      <div key={s.id} className={qty ? "svc-row on" : "svc-row"}>
                        <span className="svc-name">
                          {s.name}
                          {custom && <span className="tag gold">agreed</span>}
                        </span>
                        <div className="svc-price-in">
                          <span>$</span>
                          <input
                            type="number"
                            value={
                              (c.priceOverrides || {})[s.id] === undefined
                                ? s.price
                                : (c.priceOverrides || {})[s.id]
                            }
                            title="What she agreed to pay — edit for past bookings"
                            onChange={(e) =>
                              patch(c.id, {
                                priceOverrides: {
                                  ...(c.priceOverrides || {}),
                                  [s.id]: e.target.value,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="stepper">
                          <button
                            onClick={() =>
                              patch(c.id, {
                                services: { ...c.services, [s.id]: Math.max(0, qty - 1) },
                              })
                            }
                          >
                            –
                          </button>
                          <span>{qty}</span>
                          <button
                            onClick={() =>
                              patch(c.id, {
                                services: { ...c.services, [s.id]: qty + 1 },
                              })
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="toggles">
                  <Toggle
                    on={c.travel}
                    onClick={() => patch(c.id, { travel: !c.travel })}
                    label={`Beyond ${settings.travelRadius} mi (${money(settings.travelFee)})`}
                  />
                  <Toggle
                    on={c.secondArtistTravel}
                    onClick={() =>
                      patch(c.id, { secondArtistTravel: !c.secondArtistTravel })
                    }
                    label={`Second artist travel (${money(settings.secondArtistTravel)})`}
                  />
                  {c.type === "Bridal" && (
                    <Toggle
                      on={c.trial}
                      onClick={() => patch(c.id, { trial: !c.trial })}
                      label={
                        c.trial
                          ? "Complimentary trial promised"
                          : trialOpen > 0
                          ? `Give a trial (${trialOpen} left)`
                          : "Give a trial (month is full)"
                      }
                    />
                  )}
                </div>

                <div className="sub">Agreed total</div>
                <div className="hint">
                  Only if you agreed one flat number. Leave blank and the total
                  adds up from the prices above — which is usually what you want,
                  since that keeps her itemised breakdown accurate.
                </div>
                <div className="price-in wide-price">
                  <span>$</span>
                  <input
                    type="number"
                    value={c.agreedTotal || ""}
                    placeholder="Only if you agreed a different price"
                    onChange={(e) =>
                      patch(c.id, { agreedTotal: e.target.value })
                    }
                  />
                </div>

                <div className="ledger">
                  <div>
                    <span>Total{t.agreed ? " (agreed)" : ""}</span>
                    <b>{money(t.total)}</b>
                  </div>
                  <div>
                    <span>Retainer {settings.retainerPct}%</span>
                    <b>{money(t.retainer)}</b>
                  </div>
                  <div>
                    <span>Balance{t.balanceDue ? ` by ${fmtDate(t.balanceDue)}` : ""}</span>
                    <b>{money(t.balance)}</b>
                  </div>
                </div>

                <SecondArtists c={c} patch={patch} clientTotal={t.total} />

                <Promised c={c} patch={patch} />

                <PreWeddingChecklist c={c} patch={patch} />

                <div className="sub">Notes</div>
                <textarea
                  rows={3}
                  value={c.notes || ""}
                  placeholder="What she said, what she's unsure about, inspo she sent…"
                  onChange={(e) => patch(c.id, { notes: e.target.value })}
                />

                {bucket(c) === "lost" && (
                  <>
                    <div className="sub">Why didn't she book?</div>
                    <div className="hint">
                      Still counts toward your inquiry totals — this is just
                      for tracking patterns over time.
                    </div>
                    <Field label="Reason">
                      <select
                        value={c.lostReason || ""}
                        onChange={(e) => patch(c.id, { lostReason: e.target.value })}
                      >
                        <option value="">— pick one —</option>
                        {LOST_REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}

                <div className="card-actions">
                  <button className="slg-btn" onClick={() => goMessage(c.id)}>
                    Write her a message
                  </button>
                  {bucket(c) === "active" ? (
                    <>
                      <button
                        className="slg-btn ghost"
                        onClick={() => patch(c.id, { archived: "done" })}
                      >
                        Mark done
                      </button>
                      <button
                        className="slg-btn ghost"
                        onClick={() => patch(c.id, { archived: "lost" })}
                      >
                        Didn't book
                      </button>
                    </>
                  ) : (
                    <button
                      className="slg-btn ghost"
                      onClick={() => patch(c.id, { archived: null })}
                    >
                      Back to active
                    </button>
                  )}
                  <button className="slg-btn ghost" onClick={() => remove(c.id)}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ on, onClick, label }) {
  return (
    <button className={on ? "toggle on" : "toggle"} onClick={onClick}>
      <i /> {label}
    </button>
  );
}

function AddForm({ onAdd }) {
  const [f, setF] = useState({
    name: "",
    type: "Bridal",
    occasion: "wedding",
    eventDate: "",
    city: "Austin",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <div className="addform">
      <div className="grid2">
        <Field label="Name">
          <input
            value={f.name}
            placeholder="Her name"
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Type">
          <select value={f.type} onChange={(e) => set("type", e.target.value)}>
            {CLIENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Occasion">
          <input
            value={f.occasion}
            placeholder="wedding, engagement, half saree…"
            onChange={(e) => set("occasion", e.target.value)}
          />
        </Field>
        <Field label="Event date">
          <input
            type="date"
            value={f.eventDate}
            onChange={(e) => set("eventDate", e.target.value)}
          />
        </Field>
        <Field label="City">
          <select value={f.city} onChange={(e) => set("city", e.target.value)}>
            <option>Austin</option>
            <option>San Antonio</option>
            <option>Other</option>
          </select>
        </Field>
      </div>
      <button
        className="slg-btn"
        disabled={!f.name.trim()}
        onClick={() => onAdd(f)}
      >
        Add to pipeline
      </button>
    </div>
  );
}

/* ---------------- bookings by month ---------------- */

function Bookings({ clients, gigs, writeGigs, totals }) {
  const [offset, setOffset] = useState(0);
  const [adding, setAdding] = useState(false);
  const [g, setG] = useState({ artist: "", date: "", note: "" });

  const viewed = new Date();
  viewed.setDate(1);
  viewed.setMonth(viewed.getMonth() + offset);
  const key = monthKey(viewed);
  const heading = viewed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const mine = clients
    .filter(
      (c) => c.eventDate && c.eventDate.slice(0, 7) === key && c.archived !== "lost"
    )
    .map((c) => ({
      id: c.id,
      date: c.eventDate,
      name: c.name,
      sub: [c.occasion || c.type, c.city].filter(Boolean).join(" · "),
      confirmed: c.stage >= 3,
      stage: STAGES[c.stage],
      money: totals(c).total,
      own: true,
    }));

  const theirs = gigs
    .filter((x) => x.date && x.date.slice(0, 7) === key)
    .map((x) => ({
      id: x.id,
      date: x.date,
      name: x.artist,
      sub: x.note || "",
      confirmed: true,
      own: false,
    }));

  const all = [...mine, ...theirs].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const confirmed = all.filter((x) => x.confirmed).length;
  const pending = all.length - confirmed;
  const ownRevenue = mine
    .filter((x) => x.confirmed)
    .reduce((s, x) => s + x.money, 0);

  const addGig = () => {
    if (!g.artist.trim() || !g.date) return;
    writeGigs([...gigs, { id: "g" + Date.now(), ...g }]);
    setG({ artist: "", date: "", note: "" });
    setAdding(false);
  };

  return (
    <>
      <div className="monthbar">
        <button className="slg-btn ghost tiny" onClick={() => setOffset(offset - 1)}>
          ‹
        </button>
        <div className="monthname">{heading}</div>
        <button className="slg-btn ghost tiny" onClick={() => setOffset(offset + 1)}>
          ›
        </button>
        {offset !== 0 && (
          <button className="slg-btn ghost tiny" onClick={() => setOffset(0)}>
            today
          </button>
        )}
      </div>

      <div className="stats">
        <div className="stat">
          <b>{confirmed}</b>
          <span>
            confirmed booking{confirmed === 1 ? "" : "s"}
            {pending ? ` · ${pending} not yet` : ""}
          </span>
        </div>
        <div className="stat">
          <b>{money(ownRevenue)}</b>
          <span>from your own confirmed bookings</span>
        </div>
      </div>

      <div className="slg-bar">
        <span className="slg-count">
          {all.length} date{all.length === 1 ? "" : "s"} in {heading.split(" ")[0]}
        </span>
        <button className="slg-btn" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "Add other artist booking"}
        </button>
      </div>

      {adding && (
        <div className="addform">
          <div className="grid2">
            <Field label="Artist you're working for">
              <input
                value={g.artist}
                placeholder="Her name or studio"
                onChange={(e) => setG({ ...g, artist: e.target.value })}
              />
            </Field>
            <Field label="Date booked">
              <input
                type="date"
                value={g.date}
                onChange={(e) => setG({ ...g, date: e.target.value })}
              />
            </Field>
            <Field label="Note (optional)">
              <input
                value={g.note}
                placeholder="Bride, venue, call time…"
                onChange={(e) => setG({ ...g, note: e.target.value })}
              />
            </Field>
          </div>
          <button
            className="slg-btn"
            disabled={!g.artist.trim() || !g.date}
            onClick={addGig}
          >
            Add to {heading.split(" ")[0]}
          </button>
        </div>
      )}

      {all.length === 0 && (
        <div className="slg-empty">
          <p>Nothing on the books for {heading}.</p>
          <p className="quiet">
            Your own clients appear here as soon as they have an event date.
          </p>
        </div>
      )}

      {all.map((x) => {
        const d = parseDate(x.date);
        return (
          <div key={(x.own ? "c" : "g") + x.id} className="row">
            <div className="daybox">
              <b>{d ? d.getDate() : "—"}</b>
              <span>
                {d ? d.toLocaleDateString("en-US", { weekday: "short" }) : ""}
              </span>
            </div>
            <div className="row-main">
              <b>{x.name}</b>
              {x.sub && <div className="quiet">{x.sub}</div>}
            </div>
            <div className="row-right">
              {x.own ? (
                <>
                  {x.money > 0 && <b>{money(x.money)}</b>}
                  <span className={x.confirmed ? "quiet" : "chip alert"}>
                    {x.confirmed ? x.stage : "not confirmed"}
                  </span>
                </>
              ) : (
                <span className="chip">other artist</span>
              )}
            </div>
            {!x.own && (
              <button
                className="paybtn"
                onClick={() => writeGigs(gigs.filter((y) => y.id !== x.id))}
              >
                Remove
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ---------------- messages ---------------- */

function Messages({
  templates, writeTemplates, clients, msgClient, setMsgClient,
  totals, serviceLines, settings, trialOpen,
}) {
  const [sel, setSel] = useState(null);
  const [copied, setCopied] = useState(null);
  const [editing, setEditing] = useState(false);

  const c = clients.find((x) => x.id === msgClient);
  const mode = msgClient === "v:any" ? "vendor" : "client";
  const shown = templates.filter((t) =>
    mode === "vendor" ? t.kind === "vendor" : t.kind !== "vendor"
  );
  const tpl = shown.find((t) => t.id === sel) || shown[0];

  const fill = (body) => {
    if (mode === "vendor") return body;
    if (!c) return body;
    const t = totals(c);
    const map = {
      "{name}": c.name || "",
      "{occasion}": c.occasion || (c.type === "Bridal" ? "wedding" : "event"),
      "{date}": fmtDate(c.eventDate) || "your date",
      "{time}": c.readyTime || "your ready time",
      "{location}": c.location || "your venue",
      "{services}": serviceLines(c) || "—",
      "{total}": money(t.total),
      "{retainer}": money(t.retainer),
      "{retainerPct}": `${settings.retainerPct}%`,
      "{balance}": money(t.balance),
      "{balanceDue}": fmtDate(t.balanceDue) || "a week before",
      "{month}": monthName(),
      "{trialsLeft}":
        trialOpen === 1 ? "one spot" : trialOpen > 1 ? `${trialOpen} spots` : "no spots left",
      "{ballpark}":
        (c.type === "Bridal" ? settings.ballparkBridal : settings.ballparkEvent) ||
        "—set this in Rates—",
    };
    return Object.entries(map).reduce(
      (s, [k, v]) => s.split(k).join(v),
      body
    );
  };

  const text = tpl ? fill(tpl.body) : "";

  const copy = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { console.error(e); }
    document.body.removeChild(ta);
    setCopied(true);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <>
      <div className="pickrow">
        <label className="field wide">
          <span>Writing to</span>
          <select
            value={msgClient}
            onChange={(e) => {
              setMsgClient(e.target.value);
              setSel(null);
            }}
          >
            <option value="">Nobody — show the blank version</option>
            <optgroup label="Clients">
              {clients.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {STAGES[x.stage]}
                </option>
              ))}
            </optgroup>
            <option value="v:any">Vendor — collaboration</option>
          </select>
        </label>
      </div>

      <div className="tpl-list">
        {shown.map((t) => (
          <button
            key={t.id}
            className={t.id === sel ? "tpl on" : "tpl"}
            onClick={() => { setSel(t.id); setEditing(false); }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {tpl && (
        <div className="tpl-panel">
          <div className="tpl-when">{tpl.when}</div>
          {editing ? (
            <textarea
              rows={12}
              value={tpl.body}
              onChange={(e) =>
                writeTemplates(
                  templates.map((t) =>
                    t.id === tpl.id ? { ...t, body: e.target.value } : t
                  )
                )
              }
            />
          ) : (
            <pre className="tpl-body">{text}</pre>
          )}
          <div className="card-actions">
            <button className="slg-btn" onClick={copy} disabled={editing}>
              {copied ? "Copied" : "Copy message"}
            </button>
            <button className="slg-btn ghost" onClick={() => setEditing(!editing)}>
              {editing ? "Done editing" : "Edit wording"}
            </button>
          </div>
          {editing && (
            <div className="hint">
              Fields that fill themselves: {"{name} {occasion} {date} {time} {location} {services} {total} {retainer} {retainerPct} {balance} {balanceDue} {month} {trialsLeft} {ballpark}"}
            </div>
          )}
          {!c && (
            <div className="hint">
              {mode === "vendor"
                ? "Square brackets are yours to fill in — these don't auto-fill."
                : "Pick someone above and the blanks fill in with her real numbers."}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------- payments ---------------- */

function PayBtn({ id, stage, label, pending, setPending, patch }) {
  const token = id + ":" + stage;
  const armed = pending === token;
  return (
    <button
      className={armed ? "paybtn armed" : "paybtn"}
      onClick={() => {
        if (armed) {
          patch(id, { stage });
          setPending(null);
        } else {
          setPending(token);
          setTimeout(() => setPending((p) => (p === token ? null : p)), 4000);
        }
      }}
    >
      {armed ? "Tap again to confirm" : label}
    </button>
  );
}

function Payments({ clients, totals, settings, patch }) {
  const [pending, setPending] = useState(null);

  const rows = clients
    .map((c) => ({ c, t: totals(c) }))
    .filter(({ c }) => c.eventDate && c.stage < 5 && c.archived !== "lost")
    .sort((a, b) => (a.c.eventDate < b.c.eventDate ? -1 : 1));

  const awaitingRetainer = rows.filter(({ c }) => c.stage < 3);
  const awaitingBalance = rows.filter(({ c }) => c.stage === 3);

  const sum = (arr, k) => arr.reduce((s, r) => s + r.t[k], 0);

  return (
    <>
      <div className="stats">
        <div className="stat">
          <b>{money(sum(awaitingRetainer, "retainer"))}</b>
          <span>retainers not in yet</span>
        </div>
        <div className="stat">
          <b>{money(sum(awaitingBalance, "balance"))}</b>
          <span>balances still owed</span>
        </div>
      </div>

      <div className="sub">Balances coming due</div>
      {awaitingBalance.length === 0 && (
        <div className="slg-empty"><p className="quiet">Nothing outstanding.</p></div>
      )}
      {awaitingBalance.map(({ c, t }) => {
        const d = daysUntil(t.balanceDue);
        return (
          <div key={c.id} className={d !== null && d <= 3 ? "row soon" : "row"}>
            <div className="row-main">
              <b>{c.name}</b>
              <span className="quiet"> · {fmtDate(c.eventDate)}</span>
            </div>
            <div className="row-right">
              <b>{money(t.balance)}</b>
              <span className="quiet">
                due {fmtDate(t.balanceDue)}
                {d !== null && d <= 7 ? ` · ${d}d` : ""}
              </span>
            </div>
            <PayBtn id={c.id} stage={4} label="Balance received" pending={pending} setPending={setPending} patch={patch} />
          </div>
        );
      })}

      <div className="sub">Waiting on a retainer</div>
      {awaitingRetainer.length === 0 && (
        <div className="slg-empty"><p className="quiet">Everyone's confirmed.</p></div>
      )}
      {awaitingRetainer.map(({ c, t }) => (
        <div key={c.id} className="row">
          <div className="row-main">
            <b>{c.name}</b>
            <span className="quiet"> · {STAGES[c.stage]}</span>
          </div>
          <div className="row-right">
            <b>{money(t.retainer)}</b>
            <span className="quiet">{fmtDate(c.eventDate)}</span>
          </div>
          <PayBtn id={c.id} stage={3} label="Retainer received" pending={pending} setPending={setPending} patch={patch} />
        </div>
      ))}

      {clients.some((c) => !c.eventDate) && (
        <div className="hint" style={{ marginTop: 14 }}>
          Clients without an event date don't show here — the balance due date is
          worked out from it.
        </div>
      )}
    </>
  );
}

/* ---------------- business: goals, money, routine ---------------- */

function Bar({ have, goal }) {
  const pct = goal > 0 ? Math.min(100, Math.round((have / goal) * 100)) : 0;
  return (
    <div className="bar" title={`${pct}%`}>
      <div className="bar-fill" style={{ width: pct + "%" }} />
    </div>
  );
}

function ShootCard({ s, patchShoot, onRemove, vendors }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(VENDOR_KINDS[0]);
  const people = s.people || [];
  const log = s.log || [];
  const inCount = people.filter((p) => p.confirmed).length;

  return (
    <article className={s.done ? "shoot done" : "shoot"} >
      <div className="shoot-top" onClick={() => setOpen(!open)}>
        <div>
          <h4>{s.title}</h4>
          <div className="card-sub">
            {s.date ? fmtDate(s.date) : "no date yet"}
            {people.length > 0 && (
              <> · {inCount}/{people.length} confirmed</>
            )}
            {(s.todos || []).filter((t) => !t.done).length > 0 && (
              <> · {(s.todos || []).filter((t) => !t.done).length} to do</>
            )}
          </div>
        </div>
        <span className={s.done ? "chip" : "chip alert"}>
          {s.done ? "done" : "in progress"}
        </span>
      </div>

      {open && (
        <div className="shoot-open" onClick={(e) => e.stopPropagation()}>
          <div className="grid2">
            <Field label="What it's called">
              <input
                value={s.title}
                onChange={(e) => patchShoot(s.id, { title: e.target.value })}
              />
            </Field>
            <Field label="Shoot date">
              <input
                type="date"
                value={s.date || ""}
                onChange={(e) => patchShoot(s.id, { date: e.target.value })}
              />
            </Field>
          </div>

          <div className="sub">Who's involved</div>
          <div className="hint">
            Everyone you've reached out to. Tick them once they're in.
          </div>
          {VENDOR_KINDS.map((k) => {
            const group = people.filter((p) => (p.kind || "Other") === k);
            if (group.length === 0) return null;
            return (
              <div key={k} className="pgroup">
                <div className="pgroup-kind">{k}</div>
                {group.map((p) => (
                  <div key={p.id} className={p.confirmed ? "todo done" : "todo"}>
                    <button
                      className="todo-tick"
                      onClick={() =>
                        patchShoot(s.id, {
                          people: people.map((x) =>
                            x.id === p.id ? { ...x, confirmed: !x.confirmed } : x
                          ),
                        })
                      }
                    >
                      {p.confirmed ? "✓" : ""}
                    </button>
                    <span className="todo-text">
                      <EditText
                        value={p.name}
                        onSave={(t) =>
                          patchShoot(s.id, {
                            people: people.map((x) =>
                              x.id === p.id ? { ...x, name: t } : x
                            ),
                          })
                        }
                      />
                    </span>
                    <button
                      className="todo-x"
                      onClick={() =>
                        patchShoot(s.id, {
                          people: people.filter((x) => x.id !== p.id),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          <div className="addperson">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {VENDOR_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <AddLine
              small
              placeholder="Their name…"
              onAdd={(t) =>
                patchShoot(s.id, {
                  people: [
                    ...people,
                    { id: "sp" + Date.now(), name: t, kind, confirmed: false },
                  ],
                })
              }
            />
          </div>

          {(vendors || []).filter(
            (v) => !v.blocked && !people.some((p) => p.name === v.name)
          ).length > 0 && (
            <div className="quicks">
              {(vendors || [])
                .filter((v) => !v.blocked && !people.some((p) => p.name === v.name))
                .map((v) => (
                  <button
                    key={v.id}
                    className="quick"
                    onClick={() =>
                      patchShoot(s.id, {
                        people: [
                          ...people,
                          {
                            id: "sp" + Date.now(),
                            name: v.name,
                            kind: v.kind,
                            confirmed: false,
                          },
                        ],
                      })
                    }
                  >
                    + {v.name}
                  </button>
                ))}
            </div>
          )}

          <div className="sub">Still to do</div>
          {(s.todos || []).length === 0 && (
            <div className="hint">
              These also show in your business to-do list, so nothing gets lost
              between here and there.
            </div>
          )}
          {(s.todos || []).map((t) => (
            <div key={t.id} className={t.done ? "todo done" : "todo"}>
              <button
                className="todo-tick"
                onClick={() =>
                  patchShoot(s.id, {
                    todos: (s.todos || []).map((x) =>
                      x.id === t.id ? { ...x, done: !x.done } : x
                    ),
                  })
                }
              >
                {t.done ? "✓" : ""}
              </button>
              <span className="todo-text">
                <EditText
                  value={t.text}
                  onSave={(v) =>
                    patchShoot(s.id, {
                      todos: (s.todos || []).map((x) =>
                        x.id === t.id ? { ...x, text: v } : x
                      ),
                    })
                  }
                />
              </span>
              <button
                className="todo-x"
                onClick={() =>
                  patchShoot(s.id, {
                    todos: (s.todos || []).filter((x) => x.id !== t.id),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
          <AddLine
            small
            placeholder="Book the studio, send the moodboard…"
            onAdd={(t) =>
              patchShoot(s.id, {
                todos: [...(s.todos || []), { id: "st" + Date.now(), text: t, done: false }],
              })
            }
          />

          <div className="sub">What's happened so far</div>
          {log.length === 0 && (
            <div className="hint">
              Every note gets today's date, so you can see how a shoot actually
              came together.
            </div>
          )}
          {[...log].reverse().map((l) => (
            <div key={l.id} className="logline">
              <span className="logdate">{fmtDate(l.at)}</span>
              <span className="logtext">
                <EditText
                  value={l.text}
                  onSave={(t) =>
                    patchShoot(s.id, {
                      log: log.map((x) => (x.id === l.id ? { ...x, text: t } : x)),
                    })
                  }
                />
              </span>
              <button
                className="todo-x"
                onClick={() =>
                  patchShoot(s.id, { log: log.filter((x) => x.id !== l.id) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <AddLine
            small
            placeholder="Booked the studio, sent the moodboard…"
            onAdd={(t) =>
              patchShoot(s.id, {
                log: [...log, { id: "sl" + Date.now(), at: isoOf(new Date()), text: t }],
              })
            }
          />

          <div className="sub">Notes</div>
          <textarea
            rows={3}
            value={s.notes || ""}
            placeholder="Concept, location, looks, what you want out of it…"
            onChange={(e) => patchShoot(s.id, { notes: e.target.value })}
          />

          <div className="card-actions">
            <button
              className="slg-btn"
              onClick={() => patchShoot(s.id, { done: !s.done })}
            >
              {s.done ? "Reopen" : "Mark complete"}
            </button>
            <button className="slg-btn ghost" onClick={() => onRemove(s.id)}>
              Remove
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function VendorCard({ v, onRemove, onBlock }) {
  return (
    <div className={v.blocked ? "vendor blocked" : "vendor"}>
      <div className="vendor-head">
        <b>
          {v.name}
          {v.blocked && <span className="vkind">{v.kind}</span>}
        </b>
        <span className="vendor-acts">
          <button className="linkbtn" onClick={() => onBlock(v.id)}>
            {v.blocked ? "Restore" : "Don't contact"}
          </button>
          <button className="todo-x" onClick={() => onRemove(v.id)}>×</button>
        </span>
      </div>
      {v.link && (
        <a className="vendor-link" href={v.link} target="_blank" rel="noreferrer">
          {v.link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      )}
      {v.contact && <div className="vendor-line">{v.contact}</div>}
      {v.note && <div className="vendor-note">{v.note}</div>}
    </div>
  );
}

function Pillar({ p, onAdd, onToggle, onRemove, onRename, onDrop, thisMonth }) {
  const ideas = p.ideas || [];
  const waiting = ideas.filter((i) => !i.postedOn);
  return (
    <div className="pillar">
      <div className="pillar-head">
        <b>{p.name}</b>
        <span className="pillar-count">
          {waiting.length} idea{waiting.length === 1 ? "" : "s"} waiting
          {onDrop && ideas.length === 0 && (
            <button className="todo-x" onClick={onDrop}>×</button>
          )}
        </span>
      </div>
      <div className="pillar-note">{p.note}</div>

      {ideas.map((i) => (
        <div key={i.id} className={i.postedOn ? "todo done" : "todo"}>
          <button className="todo-tick" onClick={() => onToggle(p.id, i.id)}>
            {i.postedOn ? "✓" : ""}
          </button>
          <span className="todo-text">
            <EditText value={i.text} onSave={(t) => onRename(p.id, i.id, t)} />
            {i.postedOn && (
              <span className="subcount">posted {labelMonth(i.postedOn)}</span>
            )}
          </span>
          <button className="todo-x" onClick={() => onRemove(p.id, i.id)}>
            ×
          </button>
        </div>
      ))}

      <AddLine
        small
        placeholder="An idea for this pillar…"
        onAdd={(t) => onAdd(p.id, t)}
      />
    </div>
  );
}

function WeekShape() {
  const today = new Date().getDay();
  const now = WEEK_SHAPE.find((x) => x.d === today);
  return (
    <>
      <div className="sub">The shape of your week</div>
      {now ? (
        <div className="todayband">
          <span className="todayband-day">
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </span>
          <b>{now.focus}</b>
          <span className="todayband-note">{now.note}</span>
        </div>
      ) : (
        <div className="todayband weekend">
          <span className="todayband-day">
            {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </span>
          <b>Chair day, or your own</b>
          <span className="todayband-note">
            Nothing scheduled. If you're working, you're working — the week picks
            up Monday.
          </span>
        </div>
      )}

      <div className="week">
        {WEEK_SHAPE.map((x) => (
          <div key={x.d} className={x.d === today ? "wday on" : "wday"}>
            <span className="wday-name">{x.day}</span>
            <div className="wday-body">
              <b>
                {x.focus}
                {x.firm && <span className="tag gold">non-negotiable</span>}
              </b>
              <span>{x.note}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="hint">
        Ten minutes on DMs and pipeline first, every weekday, before the day's
        focus.
      </div>
    </>
  );
}

function EditText({ value, onSave, className }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing)
    return (
      <span
        className={(className || "") + " editable"}
        title="Tap to edit"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {value}
      </span>
    );

  return (
    <input
      className="inlineedit"
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft.trim()) onSave(draft.trim());
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (draft.trim()) onSave(draft.trim());
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
    />
  );
}

function AddLine({ onAdd, placeholder, small }) {
  const [text, setText] = useState("");
  const go = () => {
    const v = text.trim();
    if (!v) return;
    onAdd(v);
    setText("");
  };
  return (
    <div className={small ? "todo-add sub-add" : "todo-add"}>
      <input
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
      />
      <button
        className={small ? "slg-btn ghost tiny" : "slg-btn"}
        disabled={!text.trim()}
        onClick={go}
      >
        Add
      </button>
    </div>
  );
}

function TaskItem({ item, isDone, toggle, remove, addSub, removeSub, rename, renameSub }) {
  const [open, setOpen] = useState(false);
  const subs = item.subs || [];
  const doneSubs = subs.filter((x) => isDone(x.id)).length;
  const on = isDone(item.id);

  return (
    <div className="task">
      <div className={on ? "todo done" : "todo"}>
        <button className="todo-tick" onClick={() => toggle(item.id)}>
          {on ? "✓" : ""}
        </button>
        <span className="todo-text">
          <EditText value={item.text} onSave={(t) => rename(item.id, t)} />
          {subs.length > 0 && (
            <span className="subcount">
              {doneSubs}/{subs.length}
            </span>
          )}
        </span>
        <button
          className="todo-x"
          title="Add a step"
          onClick={() => setOpen(!open)}
        >
          {open ? "–" : "+"}
        </button>
        <button className="todo-x" onClick={() => remove(item.id)}>
          ×
        </button>
      </div>

      {subs.map((sub) => {
        const sOn = isDone(sub.id);
        return (
          <div key={sub.id} className={sOn ? "todo sub done" : "todo sub"}>
            <button className="todo-tick small" onClick={() => toggle(sub.id)}>
              {sOn ? "✓" : ""}
            </button>
            <span className="todo-text">
              <EditText
                value={sub.text}
                onSave={(t) => renameSub(item.id, sub.id, t)}
              />
            </span>
            <button className="todo-x" onClick={() => removeSub(item.id, sub.id)}>
              ×
            </button>
          </div>
        );
      })}

      {open && (
        <AddLine
          small
          placeholder="A step under this…"
          onAdd={(t) => addSub(item.id, t)}
        />
      )}
    </div>
  );
}

function TaskList({
  items, isDone, toggle, remove, addSub, removeSub, onAdd, rename, renameSub,
  title, note, placeholder, extra,
}) {
  const left = items.filter((t) => !isDone(t.id)).length;
  return (
    <>
      <div className="sub subrow">
        <span>
          {title}
          {items.length === 0 ? "" : left ? ` · ${left} left` : " · all done"}
        </span>
        {extra}
      </div>
      {note && <div className="hint">{note}</div>}
      {items.map((t) => (
        <TaskItem
          key={t.id}
          item={t}
          isDone={isDone}
          toggle={toggle}
          remove={remove}
          addSub={addSub}
          removeSub={removeSub}
          rename={rename}
          renameSub={renameSub}
        />
      ))}
      <AddLine onAdd={onAdd} placeholder={placeholder} />
    </>
  );
}

function Score({ label, now, was, note, isMoney }) {
  const d = now - was;
  const cls = d > 0 ? "up" : d < 0 ? "dn" : "flat";
  return (
    <div className="score">
      <span className="score-label">{label}</span>
      <b>{isMoney ? money(now) : now}</b>
      <span className={"score-delta " + cls}>
        {d === 0
          ? "same as last month"
          : `${d > 0 ? "▲" : "▼"} ${isMoney ? money(Math.abs(d)) : Math.abs(d)} vs last month`}
      </span>
      {note && <span className="score-note">{note}</span>}
    </div>
  );
}

function GoalNotes({ g, slots, write, goals }) {
  const [open, setOpen] = useState(false);
  const notes = g.notes || {};
  const filled = slots.filter((sl) => (notes[sl.key] || "").trim()).length;

  const setNote = (key, text) =>
    write(
      goals.map((x) =>
        x.id === g.id ? { ...x, notes: { ...(x.notes || {}), [key]: text } } : x
      )
    );

  return (
    <>
      <button className="notestoggle" onClick={() => setOpen(!open)}>
        {open ? "Hide progress" : "Progress"}
        {filled > 0 && <span className="notesnum">{filled}</span>}
      </button>
      {open && (
        <div className="notespanel">
          {slots.map((sl) => (
            <label key={sl.key} className="noteslot">
              <span>{sl.label}</span>
              <textarea
                rows={2}
                value={notes[sl.key] || ""}
                placeholder="What you did, what's next…"
                onChange={(e) => setNote(sl.key, e.target.value)}
              />
            </label>
          ))}
        </div>
      )}
    </>
  );
}

function MyGoals({ period, goals, write, placeholder, slots }) {
  const [text, setText] = useState("");
  const mine = goals.filter((g) => g.period === period);
  const add = () => {
    const v = text.trim();
    if (!v) return;
    write([...goals, { id: "g" + Date.now(), period, text: v, done: false, notes: {} }]);
    setText("");
  };
  return (
    <>
      {mine.length === 0 && (
        <div className="hint">Nothing set yet. Write whatever you're aiming for.</div>
      )}
      {mine.map((g) => (
        <div key={g.id} className="goalitem">
          <div className={g.done ? "todo done" : "todo"}>
            <button
              className="todo-tick"
              onClick={() =>
                write(goals.map((x) => (x.id === g.id ? { ...x, done: !x.done } : x)))
              }
            >
              {g.done ? "✓" : ""}
            </button>
            <span className="todo-text">
              <EditText
                value={g.text}
                onSave={(t) =>
                  write(goals.map((x) => (x.id === g.id ? { ...x, text: t } : x)))
                }
              />
            </span>
            <button
              className="todo-x"
              onClick={() => write(goals.filter((x) => x.id !== g.id))}
            >
              ×
            </button>
          </div>
          {slots && <GoalNotes g={g} slots={slots} write={write} goals={goals} />}
        </div>
      ))}
      <div className="todo-add">
        <input
          value={text}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="slg-btn" disabled={!text.trim()} onClick={add}>
          Add
        </button>
      </div>
    </>
  );
}

function Business({ biz, writeBiz, clients, gigs, totals }) {
  const [view, setView] = useState("goals");
  const [sp, setSp] = useState({
    date: isoOf(new Date()),
    kind: SPEND_KINDS[0],
    label: "",
    amount: "",
  });
  const [monthOff, setMonthOff] = useState(0);
  const [exportMsg, setExportMsg] = useState("");
  const [addingPillar, setAddingPillar] = useState(false);
  const [np, setNp] = useState({ name: "", note: "" });
  const [addingVendor, setAddingVendor] = useState(false);
  const [nv, setNv] = useState({
    kind: VENDOR_KINDS[0], name: "", link: "", contact: "", note: "",
  });

  const thisMonth = monthKey();
  const thisYear = String(new Date().getFullYear());
  const viewMonth = shiftMonth(thisMonth, monthOff);
  const spend = biz.spend || [];
  const routine = biz.routine || DEFAULT_BIZ.routine;

  const myGoals = biz.myGoals || [];
  const writeGoals = (next) => writeBiz({ ...biz, myGoals: next });

  const rev = (arr) => arr.reduce((s, c) => s + totals(c).total, 0);
  const payouts = (arr) => arr.reduce((s, c) => s + artistPayout(c), 0);

  /* each number keyed to what it actually measures */
  const askedIn = (mk) =>
    clients.filter((c) => (inquiryOf(c) || "").slice(0, 7) === mk);
  const wonIn = (mk) => clients.filter((c) => c.stage >= 3 && c.retainerMonth === mk);
  const weddingsIn = (mk) =>
    clients.filter(
      (c) =>
        c.stage >= 3 &&
        c.type === "Bridal" &&
        (c.eventDate || "").slice(0, 7) === mk
    );

  /* every event you were physically at, yours and other artists' */
  const eventsIn = (mk) => {
    const mine = clients.filter(
      (c) => c.stage >= 3 && (c.eventDate || "").slice(0, 7) === mk
    ).length;
    const forOthers = (gigs || []).filter(
      (g) => (g.date || "").slice(0, 7) === mk
    ).length;
    return { mine, forOthers, all: mine + forOthers };
  };

  /* money you actually handed artists, counted on the day you paid it */
  const artistPaidIn = (mk) => {
    let sum = 0;
    clients.forEach((c) =>
      (c.artists || []).forEach((a) => {
        const t = artistOne(a);
        const ret = Math.round(t * 0.3);
        if ((a.retainerPaidOn || "").slice(0, 7) === mk) sum += ret;
        if ((a.balancePaidOn || "").slice(0, 7) === mk) sum += t - ret;
      })
    );
    return sum;
  };

  const snap = (mk) => {
    const won = wonIn(mk);
    const ret = won.reduce((s, c) => s + totals(c).retainer, 0);
    const bal = clients
      .filter((c) => c.stage >= 4 && c.balanceMonth === mk)
      .reduce((s, c) => s + totals(c).balance, 0);
    const ev = eventsIn(mk);
    return {
      inq: askedIn(mk).length,
      book: won.length,
      wed: weddingsIn(mk).length,
      events: ev.all,
      evMine: ev.mine,
      evOthers: ev.forOthers,
      ret,
      bal,
      rev: ret + bal,
      artistOut: artistPaidIn(mk),
    };
  };

  const weekSlots = [1, 2, 3, 4, 5].map((n) => ({ key: `w${n}`, label: `Week ${n}` }));
  const monthSlots = Array.from({ length: 12 }, (_, i) => ({
    key: `m${i + 1}`,
    label: new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" }),
  }));

  const M = snap(viewMonth);
  const P = snap(shiftMonth(viewMonth, -1));

  const yearOf = viewMonth.slice(0, 4);
  const yearMonths = Array.from({ length: 12 }, (_, i) =>
    `${yearOf}-${String(i + 1).padStart(2, "0")}`
  );
  const Y = yearMonths.reduce(
    (acc, m) => {
      const x = snap(m);
      return {
        inq: acc.inq + x.inq,
        book: acc.book + x.book,
        wed: acc.wed + x.wed,
        events: acc.events + x.events,
        rev: acc.rev + x.rev,
      };
    },
    { inq: 0, book: 0, wed: 0, events: 0, rev: 0 }
  );

  const exportMonths = (n) => {
    const rows = [["Month", "Enquiries", "Bookings", "Weddings", "Events", "Retainers", "Balances", "Money in", "Paid to artists"]];
    for (let i = n - 1; i >= 0; i--) {
      const m = shiftMonth(thisMonth, -i);
      const x = snap(m);
      rows.push([labelMonth(m), x.inq, x.book, x.wed, x.events, x.ret, x.bal, x.rev, x.artistOut]);
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sara-luxe-glam-last-${n}-months.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportMsg(`Last ${n} months downloaded.`);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = csv;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) { console.error(err); }
      document.body.removeChild(ta);
      setExportMsg("Download blocked — copied instead.");
    }
    setTimeout(() => setExportMsg(""), 3000);
  };

  const inMonth = wonIn(thisMonth);

  const monthSpend = spend.filter((x) => (x.date || "").slice(0, 7) === thisMonth);
  const yearSpend = spend.filter((x) => (x.date || "").slice(0, 4) === thisYear);
  const spendSum = (arr) => arr.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const marketing = (arr) =>
    spendSum(arr.filter((x) => x.kind === "Marketing / ads"));

  const byKind = SPEND_KINDS.map((k) => ({
    k,
    v: spendSum(monthSpend.filter((x) => x.kind === k)),
  })).filter((x) => x.v > 0);

  const now = snap(thisMonth);
  const cashIn = now.rev;
  const monthKept = cashIn - now.artistOut - spendSum(monthSpend);

  const addSpend = () => {
    if (!sp.amount || !sp.date) return;
    writeBiz({ ...biz, spend: [...spend, { id: "s" + Date.now(), ...sp }] });
    setSp({ ...sp, label: "", amount: "" });
  };

  /* vendors */
  const vendors = biz.vendors || [];
  const writeVendors = (next) => writeBiz({ ...biz, vendors: next });
  const toggleBlock = (id) =>
    writeVendors(
      vendors.map((v) => (v.id === id ? { ...v, blocked: !v.blocked } : v))
    );
  const addVendor = () => {
    if (!nv.name.trim()) return;
    writeVendors([...vendors, { id: "v" + Date.now(), ...nv, name: nv.name.trim() }]);
    setNv({ kind: nv.kind, name: "", link: "", contact: "", note: "" });
    setAddingVendor(false);
  };

  /* shoots */
  const shoots = biz.shoots || [];
  const writeShoots = (next) => writeBiz({ ...biz, shoots: next });
  const patchShoot = (id, p) =>
    writeShoots(shoots.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const shootsThisMonth = shoots.filter(
    (x) => (x.date || "").slice(0, 7) === thisMonth
  ).length;

  /* content pillars */
  const content = biz.content || DEFAULT_CONTENT;
  const setPillars = (next) =>
    writeBiz({ ...biz, content: { ...content, pillars: next } });
  const addIdea = (pid, text) =>
    setPillars(
      content.pillars.map((p) =>
        p.id === pid
          ? { ...p, ideas: [...(p.ideas || []), { id: "i" + Date.now(), text }] }
          : p
      )
    );
  const toggleIdea = (pid, iid) =>
    setPillars(
      content.pillars.map((p) =>
        p.id === pid
          ? {
              ...p,
              ideas: p.ideas.map((i) =>
                i.id === iid
                  ? { ...i, postedOn: i.postedOn ? null : thisMonth }
                  : i
              ),
            }
          : p
      )
    );
  const renameIdea = (pid, iid, text) =>
    setPillars(
      content.pillars.map((p) =>
        p.id === pid
          ? { ...p, ideas: p.ideas.map((i) => (i.id === iid ? { ...i, text } : i)) }
          : p
      )
    );
  const removeIdea = (pid, iid) =>
    setPillars(
      content.pillars.map((p) =>
        p.id === pid ? { ...p, ideas: p.ideas.filter((i) => i.id !== iid) } : p
      )
    );
  const postedThisMonth = content.pillars.map((p) => ({
    name: p.name,
    n: (p.ideas || []).filter((i) => i.postedOn === thisMonth).length,
  }));
  const postedTotal = postedThisMonth.reduce((s2, x) => s2 + x.n, 0);

  /* routine ticks reset each period */
  const rDone = routine.done || {};
  const rIsDone = (id) => !!rDone[id];
  const rToggle = (id) => {
    const done = { ...rDone };
    if (done[id]) delete done[id];
    else done[id] = true;
    writeBiz({ ...biz, routine: { ...routine, done } });
  };
  const rSet = (list, next) =>
    writeBiz({ ...biz, routine: { ...routine, [list]: next } });
  const rAdd = (list, text) =>
    rSet(list, [...(routine[list] || []), { id: list[0] + Date.now(), text, subs: [] }]);
  const rRemove = (list, id) =>
    rSet(list, (routine[list] || []).filter((t) => t.id !== id));
  const rAddSub = (list, pid, text) =>
    rSet(
      list,
      (routine[list] || []).map((t) =>
        t.id === pid
          ? { ...t, subs: [...(t.subs || []), { id: "s" + Date.now(), text }] }
          : t
      )
    );
  const rRename = (list, id, text) =>
    rSet(list, (routine[list] || []).map((t) => (t.id === id ? { ...t, text } : t)));
  const rRenameSub = (list, pid, sid, text) =>
    rSet(
      list,
      (routine[list] || []).map((t) =>
        t.id === pid
          ? { ...t, subs: (t.subs || []).map((x) => (x.id === sid ? { ...x, text } : x)) }
          : t
      )
    );
  const rRemoveSub = (list, pid, sid) =>
    rSet(
      list,
      (routine[list] || []).map((t) =>
        t.id === pid
          ? { ...t, subs: (t.subs || []).filter((x) => x.id !== sid) }
          : t
      )
    );

  /* the standing list — never resets */
  const todos = biz.todos || [];
  const tDone = biz.todoDone || {};
  const tIsDone = (id) => !!tDone[id];
  const tToggle = (id) => {
    const d = { ...tDone };
    if (d[id]) delete d[id];
    else d[id] = true;
    writeBiz({ ...biz, todoDone: d });
  };
  const tAdd = (text) =>
    writeBiz({
      ...biz,
      todos: [...todos, { id: "d" + Date.now(), text, subs: [] }],
    });
  const tRemove = (id) =>
    writeBiz({ ...biz, todos: todos.filter((t) => t.id !== id) });
  const tAddSub = (pid, text) =>
    writeBiz({
      ...biz,
      todos: todos.map((t) =>
        t.id === pid
          ? { ...t, subs: [...(t.subs || []), { id: "ds" + Date.now(), text }] }
          : t
      ),
    });
  const tRemoveSub = (pid, sid) =>
    writeBiz({
      ...biz,
      todos: todos.map((t) =>
        t.id === pid ? { ...t, subs: (t.subs || []).filter((x) => x.id !== sid) } : t
      ),
    });
  const tRename = (id, text) =>
    writeBiz({ ...biz, todos: todos.map((t) => (t.id === id ? { ...t, text } : t)) });
  const tRenameSub = (pid, sid, text) =>
    writeBiz({
      ...biz,
      todos: todos.map((t) =>
        t.id === pid
          ? { ...t, subs: (t.subs || []).map((x) => (x.id === sid ? { ...x, text } : x)) }
          : t
      ),
    });
  const tClearDone = () => {
    const keep = todos.filter((t) => !tDone[t.id]);
    const d = { ...tDone };
    todos.filter((t) => tDone[t.id]).forEach((t) => {
      delete d[t.id];
      (t.subs || []).forEach((x) => delete d[x.id]);
    });
    writeBiz({ ...biz, todos: keep, todoDone: d });
  };

  return (
    <>
      <div className="tpl-list">
        {[
          ["goals", "Goals"],
          ["money", "Money"],
          ["content", "Content"],
          ["shoots", "Shoots"],
          ["vendors", "Vendors"],
          ["routine", "Routine"],
        ].map(([k, l]) => (
          <button
            key={k}
            className={view === k ? "tpl on" : "tpl"}
            onClick={() => setView(k)}
          >
            {l}
          </button>
        ))}
      </div>

      {view === "goals" && (
        <>
          <div className="monthbar">
            <button className="slg-btn ghost tiny" onClick={() => setMonthOff(monthOff - 1)}>‹</button>
            <div className="monthname">{labelMonth(viewMonth)}</div>
            <button className="slg-btn ghost tiny" onClick={() => setMonthOff(monthOff + 1)}>›</button>
            {monthOff !== 0 && (
              <button className="slg-btn ghost tiny" onClick={() => setMonthOff(0)}>today</button>
            )}
          </div>

          <div className="scoregrid">
            <Score label="Enquiries" now={M.inq} was={P.inq} note="when they came in" />
            <Score
              label="Bookings won"
              now={M.book}
              was={P.book}
              note="retainer landed this month"
            />
            <Score
              label="My weddings"
              now={M.wed}
              was={P.wed}
              note="your own brides, done this month"
            />
            <Score
              label="Events attended"
              now={M.events}
              was={P.events}
              note={`${M.evMine} your own · ${M.evOthers} for other artists`}
            />
            <Score
              label="Money in"
              now={M.rev}
              was={P.rev}
              isMoney
              note={`${money(M.ret)} retainers · ${money(M.bal)} balances`}
            />
          </div>

          <div className="hint">
            Enquiries count when they arrived, bookings when the retainer landed,
            weddings when you actually did them, and money in is only cash that
            reached you this month. Events attended includes work you did for
            other artists; weddings counts only your own brides.
          </div>

          <div className="sub">My goals for {labelMonth(viewMonth)}</div>
          <MyGoals
            period={viewMonth}
            goals={myGoals}
            write={writeGoals}
            slots={weekSlots}
            placeholder="One shoot this month, 10 new enquiries…"
          />

          <div className="sub">My goals for {yearOf}</div>
          <MyGoals
            period={yearOf}
            goals={myGoals}
            write={writeGoals}
            slots={monthSlots}
            placeholder="Grow enquiries every month, book more weddings…"
          />

          <div className="sub">{yearOf} all together</div>
          <div className="ledger flat">
            <div><span>Enquiries</span><b>{Y.inq}</b></div>
            <div><span>Bookings won</span><b>{Y.book}</b></div>
            <div><span>My weddings</span><b>{Y.wed}</b></div>
            <div><span>Events attended</span><b>{Y.events}</b></div>
            <div><span>Money in</span><b>{money(Y.rev)}</b></div>
          </div>

          <div className="sub">Export</div>
          <div className="card-actions">
            <button className="slg-btn ghost" onClick={() => exportMonths(6)}>
              Last 6 months
            </button>
            <button className="slg-btn ghost" onClick={() => exportMonths(12)}>
              Last 12 months
            </button>
          </div>
          {exportMsg && <div className="hint" style={{ marginTop: 8 }}>{exportMsg}</div>}
        </>
      )}

      {view === "money" && (
        <>
          <div className="stats">
            <div className="stat">
              <b>{money(monthKept)}</b>
              <span>kept in {monthName()} after artists and spend</span>
            </div>
            <div className="stat">
              <b>{money(marketing(monthSpend))}</b>
              <span>
                on marketing this month · {money(marketing(yearSpend))} this year
              </span>
            </div>
          </div>

          <div className="ledger flat">
            <div>
              <span>Money in this month</span>
              <b>{money(cashIn)}</b>
            </div>
            <div>
              <span>Paid to second artists</span>
              <b>–{money(now.artistOut)}</b>
            </div>
            <div>
              <span>Everything you spent</span>
              <b>–{money(spendSum(monthSpend))}</b>
            </div>
          </div>

          {byKind.length > 0 && (
            <>
              <div className="sub">Where it went</div>
              {byKind.map((x) => (
                <div key={x.k} className="row">
                  <div className="row-main">{x.k}</div>
                  <div className="row-right">
                    <b>{money(x.v)}</b>
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="sub">Log something you spent</div>
          <div className="addform">
            <div className="grid2">
              <Field label="Date">
                <input
                  type="date"
                  value={sp.date}
                  onChange={(e) => setSp({ ...sp, date: e.target.value })}
                />
              </Field>
              <Field label="What kind">
                <select
                  value={sp.kind}
                  onChange={(e) => setSp({ ...sp, kind: e.target.value })}
                >
                  {SPEND_KINDS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </Field>
              <Field label="What was it">
                <input
                  value={sp.label}
                  placeholder="Instagram ad, lashes, foundation…"
                  onChange={(e) => setSp({ ...sp, label: e.target.value })}
                />
              </Field>
              <Field label="Amount">
                <input
                  type="number"
                  value={sp.amount}
                  placeholder="0"
                  onChange={(e) => setSp({ ...sp, amount: e.target.value })}
                />
              </Field>
            </div>
            <button className="slg-btn" disabled={!sp.amount} onClick={addSpend}>
              Add
            </button>
          </div>

          <div className="sub">{monthName()} in detail</div>
          {monthSpend.length === 0 && (
            <div className="slg-empty">
              <p className="quiet">Nothing logged this month.</p>
            </div>
          )}
          {[...monthSpend]
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((x) => (
              <div key={x.id} className="row">
                <div className="row-main">
                  <b>{x.label || x.kind}</b>
                  <div className="quiet">
                    {x.kind} · {fmtDate(x.date)}
                  </div>
                </div>
                <div className="row-right">
                  <b>{money(x.amount)}</b>
                </div>
                <button
                  className="paybtn"
                  onClick={() =>
                    writeBiz({
                      ...biz,
                      spend: spend.filter((y) => y.id !== x.id),
                    })
                  }
                >
                  Remove
                </button>
              </div>
            ))}
        </>
      )}

      {view === "content" && (
        <>
          <div className="sub">Posted in {monthName()}</div>
          {postedTotal === 0 ? (
            <div className="hint">Nothing ticked off yet this month.</div>
          ) : (
            <div className="ledger flat">
              {postedThisMonth.map((x) => (
                <div key={x.name}>
                  <span>{x.name}</span>
                  <b>{x.n}</b>
                </div>
              ))}
              <div>
                <span>Total</span>
                <b>{postedTotal}</b>
              </div>
            </div>
          )}
          <div className="hint">
            If Promotional is running ahead of the other two, the feed is asking
            more than it's giving.
          </div>

          <div className="sub subrow">
            <span>Your pillars</span>
            <button className="linkbtn" onClick={() => setAddingPillar(!addingPillar)}>
              {addingPillar ? "Cancel" : "+ Add pillar"}
            </button>
          </div>
          {addingPillar && (
            <div className="addform">
              <div className="grid2">
                <Field label="Name">
                  <input
                    value={np.name}
                    placeholder="What's it called"
                    onChange={(e) => setNp({ ...np, name: e.target.value })}
                  />
                </Field>
                <Field label="What belongs here">
                  <input
                    value={np.note}
                    placeholder="One line"
                    onChange={(e) => setNp({ ...np, note: e.target.value })}
                  />
                </Field>
              </div>
              <button
                className="slg-btn"
                disabled={!np.name.trim()}
                onClick={() => {
                  setPillars([
                    ...content.pillars,
                    { id: "cp" + Date.now(), name: np.name.trim(), note: np.note.trim(), ideas: [] },
                  ]);
                  setNp({ name: "", note: "" });
                  setAddingPillar(false);
                }}
              >
                Add pillar
              </button>
            </div>
          )}
          {content.pillars.map((p) => (
            <Pillar
              key={p.id}
              p={p}
              thisMonth={thisMonth}
              onAdd={addIdea}
              onToggle={toggleIdea}
              onRemove={removeIdea}
              onRename={renameIdea}
              onDrop={() =>
                setPillars(content.pillars.filter((x) => x.id !== p.id))
              }
            />
          ))}

          <div className="sub">Running across all three</div>
          <div className="aesthetic">
            {(content.aesthetic || []).map((a) => (
              <span key={a} className="aes">{a}</span>
            ))}
          </div>
        </>
      )}

      {view === "shoots" && (
        <>
          <div className="stats">
            <div className="stat">
              <b>{shootsThisMonth}<em className="ofgoal"> / 2</em></b>
              <span>shoots dated in {monthName()}</span>
            </div>
            <div className="stat">
              <b>{shoots.filter((x) => !x.done).length}</b>
              <span>in progress right now</span>
            </div>
          </div>

          <div className="slg-bar">
            <span className="slg-count">
              {shoots.filter((x) => x.done).length} completed
            </span>
            <button
              className="slg-btn"
              onClick={() =>
                writeShoots([
                  ...shoots,
                  {
                    id: "sh" + Date.now(),
                    title: `Shoot ${shoots.length + 1}`,
                    date: "",
                    people: [],
                    log: [],
                    notes: "",
                    done: false,
                  },
                ])
              }
            >
              Start a shoot
            </button>
          </div>

          {shoots.filter((x) => !x.done).length === 0 && (
            <div className="slg-empty">
              <p className="quiet">
                Nothing in progress. Two a month is the target \u2014 Tuesday is when
                you line them up.
              </p>
            </div>
          )}

          {shoots
            .filter((x) => !x.done)
            .map((x) => (
              <ShootCard
                key={x.id}
                s={x}
                vendors={vendors}
                patchShoot={patchShoot}
                onRemove={(id) => writeShoots(shoots.filter((y) => y.id !== id))}
              />
            ))}

          {shoots.some((x) => x.done) && (
            <>
              <div className="sub">Completed</div>
              {shoots
                .filter((x) => x.done)
                .map((x) => (
                  <ShootCard
                    key={x.id}
                    s={x}
                    vendors={vendors}
                    patchShoot={patchShoot}
                    onRemove={(id) => writeShoots(shoots.filter((y) => y.id !== id))}
                  />
                ))}
            </>
          )}
        </>
      )}

      {view === "vendors" && (
        <>
          <div className="sub subrow">
            <span>
              Your people
              {vendors.filter((v) => !v.blocked).length
                ? ` · ${vendors.filter((v) => !v.blocked).length}`
                : ""}
            </span>
            <button className="linkbtn" onClick={() => setAddingVendor(!addingVendor)}>
              {addingVendor ? "Cancel" : "+ Add"}
            </button>
          </div>
          <div className="hint">
            Everyone you'd call for a booking or a shoot. Tuesday's outreach
            starts here.
          </div>

          {addingVendor && (
            <div className="addform">
              <div className="grid2">
                <Field label="Who are they">
                  <select
                    value={nv.kind}
                    onChange={(e) => setNv({ ...nv, kind: e.target.value })}
                  >
                    {VENDOR_KINDS.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Name">
                  <input
                    value={nv.name}
                    placeholder="Name or studio"
                    onChange={(e) => setNv({ ...nv, name: e.target.value })}
                  />
                </Field>
                <Field label="Instagram or website">
                  <input
                    value={nv.link}
                    placeholder="https://instagram.com/…"
                    onChange={(e) => setNv({ ...nv, link: e.target.value })}
                  />
                </Field>
                <Field label="Phone or email">
                  <input
                    value={nv.contact}
                    placeholder="How you reach them"
                    onChange={(e) => setNv({ ...nv, contact: e.target.value })}
                  />
                </Field>
                <Field label="Notes">
                  <input
                    value={nv.note}
                    placeholder="Rate, style, who introduced you, last worked together…"
                    onChange={(e) => setNv({ ...nv, note: e.target.value })}
                  />
                </Field>
              </div>
              <button className="slg-btn" disabled={!nv.name.trim()} onClick={addVendor}>
                Add
              </button>
            </div>
          )}

          {VENDOR_KINDS.map((k) => {
            const list = vendors.filter((v) => v.kind === k && !v.blocked);
            if (list.length === 0) return null;
            return (
              <div key={k}>
                <div className="sub">{k}</div>
                {list.map((v) => (
                  <VendorCard
                    key={v.id}
                    v={v}
                    onBlock={toggleBlock}
                    onRemove={(id) => writeVendors(vendors.filter((x) => x.id !== id))}
                  />
                ))}
              </div>
            );
          })}

          {vendors.some((v) => v.blocked) && (
            <>
              <div className="sub alertsub">Don't contact</div>
              <div className="hint">
                Write down why. In eight months you'll remember the name and not
                the reason.
              </div>
              {vendors
                .filter((v) => v.blocked)
                .map((v) => (
                  <VendorCard
                    key={v.id}
                    v={v}
                    onBlock={toggleBlock}
                    onRemove={(id) => writeVendors(vendors.filter((x) => x.id !== id))}
                  />
                ))}
            </>
          )}

          {vendors.length === 0 && !addingVendor && (
            <div className="slg-empty">
              <p className="quiet">
                Nobody saved yet. Start with whoever you'd call first for hair on
                a big booking.
              </p>
            </div>
          )}
        </>
      )}

      {view === "routine" && (
        <>
          <WeekShape />

          {shoots.some((sh) => !sh.done && (sh.todos || []).some((t) => !t.done)) && (
            <>
              <div className="sub">From your shoots</div>
              {shoots
                .filter((sh) => !sh.done)
                .flatMap((sh) =>
                  (sh.todos || [])
                    .filter((t) => !t.done)
                    .map((t) => (
                      <div key={sh.id + t.id} className="todo">
                        <button
                          className="todo-tick"
                          onClick={() =>
                            patchShoot(sh.id, {
                              todos: sh.todos.map((x) =>
                                x.id === t.id ? { ...x, done: true } : x
                              ),
                            })
                          }
                        />
                        <span className="todo-text">
                          <b>{sh.title}</b> — {t.text}
                        </span>
                      </div>
                    ))
                )}
            </>
          )}

          <TaskList
            title="My to-do list"
            note="Anything one-off. Nothing here clears itself — it stays until you tick it."
            placeholder="Something you want to get done…"
            items={todos}
            isDone={tIsDone}
            toggle={tToggle}
            remove={tRemove}
            addSub={tAddSub}
            removeSub={tRemoveSub}
            rename={tRename}
            renameSub={tRenameSub}
            onAdd={tAdd}
            extra={
              todos.some((t) => tIsDone(t.id)) ? (
                <button className="linkbtn" onClick={tClearDone}>
                  Clear done
                </button>
              ) : null
            }
          />

          <TaskList
            title="Every week"
            note="Clears itself every Monday."
            placeholder="Something you do weekly…"
            items={routine.weekly || []}
            isDone={rIsDone}
            toggle={rToggle}
            remove={(id) => rRemove("weekly", id)}
            addSub={(pid, t) => rAddSub("weekly", pid, t)}
            removeSub={(pid, sid) => rRemoveSub("weekly", pid, sid)}
            rename={(id, t) => rRename("weekly", id, t)}
            renameSub={(pid, sid, t) => rRenameSub("weekly", pid, sid, t)}
            onAdd={(t) => rAdd("weekly", t)}
          />

          <TaskList
            title="Every month"
            note="Clears on the 1st. The slower work that never feels urgent."
            placeholder="Something you do monthly…"
            items={routine.monthly || []}
            isDone={rIsDone}
            toggle={rToggle}
            remove={(id) => rRemove("monthly", id)}
            addSub={(pid, t) => rAddSub("monthly", pid, t)}
            removeSub={(pid, sid) => rRemoveSub("monthly", pid, sid)}
            rename={(id, t) => rRename("monthly", id, t)}
            renameSub={(pid, sid, t) => rRenameSub("monthly", pid, sid, t)}
            onAdd={(t) => rAdd("monthly", t)}
          />
        </>
      )}
    </>
  );
}

/* ---------------- backup ---------------- */

function Backup({ clients, gigs, rates, settings, templates, biz, restore }) {
  const [panel, setPanel] = useState(false);
  const [paste, setPaste] = useState("");
  const [armed, setArmed] = useState(false);
  const [msg, setMsg] = useState("");

  const bundle = () =>
    JSON.stringify(
      {
        app: "sara-luxe-glam",
        version: 1,
        exportedAt: new Date().toISOString(),
        clients,
        gigs,
        rates,
        settings,
        templates,
        biz,
      },
      null,
      2
    );

  const download = () => {
    try {
      const blob = new Blob([bundle()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sara-luxe-glam-backup-${isoOf(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMsg("Backup downloaded.");
    } catch (e) {
      console.error(e);
      setMsg("Download blocked — use Copy instead.");
    }
    setTimeout(() => setMsg(""), 3000);
  };

  const copy = () => {
    const ta = document.createElement("textarea");
    ta.value = bundle();
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      setMsg("Copied. Paste it somewhere safe.");
    } catch (e) {
      console.error(e);
      setMsg("Couldn't copy.");
    }
    document.body.removeChild(ta);
    setTimeout(() => setMsg(""), 3000);
  };

  const apply = (text) => {
    let d;
    try {
      d = JSON.parse(text);
    } catch (e) {
      setMsg("That doesn't look like a backup file.");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    if (!d || d.app !== "sara-luxe-glam") {
      setMsg("That's not a Sara Luxe Glam backup.");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    restore(d);
    setPaste("");
    setArmed(false);
    setPanel(false);
    setMsg("Restored.");
    setTimeout(() => setMsg(""), 3000);
  };

  const readFile = (file) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => apply(String(r.result));
    r.onerror = () => setMsg("Couldn't read that file.");
    r.readAsText(file);
  };

  const openTasks = clients.reduce(
    (s, c) => s + (c.todos || []).filter((t) => !t.done).length,
    0
  );

  return (
    <>
      <div className="sub">Your data</div>
      <div className="hint">
        Everything lives inside this app. Download a copy now and again so a bad
        tap can never take your records with it.
      </div>

      <div className="ledger flat">
        <div>
          <span>Clients</span>
          <b>{clients.length}</b>
        </div>
        <div>
          <span>Other artist bookings</span>
          <b>{gigs.length}</b>
        </div>
        <div>
          <span>Services &amp; templates</span>
          <b>
            {rates.length} · {templates.length}
          </b>
        </div>
        <div>
          <span>Open tasks</span>
          <b>{openTasks}</b>
        </div>
      </div>

      <div className="card-actions">
        <button className="slg-btn" onClick={download}>
          Download backup
        </button>
        <button className="slg-btn ghost" onClick={copy}>
          Copy as text
        </button>
        <button className="slg-btn ghost" onClick={() => setPanel(!panel)}>
          {panel ? "Cancel" : "Restore"}
        </button>
      </div>

      {msg && <div className="hint" style={{ marginTop: 8 }}>{msg}</div>}

      {panel && (
        <div className="addform" style={{ marginTop: 12 }}>
          <div className="hint">
            Restoring replaces everything currently in the app. Download a backup
            first if you're not sure.
          </div>
          <Field label="Pick a backup file">
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => readFile(e.target.files && e.target.files[0])}
            />
          </Field>
          <Field label="Or paste the backup text">
            <textarea
              rows={4}
              value={paste}
              placeholder="Paste here…"
              onChange={(e) => setPaste(e.target.value)}
            />
          </Field>
          <button
            className={armed ? "slg-btn" : "slg-btn ghost"}
            disabled={!paste.trim()}
            onClick={() => {
              if (armed) apply(paste);
              else {
                setArmed(true);
                setTimeout(() => setArmed(false), 4000);
              }
            }}
          >
            {armed ? "Tap again — this replaces everything" : "Restore from text"}
          </button>
        </div>
      )}
    </>
  );
}

/* ---------------- rates ---------------- */

function Rates({ rates, settings, writeRates }) {
  const setPrice = (id, price) =>
    writeRates(
      rates.map((r) => (r.id === id ? { ...r, price: Number(price) || 0 } : r)),
      settings
    );
  const setName = (id, name) =>
    writeRates(rates.map((r) => (r.id === id ? { ...r, name } : r)), settings);
  const setS = (k, v) => writeRates(rates, { ...settings, [k]: v });

  return (
    <>
      <div className="sub">Your services</div>
      <div className="hint">
        Set these once. Every quote, retainer, and balance in the app comes from
        these numbers.
      </div>
      {rates.map((r) => (
        <div key={r.id} className="rate-row">
          <input value={r.name} onChange={(e) => setName(r.id, e.target.value)} />
          <div className="price-in">
            <span>$</span>
            <input
              type="number"
              value={r.price}
              onChange={(e) => setPrice(r.id, e.target.value)}
            />
          </div>
          <button
            className="slg-btn ghost tiny"
            onClick={() => writeRates(rates.filter((x) => x.id !== r.id), settings)}
          >
            ×
          </button>
        </div>
      ))}
      <button
        className="slg-btn ghost"
        onClick={() =>
          writeRates([...rates, { id: "s" + Date.now(), name: "New service", price: 0 }], settings)
        }
      >
        Add a service
      </button>

      <div className="sub">Terms</div>
      <div className="grid2">
        <Field label="Retainer %">
          <input type="number" value={settings.retainerPct}
            onChange={(e) => setS("retainerPct", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Balance due (days before)">
          <input type="number" value={settings.balanceLeadDays}
            onChange={(e) => setS("balanceLeadDays", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Travel radius (miles)">
          <input type="number" value={settings.travelRadius}
            onChange={(e) => setS("travelRadius", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Flat travel fee beyond that">
          <input type="number" value={settings.travelFee}
            onChange={(e) => setS("travelFee", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Second artist travel">
          <input type="number" value={settings.secondArtistTravel}
            onChange={(e) => setS("secondArtistTravel", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Minimum booking (on-location)">
          <input type="number" value={settings.minimumBooking}
            onChange={(e) => setS("minimumBooking", Number(e.target.value) || 0)} />
        </Field>
      </div>

      <div className="sub">Ballpark you quote first</div>
      <div className="hint">
        This is what drops into {"{ballpark}"} in your first reply.
      </div>
      <div className="grid2">
        <Field label="Bridal">
          <input value={settings.ballparkBridal} placeholder="$450"
            onChange={(e) => setS("ballparkBridal", e.target.value)} />
        </Field>
        <Field label="Special event">
          <input value={settings.ballparkEvent} placeholder="$180"
            onChange={(e) => setS("ballparkEvent", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

/* ---------------- styles ---------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=DM+Sans:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

.slg-root{
  --ground:#F6F1F2; --card:#FFFFFF; --ink:#2A1B2E; --plum:#5C1A3D;
  --gold:#B8862F; --gold-lite:#E8D4A8; --kum:#C2185B;
  --mute:#8B7A83; --line:#E7DBDF;
  background:var(--ground); color:var(--ink);
  font-family:'DM Sans',system-ui,sans-serif;
  min-height:100vh; padding:0 0 48px;
}
.slg-root *{box-sizing:border-box}
.slg-loading{padding:80px 24px; text-align:center; color:var(--mute); font-style:italic}

.slg-head{
  display:flex; align-items:flex-end; justify-content:space-between; gap:16px;
  padding:26px 20px 18px; max-width:820px; margin:0 auto; flex-wrap:wrap;
}
.slg-eyebrow{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.16em;
  text-transform:uppercase; color:var(--gold); margin-bottom:4px;
}
.slg-word{
  font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:31px;
  line-height:1; margin:0; color:var(--plum); letter-spacing:-.01em;
}
.slg-trial{text-align:right}
.slg-trial-dots{display:flex; gap:5px; justify-content:flex-end; margin-bottom:5px}
.slg-trial-dots .dot{
  width:11px; height:11px; border-radius:50%;
  border:1.5px solid var(--gold-lite); background:transparent;
}
.slg-trial-dots .dot.open{background:var(--gold); border-color:var(--gold)}
.slg-trial-label{
  font-family:'IBM Plex Mono',monospace; font-size:10px;
  letter-spacing:.06em; color:var(--mute);
}

.slg-tabs{
  display:flex; gap:2px; max-width:820px; margin:0 auto;
  padding:0 20px; border-bottom:1px solid var(--line); overflow-x:auto;
}
.slg-tab{
  background:none; border:none; cursor:pointer; white-space:nowrap;
  padding:9px 14px; font-family:'DM Sans',sans-serif; font-size:13.5px;
  color:var(--mute); border-bottom:2px solid transparent; margin-bottom:-1px;
}
.slg-tab.on{color:var(--plum); border-bottom-color:var(--gold); font-weight:500}
.slg-tab:focus-visible{outline:2px solid var(--kum); outline-offset:-2px}

.slg-main{max-width:820px; margin:0 auto; padding:18px 20px}

.slg-bar{display:flex; justify-content:space-between; align-items:center; margin-bottom:14px}
.slg-count{font-family:'IBM Plex Mono',monospace; font-size:11px; color:var(--mute); letter-spacing:.06em}

.slg-btn{
  font-family:'DM Sans',sans-serif; font-size:13px; font-weight:500;
  background:var(--plum); color:#fff; border:none; border-radius:2px;
  padding:8px 15px; cursor:pointer;
}
.slg-btn:disabled{opacity:.35; cursor:not-allowed}
.slg-btn.ghost{background:transparent; color:var(--mute); border:1px solid var(--line)}
.slg-btn.tiny{padding:4px 9px; font-size:14px; line-height:1}
.slg-btn:focus-visible{outline:2px solid var(--kum); outline-offset:2px}

.slg-empty{padding:30px 4px; color:var(--ink)}
.slg-empty p{margin:0 0 6px; font-size:14px}
.quiet{color:var(--mute); font-size:13px}

/* --- pleat meter: the signature --- */
.pleats{display:flex; gap:3px; align-items:flex-end; justify-content:flex-end}
.pleat{
  width:7px; height:24px; border:none; padding:0; cursor:pointer;
  background:#EFE4E7; transform:skewX(-9deg); border-radius:1px;
  transition:background .18s ease, height .18s ease;
}
.pleat.on{background:linear-gradient(180deg,var(--gold-lite),var(--gold))}
.pleat:hover{height:28px}
.pleat:focus-visible{outline:2px solid var(--kum); outline-offset:2px}
.stage-name{
  font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.08em;
  text-transform:uppercase; color:var(--mute); margin-top:6px; text-align:right;
}

.card{
  background:var(--card); border:1px solid var(--line); border-left:2px solid var(--gold-lite);
  border-radius:2px; padding:14px 16px; margin-bottom:9px; cursor:pointer;
}
.card.flag{border-left-color:var(--kum)}
.card-top{display:flex; justify-content:space-between; gap:14px; align-items:flex-start}
.card-id h3{
  font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:19px;
  margin:0 0 3px; color:var(--plum); display:flex; align-items:center; gap:8px; flex-wrap:wrap;
}
.card-sub{font-size:12.5px; color:var(--mute)}
.card-right{flex-shrink:0}
.tag{
  font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.08em;
  text-transform:uppercase; padding:2px 6px; border-radius:2px;
}
.tag.gold{background:#FBF3E2; color:var(--gold); border:1px solid var(--gold-lite)}

.card-strip{display:flex; gap:6px; margin-top:11px; flex-wrap:wrap}
.chip{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.05em;
  color:var(--mute); background:var(--ground); padding:3px 8px; border-radius:2px;
}
.chip.alert{background:#FCE7EF; color:var(--kum)}

.card-open{border-top:1px solid var(--line); margin-top:14px; padding-top:14px; cursor:default}
.sub{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--gold); margin:18px 0 8px;
}
.hint{font-size:12px; color:var(--mute); margin-bottom:10px; line-height:1.5}

.grid2{display:grid; grid-template-columns:1fr 1fr; gap:10px}
.field{display:flex; flex-direction:column; gap:4px}
.field.wide{grid-column:1/-1}
.field > span{
  font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--mute);
}
.slg-root input, .slg-root select, .slg-root textarea{
  font-family:'DM Sans',sans-serif; font-size:14px; color:var(--ink);
  background:#fff; border:1px solid var(--line); border-radius:2px;
  padding:7px 9px; width:100%;
}
.slg-root textarea{resize:vertical; line-height:1.55}
.slg-root input:focus, .slg-root select:focus, .slg-root textarea:focus{
  outline:none; border-color:var(--gold);
}

.svc{border:1px solid var(--line); border-radius:2px}
.svc-row{
  display:flex; align-items:center; gap:10px; padding:7px 11px;
  border-bottom:1px solid var(--line); font-size:13.5px;
}
.svc-row:last-child{border-bottom:none}
.svc-row.on{background:#FDFAF4}
.svc-name{flex:1}
.svc-price{font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--mute)}
.svc-price-in{display:flex; align-items:center; gap:3px; width:76px; flex-shrink:0}
.svc-price-in span{
  font-family:'IBM Plex Mono',monospace; font-size:11.5px; color:var(--mute);
}
.svc-price-in input{
  font-family:'IBM Plex Mono',monospace; font-size:12px; padding:4px 5px;
  text-align:right; border-color:transparent; background:transparent;
}
.svc-price-in input:hover{border-color:var(--line); background:#fff}
.svc-price-in input:focus{border-color:var(--gold); background:#fff}
.svc-name .tag{margin-left:7px}
.stepper{display:flex; align-items:center; gap:8px}
.stepper button{
  width:24px; height:24px; border:1px solid var(--line); background:#fff;
  border-radius:2px; cursor:pointer; color:var(--plum); font-size:14px; line-height:1;
}
.stepper span{
  font-family:'IBM Plex Mono',monospace; font-size:12px; width:12px; text-align:center;
}

.toggles{display:flex; flex-wrap:wrap; gap:7px; margin-top:11px}
.toggle{
  display:flex; align-items:center; gap:7px; cursor:pointer;
  font-family:'DM Sans',sans-serif; font-size:12.5px; color:var(--mute);
  background:#fff; border:1px solid var(--line); border-radius:2px; padding:6px 10px;
}
.toggle i{width:9px; height:9px; border:1.5px solid var(--line); border-radius:50%}
.toggle.on{color:var(--plum); border-color:var(--gold-lite); background:#FDFAF4}
.toggle.on i{background:var(--gold); border-color:var(--gold)}

.ledger{margin-top:14px; border-top:1px solid var(--line); padding-top:10px}
.ledger div{display:flex; justify-content:space-between; padding:3px 0; font-size:13px}
.ledger span{color:var(--mute)}
.ledger b{font-family:'IBM Plex Mono',monospace; font-weight:500}

.card-actions{display:flex; gap:8px; margin-top:14px; flex-wrap:wrap}
.addform{
  background:#fff; border:1px solid var(--line); border-radius:2px;
  padding:16px; margin-bottom:14px; display:flex; flex-direction:column; gap:12px;
}

.pickrow{margin-bottom:14px}
.tpl-list{display:flex; flex-wrap:wrap; gap:6px; margin-bottom:14px}
.tpl{
  font-family:'DM Sans',sans-serif; font-size:12.5px; cursor:pointer;
  background:#fff; border:1px solid var(--line); border-radius:2px;
  padding:6px 11px; color:var(--mute);
}
.tpl.on{background:var(--plum); border-color:var(--plum); color:#fff}
.tplnum{
  font-family:'IBM Plex Mono',monospace; font-size:10px; opacity:.7; margin-left:3px;
}
.tpl-panel{background:#fff; border:1px solid var(--line); border-radius:2px; padding:16px}
.tpl-when{font-size:12px; color:var(--gold); font-style:italic; margin-bottom:12px}
.tpl-body{
  font-family:'DM Sans',sans-serif; font-size:14px; line-height:1.65;
  white-space:pre-wrap; margin:0; background:var(--ground);
  padding:14px; border-radius:2px; border-left:2px solid var(--gold-lite);
}

.stats{display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-bottom:6px}
.stat{background:#fff; border:1px solid var(--line); border-radius:2px; padding:14px}
.stat b{
  display:block; font-family:'Fraunces',Georgia,serif; font-weight:400;
  font-size:25px; color:var(--plum);
}
.stat span{font-size:11.5px; color:var(--mute)}
.row{
  display:flex; justify-content:space-between; align-items:center; gap:12px;
  background:#fff; border:1px solid var(--line); border-left:2px solid var(--gold-lite);
  border-radius:2px; padding:11px 14px; margin-bottom:7px; font-size:13.5px;
  flex-wrap:wrap;
}
.row-main{flex:1 1 auto; min-width:120px}
.paybtn{
  font-family:'DM Sans',sans-serif; font-size:12px; cursor:pointer;
  background:#fff; color:var(--plum); border:1px solid var(--gold-lite);
  border-radius:2px; padding:6px 11px; white-space:nowrap; flex-shrink:0;
}
.paybtn:hover{background:#FDFAF4}
.paybtn.armed{background:var(--plum); border-color:var(--plum); color:#fff}
.paybtn:focus-visible{outline:2px solid var(--kum); outline-offset:2px}
.row.soon{border-left-color:var(--kum)}
.row-right{text-align:right; display:flex; flex-direction:column; gap:2px}
.row b{font-family:'IBM Plex Mono',monospace; font-weight:500}

.rate-row{display:flex; gap:8px; align-items:center; margin-bottom:6px}
.rate-row > input{flex:1}

.subrow{
  display:flex; justify-content:space-between; align-items:center; gap:10px;
}
.linkbtn{
  background:none; border:none; cursor:pointer; padding:2px 0;
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--plum); text-decoration:underline;
  text-underline-offset:3px;
}
.linkbtn:hover{color:var(--kum)}
.linkbtn:focus-visible{outline:2px solid var(--kum); outline-offset:2px}
.ledger.flat{margin-top:0; border-top:none; padding-top:0}
.artist{
  border:1px solid var(--line); border-left:2px solid var(--gold-lite);
  border-radius:2px; padding:12px; margin-bottom:9px; background:#FDFCFB;
}
.artist-head{
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:10px;
}
.artist-head span{
  font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.12em;
  text-transform:uppercase; color:var(--mute);
}
.ledger b.owed{color:var(--kum)}

.alines{border:1px solid var(--line); border-radius:2px; margin-top:10px; background:#fff}
.aline{
  display:flex; align-items:center; gap:8px; padding:6px 9px;
  border-bottom:1px solid var(--line); font-size:13px;
}
.aline:last-child{border-bottom:none}
.aline.on{background:#FDFAF4}
.aline-name{flex:1; min-width:70px}
.aline-sum{
  font-family:'IBM Plex Mono',monospace; font-size:12px; width:58px;
  text-align:right; flex-shrink:0; color:var(--plum);
}
.aline .stepper{width:64px; justify-content:center}

.takeaway{
  border:1px solid var(--gold-lite); border-radius:2px; background:#FDFAF4;
  padding:11px 14px; margin-top:4px;
}
.takeaway div{display:flex; justify-content:space-between; padding:3px 0; font-size:13px}
.takeaway span{color:var(--mute)}
.takeaway b{font-family:'IBM Plex Mono',monospace; font-weight:500}
.takeaway-net{
  border-top:1px solid var(--gold-lite); margin-top:5px; padding-top:8px !important;
}
.takeaway-net span{color:var(--plum) !important; font-weight:500}
.takeaway-net b{font-size:15px; color:var(--plum)}
.takeaway b.owed{color:var(--kum)}

.todo{
  display:flex; align-items:center; gap:9px; padding:6px 0;
  border-bottom:1px solid var(--line); font-size:13.5px;
}
.todo:last-child{border-bottom:none}
.todo-tick{
  width:17px; height:17px; flex-shrink:0; cursor:pointer; padding:0;
  border:1.5px solid var(--gold-lite); border-radius:2px; background:#fff;
  color:#fff; font-size:11px; line-height:1;
}
.todo.done .todo-tick{background:var(--gold); border-color:var(--gold)}
.todo-tick:focus-visible{outline:2px solid var(--kum); outline-offset:2px}
.todo-text{flex:1; line-height:1.45}
.todo.done .todo-text{color:var(--mute); text-decoration:line-through}
.todo-x{
  background:none; border:none; cursor:pointer; color:var(--mute);
  font-size:16px; line-height:1; padding:0 2px; flex-shrink:0;
}
.todo-add{display:flex; gap:7px; margin-top:11px}
.goalitem{margin-bottom:4px}
.notestoggle{
  background:none; border:none; cursor:pointer; padding:2px 0 6px 26px;
  font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--gold);
}
.notestoggle:hover{color:var(--plum)}
.notesnum{background:#FBF3E2; border-radius:2px; padding:1px 5px; margin-left:6px}
.notespanel{
  margin:0 0 10px 26px; padding:10px 12px; background:#FDFAF4;
  border:1px solid var(--gold-lite); border-radius:2px;
  display:flex; flex-direction:column; gap:8px;
}
.noteslot{display:flex; flex-direction:column; gap:3px}
.noteslot > span{
  font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--mute);
}
.noteslot textarea{font-size:13px}

.editable{cursor:text; border-bottom:1px dotted transparent; padding-bottom:1px}
.editable:hover{border-bottom-color:var(--gold-lite)}
.inlineedit{
  font-family:'DM Sans',sans-serif; font-size:13.5px; padding:3px 6px !important;
  border-color:var(--gold) !important;
}
.task{margin-bottom:2px}
.shoot{
  background:#fff; border:1px solid var(--line); border-left:2px solid var(--gold);
  border-radius:2px; padding:13px 15px; margin-bottom:8px;
}
.shoot.done{border-left-color:var(--gold-lite); background:#FDFCFB}
.shoot-top{display:flex; justify-content:space-between; align-items:flex-start; gap:12px; cursor:pointer}
.shoot-top h4{
  font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:18px;
  margin:0 0 3px; color:var(--plum);
}
.shoot.done .shoot-top h4{color:var(--mute)}
.shoot-open{border-top:1px solid var(--line); margin-top:12px; padding-top:12px; cursor:default}
.pgroup{margin-bottom:8px}
.pgroup-kind{
  font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.12em;
  text-transform:uppercase; color:var(--gold); margin-bottom:2px;
}
.addperson{display:flex; gap:7px; align-items:flex-start; margin-top:10px}
.addperson > select{width:150px; flex-shrink:0}
.addperson .todo-add{margin-top:0; flex:1}

.logline{
  display:flex; gap:10px; align-items:baseline; padding:6px 0;
  border-bottom:1px solid var(--line); font-size:13px;
}
.logline:last-of-type{border-bottom:none}
.logdate{
  font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--gold);
  white-space:nowrap; width:74px; flex-shrink:0;
}
.logtext{flex:1; line-height:1.5}
.ofgoal{font-style:normal; font-size:16px; color:var(--mute)}

.vendor{
  background:#fff; border:1px solid var(--line); border-left:2px solid var(--gold-lite);
  border-radius:2px; padding:11px 14px; margin-bottom:7px;
}
.vendor-head{display:flex; justify-content:space-between; align-items:center; gap:10px}
.vendor-acts{display:flex; align-items:center; gap:10px; flex-shrink:0}
.vendor.blocked{border-left-color:var(--kum); background:#FEFAFB}
.vendor.blocked .vendor-head b{color:var(--mute)}
.vendor.blocked .vendor-link{color:var(--mute)}
.vkind{
  font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.08em;
  text-transform:uppercase; color:var(--mute); margin-left:8px;
  border:1px solid var(--line); border-radius:2px; padding:2px 6px;
}
.sub.alertsub{color:var(--kum)}
.vendor-head b{
  font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:17px; color:var(--plum);
}
.vendor-link{
  display:block; font-family:'IBM Plex Mono',monospace; font-size:11.5px;
  color:var(--gold); text-decoration:none; margin-top:2px; word-break:break-all;
}
.vendor-link:hover{text-decoration:underline}
.vendor-line{font-size:12.5px; color:var(--ink); margin-top:3px}
.vendor-note{font-size:12px; color:var(--mute); margin-top:4px; line-height:1.5}

.pillar{
  background:#fff; border:1px solid var(--line); border-left:2px solid var(--gold-lite);
  border-radius:2px; padding:13px 15px; margin-bottom:10px;
}
.pillar-head{display:flex; justify-content:space-between; align-items:baseline; gap:10px}
.pillar-head b{
  font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:18px; color:var(--plum);
}
.pillar-count{
  font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--mute);
  white-space:nowrap;
}
.pillar-note{font-size:12.5px; color:var(--mute); line-height:1.5; margin:3px 0 8px}
.pillar .sub-add{margin-left:0}
.aesthetic{display:flex; flex-wrap:wrap; gap:7px}
.aes{
  font-family:'DM Sans',sans-serif; font-size:12.5px; color:var(--plum);
  background:#FDFAF4; border:1px solid var(--gold-lite); border-radius:2px;
  padding:6px 11px;
}
.todayband{
  background:var(--plum); color:#fff; border-radius:2px; padding:14px 16px;
  margin-bottom:12px; display:flex; flex-direction:column; gap:3px;
}
.todayband.weekend{background:#7A6470}
.todayband-day{
  font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--gold-lite);
}
.todayband b{font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:22px}
.todayband-note{font-size:12.5px; opacity:.85; line-height:1.5}
.week{border:1px solid var(--line); border-radius:2px; background:#fff; margin-bottom:10px}
.wday{display:flex; gap:12px; padding:10px 13px; border-bottom:1px solid var(--line)}
.wday:last-child{border-bottom:none}
.wday.on{background:#FDFAF4}
.wday-name{
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--gold); width:32px; flex-shrink:0;
  padding-top:3px;
}
.wday.on .wday-name{color:var(--plum); font-weight:500}
.wday-body{display:flex; flex-direction:column; gap:2px}
.wday-body b{
  font-weight:500; font-size:13.5px; color:var(--ink);
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
}
.wday-body span{font-size:12px; color:var(--mute); line-height:1.5}
.tag.soft{background:var(--ground); color:var(--mute); border:1px solid var(--line)}
.todo.sub{padding-left:26px; border-bottom:none; padding-top:3px; padding-bottom:3px}
.todo.sub .todo-text{font-size:12.5px; color:var(--mute)}
.todo-tick.small{width:13px; height:13px; font-size:9px}
.subcount{
  font-family:'IBM Plex Mono',monospace; font-size:10px; color:var(--gold);
  background:#FBF3E2; border-radius:2px; padding:1px 5px; margin-left:8px;
}
.sub-add{margin:4px 0 8px 26px}
.sub-add input{font-size:13px; padding:5px 8px}
.todo-add input{flex:1}
.quicks{display:flex; flex-wrap:wrap; gap:6px; margin-top:9px}
.quick{
  font-family:'DM Sans',sans-serif; font-size:11.5px; cursor:pointer;
  background:var(--ground); border:1px solid var(--line); border-radius:2px;
  padding:4px 9px; color:var(--mute);
}
.quick:hover{border-color:var(--gold-lite); color:var(--plum)}
.chip.todo-chip{background:#FBF3E2; color:var(--gold)}

.rollup{
  background:#fff; border:1px solid var(--line); border-left:2px solid var(--gold);
  border-radius:2px; padding:4px 14px 8px; margin-bottom:14px;
}
.rollup-head{
  display:flex; justify-content:space-between; align-items:center; width:100%;
  background:none; border:none; cursor:pointer; padding:9px 0;
  font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.14em;
  text-transform:uppercase; color:var(--gold);
}
.rollup-caret{font-size:14px; line-height:1}

.scoregrid{display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-bottom:8px}
.score{
  background:#fff; border:1px solid var(--line); border-left:2px solid var(--gold-lite);
  border-radius:2px; padding:12px 13px; display:flex; flex-direction:column; gap:3px;
}
.score-label{
  font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--mute);
}
.score b{
  font-family:'Fraunces',Georgia,serif; font-weight:400; font-size:26px;
  color:var(--plum); line-height:1.05;
}
.score-delta{font-size:11px}
.score-delta.up{color:#4A7C4E}
.score-delta.dn{color:var(--kum)}
.score-delta.flat{color:var(--mute)}
.score-note{font-size:11px; color:var(--mute)}

.histwrap{overflow-x:auto; border:1px solid var(--line); border-radius:2px; background:#fff}
.hist{width:100%; border-collapse:collapse; font-size:13px}
.hist th{
  font-family:'IBM Plex Mono',monospace; font-size:9.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--gold); font-weight:400;
  text-align:right; padding:9px 10px; border-bottom:1px solid var(--line);
}
.hist th:first-child{text-align:left}
.hist td{
  padding:8px 10px; text-align:right; border-bottom:1px solid var(--line);
  font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--ink);
}
.hist td:first-child{
  text-align:left; font-family:'DM Sans',sans-serif; color:var(--mute);
}
.hist tr:last-child td{border-bottom:none}
.hist tr.now td{background:#FDFAF4}
.hist tr.now td:first-child{color:var(--plum); font-weight:500}
.hist td.up{color:#4A7C4E}
.hist td.dn{color:var(--kum)}

.goalblock{
  background:#fff; border:1px solid var(--line); border-left:2px solid var(--gold-lite);
  border-radius:2px; padding:13px 15px; margin-bottom:10px;
}
.goalrow{
  display:flex; justify-content:space-between; align-items:baseline;
  gap:12px; font-size:13px; margin-bottom:6px;
}
.goalrow span{color:var(--mute)}
.goalrow b{font-family:'IBM Plex Mono',monospace; font-weight:500; color:var(--plum)}
.goalrow b em{font-style:normal; color:var(--mute); font-weight:400}
.bar{
  height:6px; background:#EFE4E7; border-radius:3px; overflow:hidden;
  margin-bottom:14px;
}
.bar:last-child{margin-bottom:0}
.bar-fill{
  height:100%; background:linear-gradient(90deg,var(--gold-lite),var(--gold));
  border-radius:3px; transition:width .3s ease;
}

.monthbar{
  display:flex; align-items:center; gap:8px; margin-bottom:14px;
  padding-bottom:12px; border-bottom:1px solid var(--line);
}
.monthname{
  flex:1; font-family:'Fraunces',Georgia,serif; font-size:21px;
  color:var(--plum); line-height:1;
}
.daybox{
  flex-shrink:0; width:40px; text-align:center; border-right:1px solid var(--line);
  padding-right:10px; margin-right:2px;
}
.daybox b{
  display:block; font-family:'Fraunces',Georgia,serif; font-weight:400;
  font-size:19px; color:var(--plum); line-height:1.1;
}
.daybox span{
  font-family:'IBM Plex Mono',monospace; font-size:9px; letter-spacing:.08em;
  text-transform:uppercase; color:var(--mute);
}
.wide-price{width:100%; max-width:260px; margin-bottom:4px}
.price-in{display:flex; align-items:center; gap:4px; width:104px}
.price-in span{color:var(--mute); font-family:'IBM Plex Mono',monospace; font-size:13px}

@media (max-width:560px){
  .grid2, .stats{grid-template-columns:1fr}
  .slg-word{font-size:26px}
  .card-top{flex-direction:column; gap:10px}
  .card-right{align-self:flex-start}
  .pleats{justify-content:flex-start}
  .stage-name{text-align:left}
}
@media (prefers-reduced-motion:reduce){
  .slg-root *{transition:none !important}
}
`;
