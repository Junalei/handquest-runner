# TinyLlama MCQ Generator
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import pdfplumber
import torch
import tempfile
import json
import re
import os
import random

# ========== FORCE CPU USAGE ==========
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
torch.set_num_threads(4)

# ========== FASTAPI SETUP ==========
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== MODEL LOAD ==========
print("Loading TinyLlama-1.1B-Chat...")
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
tokenizer = AutoTokenizer.from_pretrained(model_name)

if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float32,
    device_map=None,
    low_cpu_mem_usage=True
)

model = model.to('cpu')
model.eval()

pipe = pipeline("text-generation", model=model, tokenizer=tokenizer, device='cpu')
print("✓ Model loaded successfully")

# ========== HELPERS ==========
def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF"""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error: {e}")
        return ""
    
    return text.strip()[:1500]

def extract_facts(text: str):
    """Extract key facts and terms from text"""
    sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
    
    facts = {}  # term -> description
    terms = []  # all important terms
    
    for sentence in sentences:
        # Skip title lines
        if sentence.isupper() or len(sentence.split()) < 5:
            continue
        
        # "X is Y" pattern
        is_match = re.search(r'([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+is\s+(?:the\s+)?(.+)', sentence)
        if is_match:
            term = is_match.group(1).strip()
            description = is_match.group(2).strip()
            # Take meaningful part of description (3-6 words)
            desc_words = description.split()[:6]
            description_short = ' '.join(desc_words).rstrip('.,;:')
            
            if term not in ["The", "This", "That", "Review", "Guide", "Overview"]:
                facts[term] = description_short
                if term not in terms:
                    terms.append(term)
        
        # "X has/provides/contains Y" pattern
        action_match = re.search(r'([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\s+(?:has|have|provides?|contains?|includes?)\s+(.+)', sentence)
        if action_match:
            term = action_match.group(1).strip()
            description = action_match.group(2).strip()
            desc_words = description.split()[:6]
            description_short = ' '.join(desc_words).rstrip('.,;:')
            
            if term not in ["The", "This", "Review", "Guide"]:
                facts[term] = description_short
                if term not in terms:
                    terms.append(term)
        
        # Extract any capitalized terms
        words = sentence.split()
        for word in words:
            clean = word.strip('.,;:()[]{}\'\"')
            if clean and len(clean) > 2 and clean[0].isupper() and clean not in terms:
                if clean not in ["The", "This", "That", "Review", "Guide", "Overview", "Computer", "Parts"]:
                    terms.append(clean)
    
    return {'facts': facts, 'terms': terms[:20]}

def generate_mcqs_with_tinyllama(text: str, num_questions: int = 5):
    """Generate MCQs with minimal prompting"""
    
    prompt = f"""<|system|>
You are a quiz creator.</s>
<|user|>
Create {num_questions} multiple choice questions from this text. Each question should have 3 answer choices (A, B, C).

Text:
{text}

