from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Request, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta, time as dt_time
from zoneinfo import ZoneInfo
from jose import JWTError, jwt
import os
import sys
import hmac
import json
import math
import time
import threading
import uuid
import shutil
import pathlib
import urllib.error
import urllib.parse
import urllib.request
import bcrypt
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

# Pas de valeur par défaut pour les secrets : le backend refuse de démarrer s'il en manque un
REQUIRED_ENV_VARS = ("MONGO_URL", "JWT_SECRET", "ADMIN_PASSWORD")
missing_env_vars = [name for name in REQUIRED_ENV_VARS if not os.environ.get(name)]
if missing_env_vars:
    sys.exit(
        "Variables d'environnement manquantes : " + ", ".join(missing_env_vars)
        + ". Le backend ne peut pas démarrer sans elles (voir la section « Variables d'environnement » du README)."
    )

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ.get("DB_NAME", "deux_pas_un_monde")
JWT_SECRET = os.environ["JWT_SECRET"]
DEFAULT_ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

# Mesure d'audience (Umami) : optionnelle, le backend démarre sans ces variables
UMAMI_URL = os.environ.get("UMAMI_URL", "").rstrip("/")
UMAMI_WEBSITE_ID = os.environ.get("UMAMI_WEBSITE_ID", "")
UMAMI_API_KEY = os.environ.get("UMAMI_API_KEY", "")
ANALYTICS_TIMEZONE = "Europe/Paris"
ANALYTICS_PERIODS = {"7d": 7, "30d": 30, "90d": 90}

UPLOAD_DIR = pathlib.Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
places_collection = db["places"]
settings_collection = db["settings"]
guides_collection = db["guides"]
activity_collection = db["activity_log"]

def log_activity(action, entity_type, entity_id, title, timestamp=None):
    # Journal des actions de l'admin : created, updated, deleted, published ou unpublished,
    # sur une adresse (place) ou un guide. Le titre est conservé même après une suppression.
    activity_collection.insert_one({
        "id": str(uuid.uuid4()),
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "title": title,
        "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
    })

def backfill_activity_log():
    # Reprise de l'historique, uniquement si le journal est vide : un ajout par contenu (created_at)
    # et une modification par guide modifié depuis (updated_at). Les adresses n'ont pas de date de modification.
    if activity_collection.find_one() is not None:
        return 0
    events = []
    for place in places_collection.find({}, {"_id": 0, "id": 1, "title": 1, "created_at": 1}):
        events.append(("created", "place", place, place["created_at"]))
    for guide in guides_collection.find({}, {"_id": 0, "id": 1, "title": 1, "created_at": 1, "updated_at": 1}):
        events.append(("created", "guide", guide, guide["created_at"]))
        if guide.get("updated_at") and guide["updated_at"] > guide["created_at"]:
            events.append(("updated", "guide", guide, guide["updated_at"]))
    events.sort(key=lambda event: event[3])
    if events:
        activity_collection.insert_many([
            {"id": str(uuid.uuid4()), "action": action, "entity_type": entity_type,
             "entity_id": doc["id"], "title": doc["title"], "timestamp": timestamp}
            for action, entity_type, doc, timestamp in events
        ])
    return len(events)

@app.on_event("startup")
def backfill_activity_log_on_startup():
    # Un échec de la reprise (Mongo injoignable…) ne doit pas empêcher l'API de démarrer : elle sera retentée au prochain démarrage
    try:
        count = backfill_activity_log()
        if count:
            print(f"Journal d'activité : {count} événements repris de l'historique")
    except Exception as error:
        print(f"Journal d'activité : reprise de l'historique impossible ({error})", file=sys.stderr)

def check_admin_password(password):
    # Le mot de passe changé depuis l'admin (en base) prime sur ADMIN_PASSWORD
    settings = settings_collection.find_one({"key": "admin_password"})
    if not settings:
        return hmac.compare_digest(password.encode("utf-8"), DEFAULT_ADMIN_PASSWORD.encode("utf-8"))
    if "hash" in settings:
        return bcrypt.checkpw(password.encode("utf-8"), settings["hash"].encode("utf-8"))
    # Ancien format stocké en clair : remplacé par un hash à la première connexion réussie
    if hmac.compare_digest(password.encode("utf-8"), settings["value"].encode("utf-8")):
        set_admin_password(password)
        return True
    return False

