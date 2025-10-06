# T5-Model Not working properly for MCQ generation



#  # Fixed T5-based MCQ Generator
# from fastapi import FastAPI, File, UploadFile
# from fastapi.middleware.cors import CORSMiddleware
# from transformers import T5Tokenizer, T5ForConditionalGeneration
# import pdfplumber  # Better than PyPDF2 for text extraction
# import torch
# import tempfile
# import random
# import re

# # ========== FASTAPI SETUP ==========
# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ========== MODEL LOAD ==========
# print("Loading T5-small model...")
# tokenizer = T5Tokenizer.from_pretrained("t5-small")
# model = T5ForConditionalGeneration.from_pretrained("t5-small")
# device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# model.to(device)
# print(f"Model loaded on {device}")


# # ========== HELPERS ==========
# def extract_text_from_pdf(pdf_path: str) -> str:
#     """Extract text from PDF using pdfplumber"""
#     text = ""
#     with pdfplumber.open(pdf_path) as pdf:
#         for page in pdf.pages:
#             page_text = page.extract_text()
#             if page_text:
#                 text += page_text + "\n"
#     return text.strip()[:3000]  # Limit to 3000 chars


# def generate_single_question(text_chunk: str) -> str:
#     """
#     Generate ONE question from a text chunk using T5.
#     T5 was trained for question generation in this format:
#     Input: "generate question: <context>"
#     Output: "What is...?"
#     """
#     # T5 expects this specific prompt format
#     prompt = f"generate question: {text_chunk}"
    
#     inputs = tokenizer.encode(
#         prompt, 
#         return_tensors="pt", 
#         truncation=True, 
#         max_length=512
#     ).to(device)
    
#     outputs = model.generate(
#         inputs,
#         max_length=64,  # Questions are short
#         num_beams=3,
#         early_stopping=True,
#         temperature=0.7,
#     )
    
#     question = tokenizer.decode(outputs[0], skip_special_tokens=True)
#     return question.strip()


# def extract_answer_from_text(question: str, text: str) -> str:
#     """
#     Try to find a likely answer in the text based on the question.
#     This is a simple heuristic - not perfect!
#     """
#     # Remove question words
#     keywords = re.sub(r'\b(what|who|when|where|why|how|is|are|the|a|an)\b', '', question.lower())
#     keywords = keywords.strip('? ').split()
    
#     # Find sentences containing question keywords
#     sentences = text.split('.')
#     for sentence in sentences:
#         sentence_lower = sentence.lower()
#         if any(kw in sentence_lower for kw in keywords if len(kw) > 3):
#             # Extract potential answer (first capitalized word or number)
#             words = sentence.split()
#             for word in words:
#                 word = word.strip(',.!?')
#                 if len(word) >= 3 and (word[0].isupper() or word.isdigit()):
#                     return word[:10]  # Truncate to 10 chars
    
#     # Fallback: return a keyword from question
#     return keywords[0][:10] if keywords else "Answer"


# def generate_fake_answers(correct_answer: str, all_text: str) -> list:
#     """Generate 2 fake answers (distractors)"""
#     # Extract other potential answers from text
#     words = re.findall(r'\b[A-Z][a-z]{2,9}\b|\b\d+\b', all_text)
#     candidates = [w for w in set(words) if w != correct_answer]
    
#     if len(candidates) >= 2:
#         return random.sample(candidates, 2)
#     else:
#         # Fallback: generate simple fake answers
#         if correct_answer.isdigit():
#             num = int(correct_answer)
#             return [str(num + 1), str(num - 1)]
#         else:
#             return ["Option A", "Option B"]


# def generate_questions_from_text(text: str, n: int = 10):
#     """
#     Generate n MCQs from text.
    
#     HOW IT WORKS:
#     1. Split text into chunks
#     2. Generate one question per chunk using T5
#     3. Extract answer from original text
#     4. Generate fake answers
#     5. Create MCQ format
#     """
#     # Split text into chunks (one per question)
#     sentences = text.split('.')
#     chunks = []
#     current_chunk = ""
    
#     for sentence in sentences:
#         current_chunk += sentence + ". "
#         if len(current_chunk) > 200:  # Chunk size ~200 chars
#             chunks.append(current_chunk.strip())
#             current_chunk = ""
    
#     if current_chunk:
#         chunks.append(current_chunk.strip())
    
#     print(f"Split text into {len(chunks)} chunks")
    
#     # Generate questions
#     mcqs = []
#     for i, chunk in enumerate(chunks[:n]):  # Only process n chunks
#         try:
#             # Step 1: Generate question using T5
#             question = generate_single_question(chunk)
            
#             # Truncate question to 20 chars max
#             question = question[:20]
            
#             print(f"Q{i+1}: {question}")
            
#             # Step 2: Extract answer from chunk
#             correct_answer = extract_answer_from_text(question, chunk)
            
#             # Step 3: Generate fake answers
#             fake_answers = generate_fake_answers(correct_answer, text)
            
#             # Step 4: Create MCQ
#             all_choices = [correct_answer] + fake_answers[:2]
#             random.shuffle(all_choices)
            
#             mcqs.append({
#                 "question": question,
#                 "choices": all_choices,
#                 "correctIndex": all_choices.index(correct_answer)
#             })
            
#         except Exception as e:
#             print(f"Error generating question {i+1}: {e}")
#             continue
    
#     return mcqs


# # ========== ROUTES ==========
# @app.get("/")
# async def root():
#     return {
#         "message": "T5-based MCQ Generator",
#         "model": "t5-small",
#         "device": str(device),
#         "note": "T5 generates questions, answers extracted from text"
#     }


# @app.post("/generate")
# async def generate(file: UploadFile = File(...), n: int = 10):
#     """Endpoint: Receives PDF, generates MCQs"""
#     try:
#         # Save uploaded file temporarily
#         with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
#             tmp.write(await file.read())
#             tmp_path = tmp.name
        
#         print(f"Processing: {file.filename}")
        
#         # Extract text
#         text = extract_text_from_pdf(tmp_path)
#         if not text:
#             return {"error": "No readable text found in PDF"}
        
#         print(f"Extracted {len(text)} characters")
        
#         # Generate questions
#         questions = generate_questions_from_text(text, n=n)
        
#         if not questions:
#             return {"error": "Could not generate questions from text"}
        
#         print(f"Generated {len(questions)} questions")
        
#         return {"questions": questions, "count": len(questions)}
    
#     except Exception as e:
#         print(f"Error: {e}")
#         import traceback
#         traceback.print_exc()
#         return {"error": str(e)}


# @app.get("/favicon.ico")
# async def favicon():
#     return {}


# # ========== DEV SERVER ==========
# if __name__ == "__main__":
#     import uvicorn
#     print("\nStarting T5 MCQ Generator...")
#     print("Note: T5 is not ideal for MCQ generation, but this is a working version.")
#     uvicorn.run(app, host="0.0.0.0", port=8000)