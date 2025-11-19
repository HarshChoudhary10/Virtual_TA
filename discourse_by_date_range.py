import os
import json
import requests
from datetime import datetime, timezone
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright

# ------------------------------
# CONFIG
# ------------------------------
BASE_URL = "https://discourse.onlinedegree.iitm.ac.in"
CATEGORY_SLUG = "courses/tds-kb"
CATEGORY_ID = 34

START_DATE = "2025-01-01"
END_DATE   = "2025-04-15"

OUTPUT_DIR = "discourse_json"
AUTH_STATE_FILE = "auth.json"

POST_BATCH = 50
MAX_EMPTY = 5


# ------------------------------
# AUTH / LOGIN HANDLING
# ------------------------------

def login_if_needed():
    """Open a browser for manual login if auth.json missing."""
    if os.path.exists(AUTH_STATE_FILE):
        return

    print("\n⚠️  No auth.json found — opening browser for login.")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        page.goto(f"{BASE_URL}/login")
        print("➡️  Log in manually. After login, press 'Resume' in Playwright.")
        page.pause()
        context.storage_state(path=AUTH_STATE_FILE)
        browser.close()
    print("✔ Login saved to auth.json")


def load_cookie_headers():
    """Build a raw Cookie: header exactly as the browser sends it."""
    with open(AUTH_STATE_FILE, "r") as f:
        data = json.load(f)

    cookies = data["cookies"]
    cookie_header = "; ".join([f"{c['name']}={c['value']}" for c in cookies])

    return {
        "Cookie": cookie_header,
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
    }


# ------------------------------
# FETCH TOPIC LIST
# ------------------------------

def fetch_topics_in_range(headers, start_dt, end_dt):
    """Paginate through category pages and collect topic IDs."""
    ids = []
    empty = 0
    page = 0

    print(f"\nFetching topics between {start_dt} and {end_dt}")

    while True:
        url = f"{BASE_URL}/c/{CATEGORY_SLUG}/{CATEGORY_ID}.json?order=created&page={page}"
        print(f"Page {page}: {url}")

        try:
            r = requests.get(url, headers=headers, timeout=20)
            r.raise_for_status()
        except Exception as e:
            print(f"❌ Error fetching page {page}: {e}")
            break

        data = r.json()
        topics = data.get("topic_list", {}).get("topics", [])

        if not topics:
            empty += 1
            print(f"   → No topics on this page. Empty streak = {empty}")
            if empty >= MAX_EMPTY:
                print("   → Stopping pagination.")
                break
            page += 1
            continue

        # Reset empty streak because this page had topics
        empty = 0

        for topic in topics:
            created_at = topic.get("created_at")
            if not created_at:
                continue

            try:
                t = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except:
                continue

            if start_dt <= t <= end_dt:
                ids.append(topic["id"])
                print(f"   ✔ Found topic {topic['id']} at {created_at}")

        # Check if more pages available
        more = data.get("topic_list", {}).get("more_topics_url")
        if not more:
            print("   → No more pages.")
            break

        page += 1

    print(f"\nTotal topics found: {len(ids)}")
    return list(set(ids))


# ------------------------------
# FETCH FULL TOPIC JSON
# ------------------------------

def fetch_full_topic(topic_id, headers):
    print(f"→ Fetching topic {topic_id}")
    url = f"{BASE_URL}/t/{topic_id}.json"

    try:
        r = requests.get(url, headers=headers, timeout=20)
        r.raise_for_status()
    except Exception as e:
        print(f"❌ Failed: {e}")
        return None

    topic_data = r.json()

    # Get missing post IDs
    stream = topic_data.get("post_stream", {})
    all_ids = stream.get("stream", [])
    loaded_posts = {p["id"]: p for p in stream.get("posts", [])}
    missing = [pid for pid in all_ids if pid not in loaded_posts]

    # Batch fetch missing posts
    for i in range(0, len(missing), POST_BATCH):
        batch = missing[i:i + POST_BATCH]
        params = [("post_ids[]", pid) for pid in batch]
        purl = f"{BASE_URL}/t/{topic_id}/posts.json"

        try:
            r2 = requests.get(purl, params=params, headers=headers, timeout=20)
            r2.raise_for_status()
            posts = r2.json()
            if isinstance(posts, list):
                for p in posts:
                    loaded_posts[p["id"]] = p
        except Exception as e:
            print(f"   ⚠ Error fetching batch {batch}: {e}")

    # Reorder posts according to stream
    topic_data["post_stream"]["posts"] = [loaded_posts[pid] for pid in all_ids if pid in loaded_posts]

    return topic_data


# ------------------------------
# SAVE JSON
# ------------------------------

def save_topic(topic_id, data):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, f"topic_{topic_id}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"   ✔ Saved {path}")


# ------------------------------
# MAIN
# ------------------------------

def main():
    print("\n=== Starting Discourse Downloader ===\n")

    login_if_needed()
    headers = load_cookie_headers()

    start_dt = datetime.fromisoformat(START_DATE + "T00:00:00").replace(tzinfo=timezone.utc)
    end_dt   = datetime.fromisoformat(END_DATE   + "T23:59:59").replace(tzinfo=timezone.utc)

    topic_ids = fetch_topics_in_range(headers, start_dt, end_dt)

    if not topic_ids:
        print("❌ No topics found in date range.")
        return

    print(f"\nDownloading {len(topic_ids)} topics...\n")

    for i, tid in enumerate(topic_ids, 1):
        print(f"[{i}/{len(topic_ids)}] Topic {tid}")
        data = fetch_full_topic(tid, headers)
        if data:
            save_topic(tid, data)

    print("\n✔ DONE")


if __name__ == "__main__":
    main()

