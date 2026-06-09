from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
import os
import uuid
import shutil
import pathlib
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

app = FastAPI(title="Deux pas un monde API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.deuxpasunmonde.fr",
        "https://deuxpasunmonde.fr",
        "http://www.deuxpasunmonde.fr",
        "http://deuxpasunmonde.fr",
	"http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "deux_pas_un_monde")
JWT_SECRET = os.environ.get("JWT_SECRET", "default_secret")
DEFAULT_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

UPLOAD_DIR = pathlib.Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
places_collection = db["places"]
settings_collection = db["settings"]
guides_collection = db["guides"]

def get_admin_password():
    settings = settings_collection.find_one({"key": "admin_password"})
    if settings:
        return settings["value"]
    return DEFAULT_ADMIN_PASSWORD

def set_admin_password(new_password):
    settings_collection.update_one(
        {"key": "admin_password"},
        {"$set": {"key": "admin_password", "value": new_password}},
        upsert=True
    )

security = HTTPBearer()

class LoginRequest(BaseModel):
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class PlaceCreate(BaseModel):
    id: Optional[str] = None
    title: str
    address: str
    city: Optional[str] = ''
    country: Optional[str] = ''
    date: Optional[str] = ''
    description: str
    category: str
    rating: int = Field(ge=1, le=5)
    latitude: float
    longitude: float
    photos: List[str] = []

class PlaceUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    date: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photos: Optional[List[str]] = None

class PlaceResponse(BaseModel):
    id: str
    title: str
    address: str
    city: Optional[str] = ''
    country: Optional[str] = ''
    date: Optional[str] = ''
    description: str
    category: str
    rating: int
    latitude: float
    longitude: float
    photos: List[str]
    created_at: str

class ItineraryActivity(BaseModel):
    time: Optional[str] = None
    type: Optional[str] = None
    title: str
    description: Optional[str] = None
    place_id: Optional[str] = None
    duration_minutes: Optional[int] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ItineraryDay(BaseModel):
    day_number: int
    title: str
    description: Optional[str] = None
    activities: List[ItineraryActivity] = []
    tips: List[str] = []
    place_ids: List[str] = []

class PracticalInfo(BaseModel):
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    best_seasons: List[str] = []
    transport_tips: Optional[str] = None
    visa_info: Optional[str] = None
    language_tips: Optional[str] = None
    currency: Optional[str] = None

class GuideCreate(BaseModel):
    id: Optional[str] = None
    title: str
    destination: str
    country: str
    duration_days: int = Field(ge=1, le=365)
    cover_image: Optional[str] = None
    intro: str = ""
    itinerary: List[ItineraryDay] = []
    practical_info: PracticalInfo = PracticalInfo()
    tags: List[str] = []
    photos: List[str] = []
    place_ids: List[str] = []
    published: bool = False
    marker_color: Optional[str] = None
    date: Optional[str] = None

class GuideUpdate(BaseModel):
    title: Optional[str] = None
    destination: Optional[str] = None
    country: Optional[str] = None
    duration_days: Optional[int] = Field(default=None, ge=1, le=365)
    cover_image: Optional[str] = None
    intro: Optional[str] = None
    itinerary: Optional[List[ItineraryDay]] = None
    practical_info: Optional[PracticalInfo] = None
    tags: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    place_ids: Optional[List[str]] = None
    published: Optional[bool] = None
    marker_color: Optional[str] = None
    date: Optional[str] = None

class GuideResponse(BaseModel):
    id: str
    title: str
    destination: str
    country: str
    duration_days: int
    cover_image: Optional[str]
    intro: str
    itinerary: List[ItineraryDay]
    practical_info: PracticalInfo
    tags: List[str]
    photos: List[str]
    place_ids: List[str]
    published: bool
    created_at: str
    updated_at: str
    marker_color: Optional[str] = None
    date: Optional[str] = None

def create_token(data: dict):
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide")

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@app.post("/api/auth/login")
def login(request: LoginRequest):
    admin_password = get_admin_password()
    if request.password == admin_password:
        token = create_token({"sub": "admin"})
        return {"token": token, "message": "Connexion réussie"}
    raise HTTPException(status_code=401, detail="Mot de passe incorrect")

@app.get("/api/auth/verify")
def verify_auth(payload: dict = Depends(verify_token)):
    return {"valid": True, "user": payload.get("sub")}

@app.post("/api/auth/change-password")
def change_password(request: ChangePasswordRequest, payload: dict = Depends(verify_token)):
    current_password = get_admin_password()
    if request.current_password != current_password:
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    set_admin_password(request.new_password)
    return {"message": "Mot de passe modifié avec succès"}

@app.get("/api/places", response_model=List[PlaceResponse])
def get_places(category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    places = list(places_collection.find(query, {"_id": 0}))
    return places

@app.get("/api/places/{place_id}", response_model=PlaceResponse)
def get_place(place_id: str):
    place = places_collection.find_one({"id": place_id}, {"_id": 0})
    if not place:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")
    return place

@app.post("/api/places", response_model=PlaceResponse)
def create_place(place: PlaceCreate, payload: dict = Depends(verify_token)):
    place_dict = place.model_dump()
    place_dict["id"] = place_dict.pop("id") or str(uuid.uuid4())
    place_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    places_collection.insert_one(place_dict)
    del place_dict["_id"]
    return place_dict

@app.put("/api/places/{place_id}", response_model=PlaceResponse)
def update_place(place_id: str, place: PlaceUpdate, payload: dict = Depends(verify_token)):
    existing = places_collection.find_one({"id": place_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")
    update_data = {k: v for k, v in place.model_dump().items() if v is not None}
    if update_data:
        places_collection.update_one({"id": place_id}, {"$set": update_data})
    updated = places_collection.find_one({"id": place_id}, {"_id": 0})
    return updated

@app.delete("/api/places/{place_id}")
def delete_place(place_id: str, payload: dict = Depends(verify_token)):
    result = places_collection.delete_one({"id": place_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")
    place_dir = UPLOAD_DIR / "places" / place_id
    if place_dir.exists():
        shutil.rmtree(place_dir)
    return {"message": "Lieu supprimé"}

@app.post("/api/upload")
async def upload_image(
    file: UploadFile = File(...),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    payload: dict = Depends(verify_token),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Seules les images sont acceptées")
    ext = pathlib.Path(file.filename).suffix if file.filename else ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    if entity_type and entity_id:
        target_dir = UPLOAD_DIR / entity_type / entity_id
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / filename
        url = f"/uploads/{entity_type}/{entity_id}/{filename}"
    else:
        file_path = UPLOAD_DIR / filename
        url = f"/uploads/{filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": url}

@app.post("/api/upload-base64")
async def upload_base64(
    data: dict,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    payload: dict = Depends(verify_token),
):
    if "image" not in data:
        raise HTTPException(status_code=400, detail="Image manquante")
    image_data = data["image"]
    if "," in image_data:
        image_data = image_data.split(",")[1]
    import base64
    image_bytes = base64.b64decode(image_data)
    filename = f"{uuid.uuid4()}.jpg"
    if entity_type and entity_id:
        target_dir = UPLOAD_DIR / entity_type / entity_id
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / filename
        url = f"/uploads/{entity_type}/{entity_id}/{filename}"
    else:
        file_path = UPLOAD_DIR / filename
        url = f"/uploads/{filename}"
    with open(file_path, "wb") as f:
        f.write(image_bytes)
    return {"url": url}

@app.delete("/api/upload")
async def delete_upload(url: str, payload: dict = Depends(verify_token)):
    if not url.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="URL invalide")
    file_path = UPLOAD_DIR / url[len("/uploads/"):]
    if file_path.exists() and file_path.is_file():
        file_path.unlink()
    return {"message": "Fichier supprimé"}

@app.get("/api/guides", response_model=List[GuideResponse])
def get_guides(tag: Optional[str] = None, destination: Optional[str] = None):
    query: dict = {"published": True}
    if tag:
        query["tags"] = {"$in": [tag]}
    if destination:
        query["destination"] = {"$regex": destination, "$options": "i"}
    guides = list(guides_collection.find(query, {"_id": 0}).sort("created_at", -1))
    return guides

@app.get("/api/guides/all", response_model=List[GuideResponse])
def get_all_guides(payload: dict = Depends(verify_token)):
    guides = list(guides_collection.find({}, {"_id": 0}).sort("created_at", -1))
    return guides

@app.get("/api/guides/{guide_id}", response_model=GuideResponse)
def get_guide(guide_id: str):
    guide = guides_collection.find_one({"id": guide_id}, {"_id": 0})
    if not guide:
        raise HTTPException(status_code=404, detail="Guide non trouvé")
    return guide

@app.post("/api/guides", response_model=GuideResponse)
def create_guide(guide: GuideCreate, payload: dict = Depends(verify_token)):
    guide_dict = guide.model_dump()
    guide_dict["id"] = guide_dict.pop("id") or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    guide_dict["created_at"] = now
    guide_dict["updated_at"] = now
    guides_collection.insert_one(guide_dict)
    del guide_dict["_id"]
    return guide_dict

@app.put("/api/guides/{guide_id}", response_model=GuideResponse)
def update_guide(guide_id: str, guide: GuideUpdate, payload: dict = Depends(verify_token)):
    existing = guides_collection.find_one({"id": guide_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Guide non trouvé")
    update_data = {k: v for k, v in guide.model_dump(exclude_unset=True).items()}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if update_data:
        guides_collection.update_one({"id": guide_id}, {"$set": update_data})
    updated = guides_collection.find_one({"id": guide_id}, {"_id": 0})
    return updated

@app.delete("/api/guides/{guide_id}")
def delete_guide(guide_id: str, payload: dict = Depends(verify_token)):
    result = guides_collection.delete_one({"id": guide_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Guide non trouvé")
    guide_dir = UPLOAD_DIR / "guides" / guide_id
    if guide_dir.exists():
        shutil.rmtree(guide_dir)
    return {"message": "Guide supprimé"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
