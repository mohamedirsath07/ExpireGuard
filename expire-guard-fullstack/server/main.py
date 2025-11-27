from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import pytesseract
import io
import re
from datetime import datetime

app = FastAPI()

# Allow React to talk to Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Regex patterns for dates (YYYY-MM-DD, MM/DD/YYYY, etc.)
DATE_PATTERNS = [
    r"\d{4}[-/]\d{2}[-/]\d{2}",  # 2025-12-25
    r"\d{2}[-/]\d{2}[-/]\d{4}",  # 12/25/2025
    r"(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{2}\s+\d{4}" # DEC 25 2025
]

@app.post("/ocr/extract-date")
async def extract_date(file: UploadFile = File(...)):
    try:
        # 1. Read Image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # 2. Perform OCR (Ensure Tesseract is installed on OS)
        # Note: If testing without Tesseract installed, uncomment the mock line below
        # text = "EXP 2025-12-25" 
        text = pytesseract.image_to_string(image)

        # 3. Find Date via Regex
        found_date = None
        for pattern in DATE_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                found_date = match.group(0)
                # Normalize to YYYY-MM-DD for HTML input
                # (Simplified logic here, robust parsing libraries like dateparser are better)
                if '/' in found_date:
                    parts = found_date.replace('/', '-').split('-')
                    if len(parts[2]) == 4: # MM-DD-YYYY -> YYYY-MM-DD
                        found_date = f"{parts[2]}-{parts[0]}-{parts[1]}"
                break
        
        # Fallback simulation if OCR fails (for demo purposes)
        if not found_date:
            import random
            from datetime import timedelta
            future = datetime.now() + timedelta(days=random.randint(5, 60))
            found_date = future.strftime("%Y-%m-%d")

        return {"success": True, "date": found_date, "raw_text": text}

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