def set_admin_password(new_password):
    password_hash = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    settings_collection.update_one(
        {"key": "admin_password"},
        {"$set": {"key": "admin_password", "hash": password_hash}, "$unset": {"value": ""}},
        upsert=True
    )

# Limite des tentatives de connexion, en mémoire (remise à zéro au redémarrage)
LOGIN_MAX_FAILURES = 5
LOGIN_WINDOW_SECONDS = 15 * 60
login_failures = {}  # IP -> horodatages des échecs récents
login_failures_lock = threading.Lock()

def get_client_ip(http_request: Request):
    # Derrière le proxy de Dokploy, l'IP du visiteur est la dernière ajoutée à X-Forwarded-For
    forwarded_for = http_request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[-1].strip()
    return http_request.client.host if http_request.client else "inconnue"

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
    videos: List[str] = []
    media_order: List[str] = []
    experience_tags: List[str] = []
    price_from: Optional[float] = None

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
    videos: Optional[List[str]] = None
    media_order: Optional[List[str]] = None
    experience_tags: Optional[List[str]] = None
    price_from: Optional[float] = None

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
    videos: List[str] = []
    media_order: List[str] = []
    experience_tags: List[str] = []
    price_from: Optional[float] = None
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
def login(request: LoginRequest, http_request: Request):
    ip = get_client_ip(http_request)
    now = time.monotonic()
    with login_failures_lock:
        for key in [key for key, times in login_failures.items() if now - times[-1] >= LOGIN_WINDOW_SECONDS]:
            del login_failures[key]
        failures = [t for t in login_failures.get(ip, []) if now - t < LOGIN_WINDOW_SECONDS]
        if len(failures) >= LOGIN_MAX_FAILURES:
            minutes = math.ceil((LOGIN_WINDOW_SECONDS - (now - failures[0])) / 60)
            raise HTTPException(status_code=429, detail=f"Trop de tentatives. Réessayez dans {minutes} min.")
        if check_admin_password(request.password):
            login_failures.pop(ip, None)
            token = create_token({"sub": "admin"})
            return {"token": token, "message": "Connexion réussie"}
        login_failures[ip] = failures + [now]
    raise HTTPException(status_code=401, detail="Mot de passe incorrect")

@app.get("/api/auth/verify")
def verify_auth(payload: dict = Depends(verify_token)):
    return {"valid": True, "user": payload.get("sub")}

@app.post("/api/auth/change-password")
def change_password(request: ChangePasswordRequest, payload: dict = Depends(verify_token)):
    if not check_admin_password(request.current_password):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    # bcrypt ne prend en compte que les 72 premiers octets
    if len(request.new_password.encode("utf-8")) > 72:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe ne doit pas dépasser 72 caractères")
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
    log_activity("created", "place", place_dict["id"], place_dict["title"], place_dict["created_at"])
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
    log_activity("updated", "place", place_id, updated["title"])
    return updated

@app.delete("/api/places/{place_id}")
def delete_place(place_id: str, payload: dict = Depends(verify_token)):
    deleted = places_collection.find_one_and_delete({"id": place_id})
    if not deleted:
        raise HTTPException(status_code=404, detail="Lieu non trouvé")
    log_activity("deleted", "place", place_id, deleted["title"])
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
    if not (file.content_type.startswith("image/") or file.content_type.startswith("video/")):
        raise HTTPException(status_code=400, detail="Seules les images et vidéos sont acceptées")
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
    log_activity("created", "guide", guide_dict["id"], guide_dict["title"], now)
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
    # Un seul événement par enregistrement : le changement de statut prime sur la modification
    action = "updated"
    if "published" in update_data and bool(update_data["published"]) != bool(existing.get("published")):
        action = "published" if update_data["published"] else "unpublished"
    log_activity(action, "guide", guide_id, updated["title"], update_data["updated_at"])
    return updated

@app.delete("/api/guides/{guide_id}")
def delete_guide(guide_id: str, payload: dict = Depends(verify_token)):
    deleted = guides_collection.find_one_and_delete({"id": guide_id})
    if not deleted:
        raise HTTPException(status_code=404, detail="Guide non trouvé")
    log_activity("deleted", "guide", guide_id, deleted["title"])
    guide_dir = UPLOAD_DIR / "guides" / guide_id
    if guide_dir.exists():
        shutil.rmtree(guide_dir)
    return {"message": "Guide supprimé"}

