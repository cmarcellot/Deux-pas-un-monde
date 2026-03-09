from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
import os
import uuid
import base64
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

app = FastAPI(title="Deux pas un monde API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "deux_pas_un_monde")
JWT_SECRET = os.environ.get("JWT_SECRET", "default_secret")
DEFAULT_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
places_collection = db["places"]
settings_collection = db["settings"]

# Initialiser le mot de passe admin en base si non existant
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

# Chemin relatif au fichier server.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

security = HTTPBearer()

class LoginRequest(BaseModel):
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class PlaceCreate(BaseModel):
    title: str
    address: str
    description: str
    category: str
    rating: int = Field(ge=1, le=5)
    latitude: float
    longitude: float
    photos: List[str] = []

class PlaceUpdate(BaseModel):
    title: Optional[str] = None
    address: Optional[str] = None
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
    description: str
    category: str
    rating: int
    latitude: float
    longitude: float
    photos: List[str]
    created_at: str

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
    place_dict["id"] = str(uuid.uuid4())
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
    return {"message": "Lieu supprimé"}

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...), payload: dict = Depends(verify_token)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Seules les images sont acceptées")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    return {"url": f"/api/uploads/{filename}"}

@app.post("/api/upload-base64")
async def upload_base64(data: dict, payload: dict = Depends(verify_token)):
    if "image" not in data:
        raise HTTPException(status_code=400, detail="Image manquante")
    
    image_data = data["image"]
    if "," in image_data:
        image_data = image_data.split(",")[1]
    
    filename = f"{uuid.uuid4()}.jpg"
    filepath = os.path.join(UPLOAD_DIR, filename)
    
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(image_data))
    
    return {"url": f"/api/uploads/{filename}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
