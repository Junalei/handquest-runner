#Model

# main.py
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import T5Tokenizer, T5ForConditionalGeneration
from PyPDF2 import PdfReader
import torch
import tempfile
import json
import re

# ========== FASTAPI SETUP ==========
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for local dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== MODEL LOAD ==========
print("🚀 Loading T5-small model...")
tokenizer = T5Tokenizer.from_pretrained("t5-small")
model = T5ForConditionalGeneration.from_pretrained("t5-small")
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
print("✅ Model loaded on", device)


# ========== HELPERS ==========
def extract_text_from_pdf(pdf_path: str) -> str:
    """Extracts text from all PDF pages."""
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            text += page_text + "\n"
    # Limit text so we don't overload T5
    return text.strip()[:3000]


def generate_questions_from_text(text: str, n: int = 10):
    """
    Generate multiple-choice questions (max 20 chars)
    Each item contains:
      - question
      - correct_answer
      - fake_answer_1
      - fake_answer_2
    """
    # Prompt to instruct T5 to return structured JSON-like text
    prompt = (
        f"Create {n} easy multiple-choice questions from this text. "
        f"Each question must be very short (max 20 characters) and have 1 correct answer "
        f"and 2 wrong answers. Return results in JSON format like this:\n"
        f"[{{'question':'...','correct_answer':'...','fake_answer_1':'...','fake_answer_2':'...'}}, ...]\n\n"
        f"Text:\n{text}"
    )

    inputs = tokenizer.encode(prompt, return_tensors="pt", truncation=True, max_length=512).to(device)
    outputs = model.generate(
        inputs,
        max_length=512,
        num_beams=5,
        early_stopping=True,
        temperature=0.9,
    )

    raw_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    print("🧾 Raw T5 output:", raw_output[:300])  # preview

    # Try to extract a JSON-like list from the model output
    try:
        # Normalize and parse
        json_like = raw_output.replace("'", '"')
        json_like = re.search(r'\[.*\]', json_like, re.DOTALL)
        if json_like:
            parsed = json.loads(json_like.group(0))
            # Clean and truncate questions
            for q in parsed:
                q["question"] = q.get("question", "").strip()[:20]
                q["correct_answer"] = q.get("correct_answer", "").strip()
                q["fake_answer_1"] = q.get("fake_answer_1", "").strip()
                q["fake_answer_2"] = q.get("fake_answer_2", "").strip()
            return parsed[:n]
    except Exception as e:
        print("⚠️ Parsing error:", e)

    # Fallback: create placeholders if AI output isn't structured
    return [
        {
            "question": f"Q{i+1}",
            "correct_answer": "Answer A",
            "fake_answer_1": "Answer B",
            "fake_answer_2": "Answer C"
        }
        for i in range(n)
    ]


# ========== ROUTE ==========
@app.post("/generate")
async def generate(file: UploadFile = File(...), n: int = 10):
    """Endpoint: Receives PDF, generates multiple-choice questions."""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        text = extract_text_from_pdf(tmp_path)
        if not text:
            return {"error": "No readable text found in the PDF."}

        questions = generate_questions_from_text(text, n=n)
        return {"questions": questions}

    except Exception as e:
        print("❌ Error:", e)
        return {"error": str(e)}


# ========== DEV SERVER ==========
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