def fetch_umami_daily_views(start: datetime, end: datetime):
    # Vues par jour (heure de Paris) renvoyées par l'API d'Umami, sous la forme {"YYYY-MM-DD": vues}
    query = urllib.parse.urlencode({
        "startAt": int(start.timestamp() * 1000),
        "endAt": int(end.timestamp() * 1000),
        "unit": "day",
        "timezone": ANALYTICS_TIMEZONE,
    })
    try:
        umami_request = urllib.request.Request(
            f"{UMAMI_URL}/api/websites/{urllib.parse.quote(UMAMI_WEBSITE_ID)}/pageviews?{query}",
            headers={"Authorization": f"Bearer {UMAMI_API_KEY}", "Accept": "application/json"},
        )
        with urllib.request.urlopen(umami_request, timeout=10) as response:
            data = json.loads(response.read().decode("utf-8"))
        views_by_day = {}
        for point in data["pageviews"]:
            day = point["x"][:10]
            views_by_day[day] = views_by_day.get(day, 0) + int(point["y"])
        return views_by_day
    except urllib.error.HTTPError as error:
        if error.code in (401, 403):
            detail = "Umami a refusé la clé API (vérifiez UMAMI_API_KEY)"
        elif error.code == 404:
            detail = "Site introuvable dans Umami (vérifiez UMAMI_WEBSITE_ID)"
        else:
            detail = f"Umami a renvoyé une erreur {error.code}"
        raise HTTPException(status_code=503, detail=f"Statistiques indisponibles : {detail}")
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError):
        raise HTTPException(status_code=503, detail="Statistiques indisponibles : Umami ne répond pas")

@app.get("/api/admin/analytics")
def get_analytics(period: str = "7d", payload: dict = Depends(verify_token)):
    if period not in ANALYTICS_PERIODS:
        raise HTTPException(status_code=400, detail="Période invalide (7d, 30d ou 90d)")
    if not (UMAMI_URL and UMAMI_WEBSITE_ID and UMAMI_API_KEY):
        return {
            "configured": False,
            "period": period,
            "daily": [],
            "total_views": None,
            "previous_period_views": None,
            "last_30_days_views": None,
            "previous_30_days_views": None,
        }

    days = ANALYTICS_PERIODS[period]
    paris = ZoneInfo(ANALYTICS_TIMEZONE)
    now = datetime.now(paris)
    today = now.date()
    # Une seule requête couvre la période, la période précédente et les 60 derniers jours
    span = max(2 * days, 60)
    first_day = today - timedelta(days=span - 1)
    views_by_day = fetch_umami_daily_views(datetime.combine(first_day, dt_time.min, tzinfo=paris), now)

    def sum_views(start_offset, end_offset):
        # Somme des vues de today - start_offset à today - end_offset inclus
        return sum(
            views_by_day.get((today - timedelta(days=offset)).isoformat(), 0)
            for offset in range(end_offset, start_offset + 1)
        )

    daily = []
    for offset in range(days - 1, -1, -1):
        day = (today - timedelta(days=offset)).isoformat()
        daily.append({"date": day, "views": views_by_day.get(day, 0)})

    return {
        "configured": True,
        "period": period,
        "daily": daily,
        "total_views": sum_views(days - 1, 0),
        "previous_period_views": sum_views(2 * days - 1, days),
        "last_30_days_views": sum_views(29, 0),
        "previous_30_days_views": sum_views(59, 30),
    }

@app.get("/api/admin/activity")
def get_activity(limit: int = Query(10, ge=1, le=100), payload: dict = Depends(verify_token)):
    # Dernières entrées du journal, de la plus récente à la plus ancienne
    return list(activity_collection.find({}, {"_id": 0}).sort([("timestamp", -1), ("_id", -1)]).limit(limit))



@app.get("/sitemap.xml")
def sitemap():
    from fastapi.responses import Response
    base = "https://www.deuxpasunmonde.fr"
    urls = [
        f"<url><loc>{base}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>",
        f"<url><loc>{base}/guides</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>",
    ]
    for place in places_collection.find({}, {"id": 1, "_id": 0}):
        pid = place["id"]
        urls.append(f"<url><loc>{base}/place/{pid}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>")
    for guide in guides_collection.find({"published": True}, {"id": 1, "_id": 0}):
        gid = guide["id"]
        urls.append(f"<url><loc>{base}/guides/{gid}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>")
    xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    xml += "\n".join(urls)
    xml += "\n</urlset>"
    return Response(content=xml, media_type="application/xml")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