Create {num_questions} questions:</s>
<|assistant|>
"""
    
    try:
        print("🔄 Generating questions...")
        
        with torch.no_grad():
            response = pipe(
                prompt,
                max_new_tokens=800,
                temperature=0.7,
                do_sample=True,
                top_p=0.9,
                repetition_penalty=1.3,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.eos_token_id
            )
        
        generated = response[0]['generated_text'].split("<|assistant|>")[-1].strip()
        print(f"📝 Generated text preview:\n{generated[:300]}...\n")
        
        mcqs = parse_mcqs(generated, num_questions)
        
        # Fallback if parsing fails or not enough questions
        if len(mcqs) < num_questions // 2:
            print("⚠️ Using fallback...")
            facts_data = extract_facts(text)
            mcqs = create_fallback_mcqs(facts_data, num_questions)
        
        return mcqs
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        facts_data = extract_facts(text)
        return create_fallback_mcqs(facts_data, num_questions)

def create_fallback_mcqs(facts_data: dict, num_questions: int = 5):
    """(Optionally) Create MCQs with TERMS as choices, not definitions"""
    facts = facts_data['facts']
    terms = facts_data['terms']
    
    print(f"🔄 Creating fallback questions...")
    print(f"   Found {len(facts)} facts and {len(terms)} terms")
    
    mcqs = []
    used = set()
    
    # Strategy 1: Create "Which is X?" questions with terms as choices
    for term, description in facts.items():
        if len(mcqs) >= num_questions:
            break
        
        if term in used:
            continue
        
        used.add(term)
        
        # Get other terms as wrong answers
        other_terms = [t for t in terms if t != term and t not in used]
        
        if len(other_terms) < 2:
            other_terms.extend(["Unknown", "None", "Other"])
        
        # Choices are TERMS (Venus, Mars, Jupiter), not definitions
        choices = [term, other_terms[0], other_terms[1] if len(other_terms) > 1 else "Other"]
        random.shuffle(choices)
        
        # Question asks about the property/description
        # Take key words from description (2-5 words)
        desc_words = description.split()
        if len(desc_words) > 5:
            desc_short = ' '.join(desc_words[:5])
        else:
            desc_short = description
        
        mcqs.append({
            'question': f"Which is {desc_short}?",
            'choices': choices,
            'correctIndex': choices.index(term)
        })
    
    # Strategy 2: Simple "Which X is mentioned?" questions
    while len(mcqs) < num_questions and len(terms) >= 3:
        available = [t for t in terms if t not in used]
        
        if len(available) < 3:
            break
        
        correct = available[0]
        wrong1 = available[1]
        wrong2 = available[2]
        
        used.update([correct, wrong1, wrong2])
        
        choices = [correct, wrong1, wrong2]
        random.shuffle(choices)
        
        mcqs.append({
            'question': f"Which is mentioned in the text?",
            'choices': choices,
            'correctIndex': choices.index(correct)
        })
    
    print(f"✅ Created {len(mcqs)} fallback questions")
    return mcqs[:num_questions]

def parse_mcqs(text: str, target: int = 5):
    """(Optionally) Parse MCQs from generated text"""
    mcqs = []
    
    # Find question blocks
    pattern = r'Question\s+\d+:\s*(.+?)(?=Question\s+\d+:|$)'
    blocks = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
    
    for block in blocks:
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        
        if len(lines) < 4:
            continue
        
        # Extract question
        question = lines[0].strip('?:').strip()
        if not question.endswith('?'):
            question += "?"
        
        # Extract choices (A), B), C))
        choices = []
        correct_idx = 0
        
        for line in lines[1:]:
            # Match A) answer or A. answer or A: answer
            choice_match = re.match(r'^([ABC])\)?\s*(.+)', line, re.IGNORECASE)
            if choice_match:
                answer_text = choice_match.group(2).strip()
                choices.append(answer_text)
            
            # Match "Correct: A" or "Answer: A"
            correct_match = re.match(r'(?:Correct|Answer):?\s*([ABC])', line, re.IGNORECASE)
            if correct_match:
                correct_idx = ord(correct_match.group(1).upper()) - ord('A')
        
        if len(choices) >= 3 and question:
            mcqs.append({
                'question': question,
                'choices': choices[:3],
                'correctIndex': min(correct_idx, 2)
            })
        
        if len(mcqs) >= target:
            break
    
    if mcqs:
        print(f"✅ Parsed {len(mcqs)} questions from model output")
    
    return mcqs

# ========== ROUTES ==========
@app.get("/")
async def root():
    return {
        "message": "TinyLlama MCQ Generator",
        "model": "TinyLlama-1.1B-Chat-v1.0",
        "device": "CPU",
        "status": "ready"
    }

@app.post("/generate")
async def generate(file: UploadFile = File(...)):
    """Generate 5 MCQs from PDF"""
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files supported")
    
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            if not content:
                raise HTTPException(status_code=400, detail="Empty file")
            tmp.write(content)
            tmp_path = tmp.name
        
        print(f"\n{'='*60}")
        print(f"⚡ Processing: {file.filename}")
        
        text = extract_text_from_pdf(tmp_path)
        if len(text) < 50:
            raise HTTPException(status_code=400, detail="Text too short")
        
        print(f"📊 Extracted {len(text)} characters")
        
        questions = generate_mcqs_with_tinyllama(text, 5)
        
        if not questions:
            raise HTTPException(status_code=500, detail="Generation failed")
        
        print(f"✅ Returning {len(questions)} questions")
        for i, q in enumerate(questions, 1):
            print(f"   Q{i}: {q['question'][:50]}...")
        print(f"{'='*60}\n")
        
        return {
            "success": True,
            "questions": questions,
            "count": len(questions),
            "model": "TinyLlama"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "model_loaded": model is not None,
        "model": "TinyLlama-1.1B",
        "device": "CPU"
    }

@app.get("/favicon.ico")
async def favicon():
    return {}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("⚡ TinyLlama MCQ Generator - FIXED")
    print("📝 Choices are now SHORT terms, not long definitions")
    print("📍 API: http://localhost:8000")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
# Note: To run on GPU, remove or comment out the lines that force CPU usage at the top.