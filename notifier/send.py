"""Sends phone notifications for Sara Luxe Glam Studio.

Run every 5 minutes by .github/workflows/notify.yml. Each run:
  1. announces any NEW website inquiry (right away),
  2. announces booked events that are 2 days away (once, from 8am Central),
  3. once a day (from 9am Central) lists follow-ups that are due.

It reads your clients straight from Supabase with the service key, sends
the push with your VAPID key, and records what it has announced in the
notification_state table so nothing is ever sent twice.

`python notifier/send.py --test` just sends a test notification to every
device that has enabled notifications.
"""
import datetime as dt
import json
import os
import sys
from zoneinfo import ZoneInfo

import requests
from py_vapid import Vapid01
from pywebpush import WebPushException, webpush

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
VAPID_PRIVATE_KEY = os.environ["VAPID_PRIVATE_KEY"].strip()
APP_URL = os.environ.get("APP_URL", "https://saranyaramesh95-tech.github.io/sara-luxe-glam-studio/")
TZ = ZoneInfo("America/Chicago")

EVENT_REMINDER_DAYS = 2
EVENT_REMINDER_FROM_HOUR = 8
FOLLOWUP_DIGEST_FROM_HOUR = 9
INQUIRY_MAX_AGE_DAYS = 3  # older unannounced inquiries are marked done quietly

# The notification services accept either a mailto: address or a web address
# to identify the sender. Use the app's web address, so no personal email
# address is ever attached to a notification; the library's strict mode only
# knows about mailto:, so relax that one check.
VAPID = Vapid01.from_string(private_key=VAPID_PRIVATE_KEY)
VAPID.conf = {"no-strict": True}

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}


def rest(method, path, headers=None, **kwargs):
    resp = requests.request(
        method,
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={**HEADERS, **(headers or {})},
        timeout=30,
        **kwargs,
    )
    if resp.status_code >= 300:
        raise RuntimeError(f"{method} {path} -> {resp.status_code} {resp.text[:300]}")
    return resp.json() if resp.text else None


def get_state(key):
    rows = rest("GET", f"notification_state?key=eq.{key}&select=value")
    return rows[0]["value"] if rows else None


def set_state(key, value="1"):
    rest(
        "POST",
        "notification_state",
        headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        data=json.dumps({"key": key, "value": value}),
    )


def subscriptions():
    return rest("GET", "push_subscriptions?select=id,endpoint,p256dh,auth") or []


def send_all(payload):
    """Push to every enabled device. Returns how many it reached."""
    subs = subscriptions()
    reached = 0
    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys": {"p256dh": sub["p256dh"], "auth": sub["auth"]},
                },
                data=json.dumps(payload),
                vapid_private_key=VAPID,
                vapid_claims={"sub": APP_URL},
                ttl=60 * 60 * 24,
            )
            reached += 1
        except WebPushException as e:
            status = getattr(e.response, "status_code", None)
            if status in (404, 410):  # app removed / permission revoked
                rest("DELETE", f"push_subscriptions?id=eq.{sub['id']}")
                print(f"  removed a dead subscription ({status})")
            else:
                print(f"  push failed: {e}")
    return reached


def pretty_date(iso):
    d = dt.date.fromisoformat(iso)
    return f"{d.strftime('%a %b')} {d.day}"


def new_inquiries():
    rows = rest("GET", "inquiries?notified=eq.false&select=id,answers,created_at&order=created_at.asc") or []
    if not rows:
        return 0
    now = dt.datetime.now(dt.timezone.utc)
    sent = 0
    for row in rows:
        created = dt.datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
        stale = (now - created).days >= INQUIRY_MAX_AGE_DAYS
        if not stale:
            a = row.get("answers") or {}
            bits = [a.get("name") or "Someone", a.get("eventType"), pretty_date(a["eventDate"]) if a.get("eventDate") else None]
            body = " · ".join(b for b in bits if b)
            if not send_all({"title": "New inquiry 🤍", "body": body, "url": APP_URL}):
                continue  # nobody to tell yet — keep it, announce once a device is enabled
            sent += 1
        rest("PATCH", f"inquiries?id=eq.{row['id']}", data=json.dumps({"notified": True}))
    return sent


def all_client_lists():
    rows = rest("GET", "app_state?key=eq.slg:clients&select=user_id,value") or []
    return [r["value"] for r in rows if isinstance(r.get("value"), list)]


def event_reminders(now):
    if now.hour < EVENT_REMINDER_FROM_HOUR:
        return 0
    target = (now.date() + dt.timedelta(days=EVENT_REMINDER_DAYS)).isoformat()
    sent = 0
    for clients in all_client_lists():
        for c in clients:
            if c.get("archived") == "lost" or (c.get("stage") or 0) < 3:
                continue
            days = [d for d in [c.get("eventDate"), *(c.get("extraDates") or [])] if d]
            if target not in days:
                continue
            key = f"ev{EVENT_REMINDER_DAYS}:{c.get('id')}:{target}"
            if get_state(key):
                continue
            bits = [pretty_date(target), c.get("occasion") or c.get("type")]
            if c.get("readyTime"):
                bits.append(f"ready by {c['readyTime']}")
            if c.get("location"):
                bits.append(c["location"])
            body = " · ".join(str(b) for b in bits if b)
            if send_all({"title": f"In {EVENT_REMINDER_DAYS} days: {c.get('name') or 'Booking'}", "body": body, "url": APP_URL}):
                set_state(key)
                sent += 1
    return sent


def followup_digest(now):
    if now.hour < FOLLOWUP_DIGEST_FROM_HOUR:
        return 0
    today = now.date().isoformat()
    key = f"fu:{today}"
    if get_state(key):
        return 0
    due = []
    for clients in all_client_lists():
        for c in clients:
            if c.get("archived") in ("lost", "done") or (c.get("stage") or 0) >= 3:
                continue
            if c.get("nudgeOn") and c["nudgeOn"] <= today:
                due.append(c.get("name") or "Untitled")
    if not due:
        return 0
    n = len(due)
    shown = ", ".join(due[:6]) + (f" +{n - 6} more" if n > 6 else "")
    if send_all({"title": f"{n} follow-up{'s' if n != 1 else ''} due", "body": shown, "url": APP_URL}):
        set_state(key)
        return 1
    return 0


def main():
    if "--test" in sys.argv:
        n = send_all({"title": "Notifications are on 🤍", "body": "This is a test from Sara Luxe Glam Studio.", "url": APP_URL})
        print(f"Test sent to {n} device(s).")
        if n == 0:
            print("No devices have enabled notifications yet.")
        return

    # NOTIFIER_NOW is only for testing the timing rules
    forced = os.environ.get("NOTIFIER_NOW")
    now = dt.datetime.fromisoformat(forced).astimezone(TZ) if forced else dt.datetime.now(TZ)
    print(f"Run at {now:%Y-%m-%d %H:%M} Central, {len(subscriptions())} device(s) enabled")
    print("new inquiries announced:", new_inquiries())
    print("event reminders sent:", event_reminders(now))
    print("follow-up digests sent:", followup_digest(now))


if __name__ == "__main__":
    main()
