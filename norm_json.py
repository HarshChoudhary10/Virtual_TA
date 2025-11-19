import os
import json
from pathlib import Path

RAW_DIR = "discourse_json"          # where topic_1234.json files are saved
OUT_DIR = "downloaded_threads"      # what your embedding script expects

os.makedirs(OUT_DIR, exist_ok=True)

def normalize_topic_file(path):
    with open(path, "r", encoding="utf-8") as f:
        topic = json.load(f)

    topic_id = topic.get("id")
    title = topic.get("title", "")

    posts = topic.get("post_stream", {}).get("posts", [])
    print(f"Processing topic {topic_id} → {len(posts)} posts")

    normalized = []

    for p in posts:
        post_id = p.get("id")
        post_number = p.get("post_number")
        cooked = p.get("cooked", "")  # HTML content

        # Convert HTML → plain text
        try:
            from bs4 import BeautifulSoup
            text = BeautifulSoup(cooked, "html.parser").get_text(separator="\n").strip()
        except:
            text = cooked

        normalized.append({
            "post_id": post_id,
            "post_number": post_number,
            "topic_id": topic_id,
            "topic_title": title,
            "author": p.get("username", ""),
            "content": text
        })

    out_path = os.path.join(OUT_DIR, f"{topic_id}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(normalized, f, indent=2, ensure_ascii=False)

    print(f"✔ Saved normalized JSON → {out_path}")


def main():
    for file in os.listdir(RAW_DIR):
        if not file.endswith(".json"):
            continue
        normalize_topic_file(os.path.join(RAW_DIR, file))

    print("\n🎉 All topic files normalized!")


if __name__ == "__main__":
    main()

