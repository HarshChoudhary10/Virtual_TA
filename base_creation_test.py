import os
import json
import sqlite3
import uuid
from pathlib import Path
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import logging
from tqdm import tqdm

from sentence_transformers import SentenceTransformer
import torch

# === Logging Setup ===
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# === Config ===
FORUM_DIR = "downloaded_threads"
COURSE_DIR = "markdown_files"
DB_PATH = "knowledge_base.db"
CHUNK_SIZE = 750
CHUNK_OVERLAP = 70

# === Load embedding model ===
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"Using PyTorch device: {device}")

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device=device)


# -----------------------------
# Helpers
# -----------------------------
def chunk_text(text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """Split long text into overlapping chunks."""
    chunks, start = [], 0
    while start < len(text):
        end = start + size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += size - overlap
    return chunks


def embed(texts):
    """Compute embeddings for text list."""
    emb = model.encode(texts, convert_to_numpy=True, batch_size=16)
    return [e.tolist() for e in emb]


def clean_html(text):
    """Strip HTML safely."""
    try:
        return BeautifulSoup(text, "html.parser").get_text(separator=" ").strip()
    except:
        return text or ""


def extract_value(obj, keys, default=None):
    """Extract first existing key from list."""
    for k in keys:
        if k in obj and obj[k]:
            return obj[k]
    return default


def create_db():
    """Recreate SQLite DB with forum + course tables."""
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE forum_chunks (
            chunk_id TEXT PRIMARY KEY,
            post_id INTEGER,
            post_number INTEGER,
            topic_id INTEGER,
            topic_title TEXT,
            author TEXT,
            url TEXT,
            text TEXT,
            embedding BLOB
        )
    """)

    cur.execute("""
        CREATE TABLE course_chunks (
            chunk_id TEXT PRIMARY KEY,
            source_file TEXT,
            section_title TEXT,
            url TEXT,
            text TEXT,
            embedding BLOB
        )
    """)

    conn.commit()
    return conn


# -----------------------------
# Forum JSON Normalizer
# -----------------------------
def normalize_post(post, topic_meta):
    """Convert ANY post JSON structure to unified fields."""
    content = extract_value(
        post,
        ["cooked", "raw", "content", "text", "body"],
        "",
    )
    content = clean_html(content)

    return {
        "post_id": extract_value(post, ["id", "post_id"], None),
        "post_number": extract_value(post, ["post_number", "number"], None),
        "topic_id": topic_meta.get("topic_id"),
        "topic_title": topic_meta.get("topic_title"),
        "author": extract_value(post, ["username", "author", "name", "user"], ""),
        "url": topic_meta["url"],
        "content": content,
    }


def process_forum_json(filepath, conn):
    logger.info(f"📁 Processing forum JSON: {filepath}")

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    posts = []

    # --- FORMAT 1: Discourse topic JSON ---
    if isinstance(data, dict) and "post_stream" in data:
        topic_id = data.get("id")
        topic_title = data.get("title", "")
        topic_url = f"https://discourse.onlinedegree.iitm.ac.in/t/{topic_id}"

        for p in data["post_stream"]["posts"]:
            posts.append(
                normalize_post(p, {
                    "topic_id": topic_id,
                    "topic_title": topic_title,
                    "url": topic_url
                })
            )

    # --- FORMAT 2: List of posts ---
    elif isinstance(data, list):
        for p in data:
            topic_id = extract_value(p, ["topic_id", "topic"], None)
            topic_title = extract_value(p, ["topic_title", "title"], "")
            posts.append(
                normalize_post(
                    p,
                    {
                        "topic_id": topic_id,
                        "topic_title": topic_title,
                        "url": f"https://discourse.onlinedegree.iitm.ac.in/t/{topic_id}",
                    }
                )
            )

    else:
        logger.warning(f"⚠ Unknown JSON format → skipping: {filepath}")
        return

    inserted = 0

    for post in posts:
        if not post["content"]:
            continue

        chunks = chunk_text(post["content"])
        embeddings = embed(chunks)

        for chunk, emb in zip(chunks, embeddings):
            conn.execute(
                "INSERT INTO forum_chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    str(uuid.uuid4()),
                    post["post_id"],
                    post["post_number"],
                    post["topic_id"],
                    post["topic_title"],
                    post["author"],
                    post["url"],
                    chunk,
                    json.dumps(emb),
                ),
            )
            inserted += 1

    logger.info(f"✅ Inserted {inserted} chunks from {filepath}")


# -----------------------------
# Course Markdown Processor
# -----------------------------
def process_course_md(filepath, conn):
    logger.info(f"📘 Processing course markdown: {filepath}")

    content = Path(filepath).read_text(encoding="utf-8")
    lines = content.splitlines()

    # Extract YAML front-matter
    url = None
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].startswith("original_url:"):
                url = lines[i].split(":", 1)[1].strip().strip('"')
            if lines[i].strip() == "---":   # end front matter
                lines = lines[i+1:]
                break

    section_title = ""
    buffer = ""
    total_inserted = 0

    for line in lines:
        if line.strip().startswith("#"):     # new section
            # flush previous
            if buffer.strip():
                chunks = chunk_text(buffer)
                embeddings = embed(chunks)
                for chunk, emb in zip(chunks, embeddings):
                    conn.execute(
                        "INSERT INTO course_chunks VALUES (?, ?, ?, ?, ?, ?)",
                        (
                            str(uuid.uuid4()),
                            os.path.basename(filepath),
                            section_title,
                            url,
                            chunk,
                            json.dumps(emb),
                        )
                    )
                    total_inserted += 1

                buffer = ""

            section_title = line.strip("# ").strip()

        else:
            buffer += line + "\n"

    # flush last
    if buffer.strip():
        chunks = chunk_text(buffer)
        embeddings = embed(chunks)
        for chunk, emb in zip(chunks, embeddings):
            conn.execute(
                "INSERT INTO course_chunks VALUES (?, ?, ?, ?, ?, ?)",
                (
                    str(uuid.uuid4()),
                    os.path.basename(filepath),
                    section_title,
                    url,
                    chunk,
                    json.dumps(emb),
                )
            )
            total_inserted += 1

    logger.info(f"✅ Inserted {total_inserted} chunks from {filepath}")


# -----------------------------
# MAIN
# -----------------------------
def main():
    logger.info("🔨 Rebuilding knowledge base database...")
    conn = create_db()

    # ---- Process Forum JSON ----
    forum_files = [f for f in os.listdir(FORUM_DIR) if f.endswith(".json")]
    logger.info(f"📚 Forum JSON Files: {len(forum_files)}")

    for file in tqdm(forum_files, desc="Forum JSON Files"):
        process_forum_json(os.path.join(FORUM_DIR, file), conn)

    # ---- Process Course Markdown ----
    course_files = [f for f in os.listdir(COURSE_DIR) if f.endswith(".md")]
    logger.info(f"📘 Course Markdown Files: {len(course_files)}")

    for file in tqdm(course_files, desc="Course Markdown Files"):
        process_course_md(os.path.join(COURSE_DIR, file), conn)

    conn.commit()
    conn.close()

    logger.info("🎉 Knowledge Base Created Successfully!")


if __name__ == "__main__":
    main()

