from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from PIL import Image
import pytesseract
import io
import re
import cv2
import numpy as np
from datetime import datetime, timedelta
from dateutil import parser
from typing import Optional, Tuple, List, Dict
from dataclasses import dataclass
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from passlib.context import CryptContext
from jose import JWTError, jwt

# Load environment variables
load_dotenv()

app = FastAPI(title="ExpireGuard OCR API", version="2.0")

# CORS - Allow frontend origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Add Vercel domains from environment variable
FRONTEND_URL = os.getenv("FRONTEND_URL", "")
if FRONTEND_URL:
    ALLOWED_ORIGINS.append(FRONTEND_URL)

# Also allow any Vercel preview deployments
ALLOWED_ORIGINS.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you can restrict this
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ==========================================
# AUTH CONFIGURATION
# ==========================================

SECRET_KEY = os.getenv("SECRET_KEY", "expireguard-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==========================================
# MONGODB CONNECTION
# ==========================================

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
client: AsyncIOMotorClient = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.expireguard
    print(f"Connected to MongoDB")

@app.on_event("shutdown")
async def shutdown_db_client():
    global client
    if client:
        client.close()

# ==========================================
# AUTH MODELS
# ==========================================

class UserRegister(BaseModel):
    username: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ==========================================
# AUTH ENDPOINTS
# ==========================================

@app.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # Check if username exists
    existing = await db.users.find_one({"username": user_data.username.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    user_doc = {
        "username": user_data.username.lower(),
        "password": hash_password(user_data.password),
        "name": user_data.name or user_data.username,
        "createdAt": datetime.utcnow().isoformat()
    }
    result = await db.users.insert_one(user_doc)
    
    # Create token
    token = create_access_token({"sub": str(result.inserted_id)})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=str(result.inserted_id), 
            username=user_data.username.lower(),
            name=user_doc["name"]
        )
    )

@app.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login with username and password"""
    user = await db.users.find_one({"username": user_data.username.lower()})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token({"sub": str(user["_id"])})
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=str(user["_id"]), 
            username=user["username"],
            name=user.get("name")
        )
    )

@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(
        id=str(current_user["_id"]), 
        username=current_user["username"],
        name=current_user.get("name")
    )

# ==========================================
# PRODUCT MODEL
# ==========================================

class ProductCreate(BaseModel):
    name: str
    expiryDate: str
    category: str

class ProductResponse(BaseModel):
    id: str
    name: str
    expiryDate: str
    category: str
    createdAt: str

# ==========================================
# PRODUCT CRUD ENDPOINTS (Protected)
# ==========================================

@app.get("/products", response_model=List[ProductResponse])
async def get_products(current_user: dict = Depends(get_current_user)):
    """Get all products for current user sorted by expiry date"""
    products = []
    cursor = db.products.find({"user_id": str(current_user["_id"])}).sort("expiryDate", 1)
    async for doc in cursor:
        products.append(ProductResponse(
            id=str(doc["_id"]),
            name=doc["name"],
            expiryDate=doc["expiryDate"],
            category=doc["category"],
            createdAt=doc.get("createdAt", "")
        ))
    return products

@app.post("/products", response_model=ProductResponse)
async def create_product(product: ProductCreate, current_user: dict = Depends(get_current_user)):
    """Create a new product for current user"""
    doc = {
        "name": product.name,
        "expiryDate": product.expiryDate,
        "category": product.category,
        "user_id": str(current_user["_id"]),
        "createdAt": datetime.utcnow().isoformat()
    }
    result = await db.products.insert_one(doc)
    return ProductResponse(
        id=str(result.inserted_id),
        name=doc["name"],
        expiryDate=doc["expiryDate"],
        category=doc["category"],
        createdAt=doc["createdAt"]
    )

@app.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a product by ID (only if owned by current user)"""
    try:
        result = await db.products.delete_one({
            "_id": ObjectId(product_id),
            "user_id": str(current_user["_id"])
        })
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# ROOT ENDPOINTS
# ==========================================

@app.get("/")
def root():
    return {"message": "ExpireGuard backend running"}

@app.get("/api")
def api_test():
    return {"status": "API working"}

# ==========================================
# CONFIGURATION
# ==========================================

# Keywords that indicate EXPIRY date context (positive signals)
EXPIRY_KEYWORDS = [
    r'\bEXP\b', r'\bEXPIRY\b', r'\bEXPIRES?\b', r'\bEXP\.?\s*DATE\b',
    r'\bUSE\s*BY\b', r'\bBEST\s*BEFORE\b', r'\bBB\b', r'\bBBD\b', r'\bBBE\b',
    r'\bVALID\s*TILL\b', r'\bVALID\s*UNTIL\b', r'\bE\.?\s*$', r'\bEXP\.?\s*$'
]

# Keywords to IGNORE (negative signals - not expiry dates)
IGNORE_KEYWORDS = [
    r'\bMFG\b', r'\bMFD\b', r'\bMANUFACTURED\b', r'\bMANUF\b',
    r'\bPKD\b', r'\bPACKED\b', r'\bPACKAGED\b',
    r'\bBATCH\b', r'\bLOT\b', r'\bB\.?\s*NO\b', r'\bL\.?\s*NO\b',
    r'\bMRP\b', r'\bPRICE\b', r'\bRS\.?\b', r'\bINR\b',
    r'\bPROD\b', r'\bPRODUCTION\b', r'\bDOM\b'
]

# Month name patterns
MONTHS = r'(?:JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUN(?:E)?|JUL(?:Y)?|AUG(?:UST)?|SEP(?:TEMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)'

# Date regex patterns with named groups for parsing
DATE_PATTERNS = [
    # YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    (r'\b(20[2-4]\d)[-/\.](0?[1-9]|1[0-2])[-/\.](0?[1-9]|[12]\d|3[01])\b', 'ymd'),
    # DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    (r'\b(0?[1-9]|[12]\d|3[01])[-/\.](0?[1-9]|1[0-2])[-/\.](20[2-4]\d)\b', 'dmy'),
    # DD-MM-YY or DD/MM/YY
    (r'\b(0?[1-9]|[12]\d|3[01])[-/\.](0?[1-9]|1[0-2])[-/\.]([2-4]\d)\b', 'dmy_short'),
    # MM-YYYY or MM/YYYY (expiry often shows just month/year)
    (r'\b(0?[1-9]|1[0-2])[-/\.](20[2-4]\d)\b', 'my'),
    # MM/YY
    (r'\b(0?[1-9]|1[0-2])[-/\.]([2-4]\d)\b', 'my_short'),
    # MMM YYYY or MMM-YYYY (e.g., DEC 2025, MAR-2026)
    (rf'\b({MONTHS})[-\s\.]*(\d{{4}})\b', 'month_year'),
    # DD MMM YYYY (e.g., 15 DEC 2025)
    (rf'\b(\d{{1,2}})\s*[-\s\.]*({MONTHS})[-\s\.]*(\d{{4}})\b', 'day_month_year'),
    # MMM DD, YYYY (e.g., DEC 15, 2025)
    (rf'\b({MONTHS})\s*(\d{{1,2}})[,\s]+(\d{{4}})\b', 'month_day_year'),
]

@dataclass
class DateCandidate:
    """Represents a potential expiry date found in text"""
    date_str: str
    normalized: str
    confidence: float
    has_expiry_keyword: bool
    line_text: str
    pattern_type: str


# ==========================================
# IMAGE PREPROCESSING
# ==========================================

def preprocess_image_variants(pil_image: Image.Image) -> List[np.ndarray]:
    """
    Create multiple preprocessed versions of the image for better OCR coverage.
    Returns a list of preprocessed images to try.
    """
    # Convert PIL to numpy array
    img_np = np.array(pil_image)
    
    # Convert RGB to BGR (OpenCV uses BGR)
    if len(img_np.shape) == 3:
        img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_np, cv2.COLOR_BGR2GRAY) if len(img_np.shape) == 3 else img_np
    
    variants = []
    
    # Variant 1: CLAHE contrast enhancement + adaptive threshold
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blurred = cv2.GaussianBlur(enhanced, (3, 3), 0)
    adaptive = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                      cv2.THRESH_BINARY, 11, 2)
    variants.append(adaptive)
    
    # Variant 2: Otsu's thresholding with denoising
    denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
    _, otsu = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    variants.append(otsu)
    
    # Variant 3: Morphological operations for cleaning
    kernel = np.ones((2, 2), np.uint8)
    morph = cv2.morphologyEx(adaptive, cv2.MORPH_CLOSE, kernel)
    morph = cv2.morphologyEx(morph, cv2.MORPH_OPEN, kernel)
    variants.append(morph)
    
    # Variant 4: Inverted (for dark backgrounds)
    inverted = cv2.bitwise_not(adaptive)
    variants.append(inverted)
    
    # Scale up small images
    scaled_variants = []
    for v in variants:
        h, w = v.shape
        if h < 800 or w < 800:
            scale = max(800 / h, 800 / w, 2.0)
            new_w, new_h = int(w * scale), int(h * scale)
            scaled = cv2.resize(v, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
            scaled_variants.append(scaled)
        else:
            scaled_variants.append(v)
    
    return scaled_variants


# ==========================================
# DATE PARSING & NORMALIZATION
# ==========================================

MONTH_MAP = {
    'JAN': 1, 'JANUARY': 1, 'FEB': 2, 'FEBRUARY': 2, 'MAR': 3, 'MARCH': 3,
    'APR': 4, 'APRIL': 4, 'MAY': 5, 'JUN': 6, 'JUNE': 6, 'JUL': 7, 'JULY': 7,
    'AUG': 8, 'AUGUST': 8, 'SEP': 9, 'SEPTEMBER': 9, 'OCT': 10, 'OCTOBER': 10,
    'NOV': 11, 'NOVEMBER': 11, 'DEC': 12, 'DECEMBER': 12
}

def normalize_date(match: re.Match, pattern_type: str) -> Optional[str]:
    """
    Normalize a date match to YYYY-MM-DD format.
    Returns None if date is invalid.
    """
    try:
        groups = match.groups()
        
        if pattern_type == 'ymd':
            year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
        
        elif pattern_type == 'dmy':
            day, month, year = int(groups[0]), int(groups[1]), int(groups[2])
        
        elif pattern_type == 'dmy_short':
            day, month, year = int(groups[0]), int(groups[1]), int(groups[2])
            year = 2000 + year if year < 100 else year
        
        elif pattern_type == 'my':
            month, year = int(groups[0]), int(groups[1])
            day = 1  # Default to first of month for MM/YYYY
        
        elif pattern_type == 'my_short':
            month, year = int(groups[0]), int(groups[1])
            year = 2000 + year if year < 100 else year
            day = 1
        
        elif pattern_type == 'month_year':
            month_name, year = groups[0].upper(), int(groups[1])
            month = MONTH_MAP.get(month_name[:3], 0)
            day = 1
        
        elif pattern_type == 'day_month_year':
            day, month_name, year = int(groups[0]), groups[1].upper(), int(groups[2])
            month = MONTH_MAP.get(month_name[:3], 0)
        
        elif pattern_type == 'month_day_year':
            month_name, day, year = groups[0].upper(), int(groups[1]), int(groups[2])
            month = MONTH_MAP.get(month_name[:3], 0)
        
        else:
            return None
        
        # Validate ranges
        if not (2020 <= year <= 2040):
            return None
        if not (1 <= month <= 12):
            return None
        if not (1 <= day <= 31):
            return None
        
        # Create date and return normalized string
        return f"{year:04d}-{month:02d}-{day:02d}"
    
    except (ValueError, IndexError):
        return None


def has_expiry_context(line: str) -> bool:
    """Check if line contains expiry-related keywords"""
    upper_line = line.upper()
    for pattern in EXPIRY_KEYWORDS:
        if re.search(pattern, upper_line):
            return True
    return False


def has_ignore_context(line: str) -> bool:
    """Check if line contains keywords that indicate NOT expiry (MFG, batch, etc)"""
    upper_line = line.upper()
    for pattern in IGNORE_KEYWORDS:
        if re.search(pattern, upper_line):
            return True
    return False


def calculate_confidence(candidate: DateCandidate) -> float:
    """
    Calculate confidence score for a date candidate.
    Score range: 0.0 to 1.0
    """
    score = 0.5  # Base confidence
    
    # Boost for expiry keyword presence
    if candidate.has_expiry_keyword:
        score += 0.35
    
    # Boost for common expiry formats
    if candidate.pattern_type in ['my', 'my_short', 'month_year']:
        score += 0.05  # MM/YYYY is common for expiry
    
    # Check if date is in reasonable future (expiry should be future for most products)
    try:
        date_obj = datetime.strptime(candidate.normalized, "%Y-%m-%d")
        today = datetime.now()
        days_diff = (date_obj - today).days
        
        if 0 <= days_diff <= 1095:  # Within 3 years from now
            score += 0.1
        elif days_diff < 0:  # Already expired
            score += 0.05  # Still valid, just expired
        else:
            score -= 0.1  # Too far in future, suspicious
    except:
        pass
    
    return min(1.0, max(0.0, score))


# ==========================================
# OCR EXTRACTION
# ==========================================

def extract_dates_from_text(text: str) -> List[DateCandidate]:
    """
    Extract all potential date candidates from OCR text.
    """
    candidates = []
    lines = text.split('\n')
    
    for line in lines:
        clean_line = line.strip()
        if not clean_line:
            continue
        
        # Skip lines with ignore keywords (MFG, batch, etc)
        if has_ignore_context(clean_line):
            continue
        
        has_expiry = has_expiry_context(clean_line)
        
        # Try each date pattern
        for pattern, pattern_type in DATE_PATTERNS:
            for match in re.finditer(pattern, clean_line, re.IGNORECASE):
                normalized = normalize_date(match, pattern_type)
                if normalized:
                    candidate = DateCandidate(
                        date_str=match.group(0),
                        normalized=normalized,
                        confidence=0.0,
                        has_expiry_keyword=has_expiry,
                        line_text=clean_line,
                        pattern_type=pattern_type
                    )
                    candidate.confidence = calculate_confidence(candidate)
                    candidates.append(candidate)
    
    return candidates


def run_ocr(image: np.ndarray, config: str) -> str:
    """Run Tesseract OCR with given config"""
    pil_img = Image.fromarray(image)
    
    # Add character whitelist for date-focused extraction
    custom_config = config + ' -c tessedit_char_whitelist=0123456789/-.\\ JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDECBSTBYUELVID'
    
    try:
        return pytesseract.image_to_string(pil_img, config=custom_config)
    except Exception as e:
        print(f"OCR error: {e}")
        return ""


@app.post("/ocr/extract-date")
async def extract_date(file: UploadFile = File(...)):
    """
    Extract expiry date from uploaded product image.
    Returns the most confident expiry date in YYYY-MM-DD format.
    """
    try:
        # 1. Read Image
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        # 2. Create preprocessing variants
        image_variants = preprocess_image_variants(pil_image)
        
        # 3. OCR configurations to try
        ocr_configs = [
            '--oem 3 --psm 6',   # Single block of text
            '--oem 3 --psm 11',  # Sparse text
            '--oem 3 --psm 3',   # Fully automatic
            '--oem 3 --psm 4',   # Single column of text
        ]
        
        # 4. Collect all date candidates
        all_candidates = []
        all_text = []
        
        for variant in image_variants:
            for config in ocr_configs:
                text = run_ocr(variant, config)
                all_text.append(text)
                candidates = extract_dates_from_text(text)
                all_candidates.extend(candidates)
        
        # 5. Select best candidate
        if not all_candidates:
            return {
                "success": False,
                "expiry_date": None,
                "confidence": 0.0,
                "raw_text": "\n".join(all_text)[:500],
                "message": "No date found in image"
            }
        
        # Sort by confidence (highest first)
        all_candidates.sort(key=lambda c: c.confidence, reverse=True)
        
        # Prefer candidates with expiry keywords
        keyword_candidates = [c for c in all_candidates if c.has_expiry_keyword]
        
        if keyword_candidates:
            best = keyword_candidates[0]
        else:
            best = all_candidates[0]
        
        print(f"Best candidate: {best.normalized} (confidence: {best.confidence:.2f})")
        print(f"Context: {best.line_text}")
        
        return {
            "success": True,
            "expiry_date": best.normalized,
            "confidence": round(best.confidence, 2),
            "raw_text": "\n".join(all_text)[:500]
        }
    
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "expiry_date": None,
            "confidence": 0.0,
            "error": str(e)
        }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "version": "2.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
