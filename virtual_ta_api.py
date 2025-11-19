import os
import json
import sqlite3
import logging
import re
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
import base64
from io import BytesIO
from PIL import Image
import pytesseract
import numpy as np
import aiohttp

# === NEW: Local Embedding Model ===
from sentence_transformers import SentenceTransformer
import torch

# === Logging Setup ===
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s: %(message)s")
logger = logging.getLogger("uvicorn.error")

load_dotenv()
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise RuntimeError("API_KEY not set in .env")

# === Load local embedding model ===
device = "cuda" if torch.cuda.is_available() else "cpu"
logger.info(f"[Embedding] Using PyTorch device: {device}")

embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device=device)

# === SQLite DB ===
conn = sqlite3.connect("knowledge_base.db")

# === FastAPI ===
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

SIMILARITY_THRESHOLD = 0.40
MAX_RESULTS = 50

class QueryRequest(BaseModel):
    question: str
    image: Optional[str] = None

class Link(BaseModel):
    url: str
    text: str

class QueryResponse(BaseModel):
    answer: str
    links: List[Link]


# ------------------------------------------------
# IMAGE → TEXT (OCR)
# ------------------------------------------------
def extract_text_from_base64_image(image_base64: str) -> str:
    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data))
        text = pytesseract.image_to_string(image).strip()
        logger.info(f"OCR extracted text: '{text[:80]}...' ({len(text)} chars)")
        return text
    except Exception as e:
        logger.warning(f"Failed to extract text from image: {e}")
        return ""


# ------------------------------------------------
# LOCAL EMBEDDING
# ------------------------------------------------
def get_embedding(text: str):
    """Compute local sentence-transformer embedding."""
    return embedder.encode(text, convert_to_numpy=True).tolist()


# ------------------------------------------------
# COSINE SIMILARITY
# ------------------------------------------------
def cosine_similarity(a, b):
    a, b = np.array(a), np.array(b)
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))


# ------------------------------------------------
# EMBEDDING SEARCH
# ------------------------------------------------
def retrieve_similar_chunks(question: str, top_k=MAX_RESULTS):
    logger.info(f"Embedding query text locally...")
    question_embedding = get_embedding(question)

    all_chunks = []

    for table in ["forum_chunks", "course_chunks"]:
        logger.info(f"Checking {table} for similar chunks...")
        cursor = conn.execute(f"SELECT url, text, embedding FROM {table}")

        for url, text, emb_json in cursor.fetchall():
            try:
                emb = json.loads(emb_json)

                if len(emb) != len(question_embedding):
                    continue

                similarity = cosine_similarity(question_embedding, emb)

                if similarity >= SIMILARITY_THRESHOLD:
                    all_chunks.append({
                        "source": table.replace("_chunks", ""),
                        "text": text,
                        "url": url,
                        "similarity": similarity,
                        "post_number": (
                            int(url.rstrip("/").split("/")[-1])
                            if url.rstrip("/").split("/")[-1].isdigit()
                            else 0
                        )
                    })
            except Exception as e:
                logger.warning(f"Skipping row → {e}")

    logger.info(f"✅ Retrieved {len(all_chunks)} relevant chunks")

    return sorted(all_chunks, key=lambda x: (-x["similarity"], -x["post_number"]))[:top_k]


# ------------------------------------------------
# USE LLM FOR FINAL ANSWER (AIPipe)
# ------------------------------------------------
async def generate_llm_answer(question: str, chunks: List[dict], extracted_text: Optional[str] = None) -> str:

    context = "\n\n".join([
        f"{c['source'].capitalize()} (URL: {c['url']}): {c['text'][:1500]}"
        for c in chunks
    ])

    extracted_section = f"OCR-extracted Text:\n{extracted_text}\n\n" if extracted_text else ""

    prompt = f"""
Only answer using the provided CONTEXT.
Do NOT use outside knowledge.
If context does not answer, say:
"I don't have enough information to answer this question."

{extracted_section}
Context:
{context}

---

User Question:
{question}

Provide final answer + list of sources used.
"""

    headers = {"Authorization": API_KEY, "Content-Type": "application/json"}
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system",
             "content": "Answer ONLY from provided context. Always cite URLs used."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1
    }

    logger.info("Sending LLM request to AIPipe...")

    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://aipipe.org/openai/v1/chat/completions",
            headers=headers,
            json=payload
        ) as resp:

            if resp.status != 200:
                error = await resp.text()
                logger.error(error)
                raise HTTPException(status_code=resp.status, detail=error)

            result = await resp.json()
            return result["choices"][0]["message"]["content"]


# ------------------------------------------------
# API ENDPOINT
# ------------------------------------------------
@app.post("/query", response_model=QueryResponse)
async def query_virtual_ta(req: QueryRequest, request: Request):
    logger.info(f"Incoming request from IP: {request.client.host}")

    extracted_text = None
    if req.image:
        extracted_text = extract_text_from_base64_image(req.image)

    chunks = retrieve_similar_chunks(req.question)

    if not chunks:
        return QueryResponse(answer="I couldn't find relevant content.", links=[])

    llm_output = await generate_llm_answer(req.question, chunks, extracted_text)

    # Parse sources
    if "Sources:" in llm_output:
        answer_part, sources_part = llm_output.split("Sources:", 1)
    else:
        answer_part, sources_part = llm_output, ""

    links = []
    for match in re.finditer(r"URL:\s*(\S+),\s*Text:\s*(.*)", sources_part):
        url, text = match.groups()
        links.append(Link(url=url.strip(), text=text.strip()))

    return QueryResponse(answer=answer_part.strip(), links=links)

