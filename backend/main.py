#Testing lang hindi pa AI, kinykuha nya lang most frequent na word para gumawa ng MCQs



from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pdfplumber
import io
import random
import re
from collections import Counter

app = FastAPI()

# Get Resource from pdf without restrictions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Text Extractor
def extract_text_from_pdf(pdf_bytes):
    """Extract text from PDF"""
    text = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text.append(page_text)
    return "\n".join(text)

#Keywords Extractor
def extract_keywords(text):
    """Extract important keywords (nouns, capitalized words, numbers)"""
    # Remove code-like patterns
    text = re.sub(r'[{}()\[\]<>;]', ' ', text)
    text = re.sub(r'[a-zA-Z_]+\(.*?\)', ' ', text)  # Remove function calls
    
    words = text.split()
    keywords = []
    
    for word in words:
        # Clean word
        word = word.strip('.,!?":\'')
        
        # Skip short words, code-like stuff, and symbols
        if len(word) < 3:
            continue
        if any(char in word for char in ['_', '{', '}', '(', ')', '[', ']', '<', '>']):
            continue
        if word.lower() in ['the', 'and', 'but', 'for', 'are', 'was', 'with', 'this', 'that', 'from']:
            continue
        
        # Keep: Capitalized words or numbers
        if word[0].isupper() or word.isdigit():
            keywords.append(word)
    
    # Get most common keywords
    word_freq = Counter(keywords)
    return [word for word, count in word_freq.most_common(50)]

#Generator
def generate_simple_mcqs(keywords, num_questions=10):
    """Generate very simple 'What is X?' style questions"""
    mcqs = []
    random.shuffle(keywords)
    
    for i, keyword in enumerate(keywords[:num_questions]):
        # Create simple question
        question_types = [
            f"What is {keyword[:20]}?",
            f"{keyword[:20]} is?",
        ]
        
        question = random.choice(question_types)
        
        # Generate distractors
        other_keywords = [k for k in keywords if k != keyword]
        distractors = random.sample(other_keywords, min(2, len(other_keywords)))
        
        # If keyword is a number, generate numeric distractors
        if keyword.isdigit():
            num = int(keyword)
            distractors = [str(num + 1), str(num - 1)]
        
        # Limit length to 12 characters
        correct = keyword[:12]
        distractors = [d[:12] for d in distractors[:2]]
        
        # Ensure we have 3 unique choices
        choices = [correct] + distractors
        if len(set(choices)) < 3:
            # Add generic distractors
            choices.extend(['Option A', 'Option B', 'Option C'])
            choices = list(set(choices))[:3]
        
        random.shuffle(choices)
        
        mcqs.append({
            "question": question,
            "choices": choices,
            "correctIndex": choices.index(correct)
        })
    
    return mcqs

@app.get("/")
async def root():
    return {
        "message": "HandQuest Ultra-Simple MCQ Generator",
        "status": "online"
    }

@app.post("/generate")
async def generate(file: UploadFile = File(...), n: int = 10):
    try:
        pdf_bytes = await file.read()
        print(f"📄 Received: {file.filename}")
        
        text = extract_text_from_pdf(pdf_bytes)
        if not text.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "No readable text in PDF"}
            )
        
        print(f"📝 Extracted {len(text)} characters")
        
        # Extract keywords
        keywords = extract_keywords(text)
        print(f"🔑 Found {len(keywords)} keywords")
        
        if len(keywords) < 3:
            return JSONResponse(
                status_code=400,
                content={"error": "Not enough content to generate questions"}
            )
        
        # Generate MCQs
        mcqs = generate_simple_mcqs(keywords, n)
        
        print(f"✅ Generated {len(mcqs)} simple MCQs")
        print(f"📋 Sample: {mcqs[0]['question']}")
        
        return {"questions": mcqs, "count": len(mcqs)}
    
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(content={}, status_code=204)

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Ultra-Simple MCQ Generator")
    print("📍 http://localhost:8000")
    print("💡 Generates 'What is X?' style questions\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)