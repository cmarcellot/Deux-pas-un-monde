import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Map, List, Home, Settings, Star, MapPin, X, Plus, Trash2, Edit3,
  LogOut, Upload, ChevronLeft, ChevronRight, Filter, Bed, Utensils,
  Compass, Gem, Eye, Save, Key, ZoomIn,
  BookOpen, Calendar, Globe, Tag, Clock, Wallet, Info, ChevronDown, ChevronUp, Plane
} from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://deux-pas-un-monde.onrender.com';

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = ['bold', 'italic', 'underline', 'list', 'bullet', 'link'];

const GUIDE_TAGS = [
  { id: 'all',         name: 'Tous les guides' },
  { id: 'aventure',    name: 'Aventure' },
  { id: 'culture',     name: 'Culture' },
  { id: 'gastronomie', name: 'Gastronomie' },
  { id: 'nature',      name: 'Nature' },
  { id: 'famille',     name: 'Famille' },
  { id: 'city-break',  name: 'City Break' },
  { id: 'road-trip',   name: 'Road Trip' },
];

const SEASONS = ['Printemps', 'Été', 'Automne', 'Hiver'];

const EMPTY_GUIDE = {
  title: '', destination: '', country: '', duration_days: 3,
  cover_image: '', intro: '',
  itinerary: [],
  practical_info: {
    budget_min: '', budget_max: '', best_seasons: [],
    transport_tips: '', visa_info: '', language_tips: '', currency: '',
  },
  tags: [], photos: [], place_ids: [], published: false,
};

const CATEGORIES = [
  { id: 'all', name: 'Tous', icon: Filter, color: '#E8E0D5' },
  { id: 'accommodation', name: 'Hébergements', icon: Bed, color: '#C66B3D' },
  { id: 'restaurant', name: 'Restaurants', icon: Utensils, color: '#E8E0D5' },
  { id: 'activity', name: 'Activités', icon: Compass, color: '#4CAF50' },
  { id: 'gem', name: 'Bonnes adresses', icon: Gem, color: '#A0A0A0' },
];

const createMarkerIcon = (category) => {
  const colors = { accommodation: '#C66B3D', restaurant: '#E8E0D5', activity: '#4CAF50', gem: '#A0A0A0' };
  const color = colors[category] || '#C66B3D';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #1A1A1A;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32],
  });
};

const getPhotoSrc = (photo) => photo.startsWith('/api') ? `${API_URL}${photo}` : photo;

// ============================================================
// LIGHTBOX
// ============================================================
const Lightbox = ({ photos, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);

  const goTo = useCallback((idx, dir) => {
    setDirection(dir);
    setCurrentIndex(idx);
  }, []);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1, -1);
  }, [currentIndex, goTo]);

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) goTo(currentIndex + 1, 1);
  }, [currentIndex, photos.length, goTo]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [goPrev, goNext, onClose]);

  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? goNext() : goPrev();
    setTouchStartX(null);
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0, scale: 0.95 }),
  };

  return (
    <motion.div
      className="lightbox-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      data-testid="lightbox"
    >
      {/* Top bar */}
      <div className="lightbox-topbar" onClick={(e) => e.stopPropagation()}>
        <span className="lightbox-counter">{currentIndex + 1} / {photos.length}</span>
        <button className="lightbox-close" onClick={onClose} aria-label="Fermer" data-testid="lightbox-close">
          <X size={24} />
        </button>
      </div>

      {/* Stage */}
      <div
        className="lightbox-stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentIndex > 0 && (
          <button className="lightbox-arrow lightbox-arrow-prev" onClick={goPrev} aria-label="Précédente" data-testid="lightbox-prev">
            <ChevronLeft size={36} />
          </button>
        )}

        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentIndex}
            className="lightbox-image-wrap"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <img
              src={getPhotoSrc(photos[currentIndex])}
              alt={`Photo ${currentIndex + 1}`}
              className="lightbox-image"
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>

        {currentIndex < photos.length - 1 && (
          <button className="lightbox-arrow lightbox-arrow-next" onClick={goNext} aria-label="Suivante" data-testid="lightbox-next">
            <ChevronRight size={36} />
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="lightbox-thumbnails" onClick={(e) => e.stopPropagation()}>
          {photos.map((photo, idx) => (
            <button
              key={idx}
              className={`lightbox-thumb ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => goTo(idx, idx > currentIndex ? 1 : -1)}
            >
              <img src={getPhotoSrc(photo)} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ============================================================
// STAR RATING
// ============================================================
const StarRating = ({ rating, onChange, readonly = true }) => (
  <div className="star-rating" data-testid="star-rating">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" onClick={() => !readonly && onChange?.(star)}
        className={`star-btn ${readonly ? 'readonly' : ''}`} data-testid={`star-${star}`}>
        <Star size={20} fill={star <= rating ? '#C66B3D' : 'transparent'} color={star <= rating ? '#C66B3D' : '#666666'} />
      </button>
    ))}
  </div>
);

// ============================================================
// PLACE CARD
// ============================================================
const PlaceCard = ({ place, onClick }) => {
  const category = CATEGORIES.find(c => c.id === place.category);
  const CategoryIcon = category?.icon || MapPin;
  return (
    <motion.div className="place-card" whileHover={{ y: -4 }} onClick={onClick} data-testid={`place-card-${place.id}`}>
      <div className="place-card-image">
        {place.photos?.[0] ? (
          <img src={getPhotoSrc(place.photos[0])} alt={place.title} />
        ) : (
          <div className="place-card-placeholder"><CategoryIcon size={48} /></div>
        )}
        <div className="place-card-category" style={{ background: category?.color }}>
          <CategoryIcon size={14} color="#1A1A1A" />
        </div>
      </div>
      <div className="place-card-content">
        <h3>{place.title}</h3>
        <p className="place-card-address"><MapPin size={14} />{place.address}</p>
        <StarRating rating={place.rating} readonly />
      </div>
    </motion.div>
  );
};

// ============================================================
// GUIDE CARD
// ============================================================
const GuideCard = ({ guide, onClick }) => (
  <motion.div className="guide-card" whileHover={{ y: -4 }} onClick={onClick}>
    <div className="guide-card-image">
      {guide.cover_image
        ? <img src={guide.cover_image} alt={guide.title} />
        : <div className="guide-card-placeholder"><BookOpen size={48} /></div>}
      <div className="guide-card-duration"><Calendar size={13} />{guide.duration_days}j</div>
    </div>
    <div className="guide-card-content">
      <div className="guide-card-destination"><Globe size={13} />{guide.destination}, {guide.country}</div>
      <h3>{guide.title}</h3>
      <div className="guide-card-tags">
        {guide.tags.slice(0, 3).map(tag => <span key={tag} className="guide-tag-pill">{tag}</span>)}
      </div>
    </div>
  </motion.div>
);

// ============================================================
// GUIDE TAG FILTER
// ============================================================
const GuideTagFilter = ({ activeTag, onChange }) => (
  <div className="category-filter">
    {GUIDE_TAGS.map(tag => (
      <button key={tag.id} className={`category-pill ${activeTag === tag.id ? 'active' : ''}`}
        onClick={() => onChange(tag.id)}>
        <span>{tag.name}</span>
      </button>
    ))}
  </div>
);

// ============================================================
// CATEGORY FILTER
// ============================================================
const CategoryFilter = ({ activeCategory, onChange }) => (
  <div className="category-filter" data-testid="category-filter">
    {CATEGORIES.map((cat) => {
      const Icon = cat.icon;
      return (
        <button key={cat.id} className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
          onClick={() => onChange(cat.id)} data-testid={`category-${cat.id}`}>
          <Icon size={16} /><span>{cat.name}</span>
        </button>
      );
    })}
  </div>
);

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
};

// ============================================================
// PLACE DETAIL MODAL — with lightbox
// ============================================================
const PlaceDetailModal = ({ place, onClose }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  if (!place) return null;
  const category = CATEGORIES.find(c => c.id === place.category);
  const CategoryIcon = category?.icon || MapPin;

  const openLightbox = (idx) => { setLightboxIndex(idx); setLightboxOpen(true); };

  return (
    <>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.div className="place-detail-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} data-testid="place-detail-modal">
          <button className="modal-close-btn" onClick={onClose} data-testid="close-modal-btn"><X size={24} /></button>

          <div className="modal-gallery">
            {place.photos?.length > 0 ? (
              <>
                <div className="modal-main-image clickable-photo" onClick={() => openLightbox(currentImage)} title="Cliquer pour agrandir">
                  <img src={getPhotoSrc(place.photos[currentImage])} alt={place.title} />
                  <div className="photo-zoom-hint"><ZoomIn size={18} /></div>
                </div>
                {place.photos.length > 1 && (
                  <div className="modal-thumbnails">
                    {place.photos.map((photo, idx) => (
                      <button key={idx} className={`modal-thumb ${idx === currentImage ? 'active' : ''}`} onClick={() => setCurrentImage(idx)}>
                        <img src={getPhotoSrc(photo)} alt={`${place.title} ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="modal-no-image"><CategoryIcon size={64} /></div>
            )}
          </div>

          <div className="modal-content">
            <div className="modal-header">
              <h2>{place.title}</h2>
              <div className="modal-meta">
                <div className="category-badge" style={{ background: category?.color }}>
                  <CategoryIcon size={14} color="#414441" /><span>{category?.name}</span>
                </div>
                <StarRating rating={place.rating} readonly />
              </div>
            </div>
            <div className="modal-address"><MapPin size={18} /><span>{place.address}</span></div>
            <div className="modal-description" dangerouslySetInnerHTML={{ __html: place.description }} />
            <div className="modal-map">
              <MapContainer center={[place.latitude, place.longitude]} zoom={14}
                style={{ height: '200px', width: '100%', borderRadius: '12px' }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
                <Marker position={[place.latitude, place.longitude]} icon={createMarkerIcon(place.category)} />
              </MapContainer>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {lightboxOpen && <Lightbox photos={place.photos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />}
      </AnimatePresence>
    </>
  );
};

// ============================================================
// HOME PAGE
// ============================================================
const HomePage = () => {
  const [places, setPlaces] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenter, setMapCenter] = useState([46.603354, 1.888334]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchPlaces(); }, [activeCategory]);

  const fetchPlaces = async () => {
    try {
      const url = activeCategory === 'all' ? `${API_URL}/api/places` : `${API_URL}/api/places?category=${activeCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setPlaces(data);
      if (data.length > 0) setMapCenter([data[0].latitude, data[0].longitude]);
    } catch { toast.error('Erreur lors du chargement des lieux'); }
    finally { setLoading(false); }
  };

  return (
    <div className="home-page">
      <header className="header" data-testid="header">
        <Link to="/" className="logo">
          <img src="https://customer-assets.emergentagent.com/job_trip-spots-1/artifacts/w33bidjg_682F1216-435E-40FA-84C2-279EE5063CDF.PNG" alt="Deux pas un monde" />
        </Link>
        <nav className="header-nav">
          <button className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} data-testid="view-list-btn"><List size={20} /></button>
          <button className={`view-toggle ${viewMode === 'map' ? 'active' : ''}`} onClick={() => setViewMode('map')} data-testid="view-map-btn"><Map size={20} /></button>
          <Link to="/guides" className="guides-nav-link" data-testid="guides-nav-link"><BookOpen size={20} /><span className="nav-link-label">Guides</span></Link>
          <a href="https://www.instagram.com/deuxpas_unmonde?igsh=MTFtYm0ydnI0aDQ0Zw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="instagram-link" data-testid="instagram-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <Link to="/admin" className="admin-link" data-testid="admin-link"><Settings size={20} /></Link>
        </nav>
      </header>

      <div className="hero-section">
        <h1>Découvrez nos bonnes adresses</h1>
        <p>🌍 On teste, on partage, on recommande</p>
      </div>

      <CategoryFilter activeCategory={activeCategory} onChange={setActiveCategory} />

      <div className={`content-wrapper ${viewMode}`}>
        {viewMode === 'list' ? (
          <div className="places-grid" data-testid="places-grid">
            {loading ? <div className="loading">Chargement...</div>
              : places.length === 0 ? (
                <div className="empty-state" data-testid="empty-state">
                  <MapPin size={48} /><h3>Aucun lieu pour le moment</h3><p>Les bonnes adresses arrivent bientôt !</p>
                </div>
              ) : places.map((place) => (
                <PlaceCard key={place.id} place={place} onClick={() => setSelectedPlace(place)} />
              ))}
          </div>
        ) : (
          <div className="map-wrapper" data-testid="map-wrapper">
            <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              <MapRecenter center={mapCenter} />
              {places.map((place) => (
                <Marker key={place.id} position={[place.latitude, place.longitude]} icon={createMarkerIcon(place.category)}
                  eventHandlers={{ click: () => setSelectedPlace(place) }}>
                  <Popup>
                    <div className="map-popup" onClick={() => setSelectedPlace(place)}>
                      <h4>{place.title}</h4><p>{place.address}</p><StarRating rating={place.rating} readonly />
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>Deux pas un monde © 2026 - Suivez-nous sur <a href="https://www.instagram.com/deuxpas_unmonde?igsh=MTFtYm0ydnI0aDQ0Zw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer"> Instagram</a></p>
      </footer>

      <AnimatePresence>
        {selectedPlace && <PlaceDetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// GUIDES LIST PAGE — /guides
// ============================================================
const GuidesPage = () => {
  const [guides, setGuides] = useState([]);
  const [activeTag, setActiveTag] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchGuides(); }, [activeTag]);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const params = activeTag !== 'all' ? `?tag=${activeTag}` : '';
      const res = await fetch(`${API_URL}/api/guides${params}`);
      const data = await res.json();
      setGuides(Array.isArray(data) ? data : []);
    } catch { toast.error('Erreur lors du chargement des guides'); }
    finally { setLoading(false); }
  };

  return (
    <div className="guides-page">
      <header className="header">
        <Link to="/" className="logo">
          <img src="https://customer-assets.emergentagent.com/job_trip-spots-1/artifacts/w33bidjg_682F1216-435E-40FA-84C2-279EE5063CDF.PNG" alt="Deux pas un monde" />
        </Link>
        <nav className="header-nav">
          <Link to="/guides" className="guides-nav-link active"><BookOpen size={20} /><span className="nav-link-label">Guides</span></Link>
          <a href="https://www.instagram.com/deuxpas_unmonde?igsh=MTFtYm0ydnI0aDQ0Zw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="instagram-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </a>
          <Link to="/admin" className="admin-link"><Settings size={20} /></Link>
        </nav>
      </header>

      <div className="guides-hero">
        <h1>Guides de Voyage</h1>
        <p>Itinéraires jour par jour, conseils pratiques et bonnes adresses</p>
      </div>

      <GuideTagFilter activeTag={activeTag} onChange={setActiveTag} />

      <div className="content-wrapper">
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : guides.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={48} /><h3>Aucun guide pour le moment</h3><p>Les guides arrivent bientôt !</p>
          </div>
        ) : (
          <div className="guides-grid">
            {guides.map(guide => (
              <GuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guides/${guide.id}`)} />
            ))}
          </div>
        )}
      </div>

      <footer className="footer">
        <p>Deux pas un monde © 2026 — Suivez-nous sur <a href="https://www.instagram.com/deuxpas_unmonde?igsh=MTFtYm0ydnI0aDQ0Zw%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer">Instagram</a></p>
      </footer>
    </div>
  );
};

// ============================================================
// DAY ACCORDION — itinerary day component
// ============================================================
const DayAccordion = ({ day, places, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen || false);
  const placeMap = places.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

  return (
    <div className={`day-accordion ${open ? 'open' : ''}`}>
      <button className="day-accordion-header" onClick={() => setOpen(!open)}>
        <div className="day-accordion-title">
          <span className="day-number-badge">Jour {day.day_number}</span>
          <h3>{day.title}</h3>
        </div>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="day-accordion-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}>
            {day.description && <p className="day-description" dangerouslySetInnerHTML={{ __html: day.description }} />}
            {day.activities.length > 0 && (
              <div className="day-activities">
                {day.activities.map((act, i) => (
                  <div key={i} className="activity-item">
                    {act.time && <span className="activity-time">{act.time}</span>}
                    <div className="activity-content">
                      <strong>{act.title}</strong>
                      {act.description && <p>{act.description}</p>}
                      {act.place_id && placeMap[act.place_id] && (
                        <div className="activity-place-ref"><MapPin size={13} />{placeMap[act.place_id].title}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {day.tips.length > 0 && (
              <div className="day-tips">
                <h4><Info size={15} /> Conseils du jour</h4>
                <ul>{day.tips.map((tip, i) => <li key={i}>{tip}</li>)}</ul>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// GUIDE DETAIL PAGE — /guides/:id
// ============================================================
const GuideDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [guide, setGuide] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [activeSection, setActiveSection] = useState('itinerary');

  useEffect(() => { fetchGuide(); }, [id]);

  const fetchGuide = async () => {
    try {
      const res = await fetch(`${API_URL}/api/guides/${id}`);
      if (!res.ok) throw new Error();
      const g = await res.json();
      setGuide(g);
      if (g.place_ids?.length > 0) {
        const results = await Promise.all(
          g.place_ids.map(pid => fetch(`${API_URL}/api/places/${pid}`).then(r => r.ok ? r.json() : null))
        );
        setPlaces(results.filter(Boolean));
      }
    } catch { toast.error('Guide non trouvé'); navigate('/guides'); }
    finally { setLoading(false); }
  };

  if (loading || !guide) return <div className="loading-page">Chargement...</div>;

  const allPhotos = [guide.cover_image, ...guide.photos].filter(Boolean);
  const mapCenter = places.length > 0 ? [places[0].latitude, places[0].longitude] : [46.6, 1.9];

  const sections = [
    { id: 'itinerary', label: 'Itinéraire', icon: Calendar },
    { id: 'practical', label: 'Infos pratiques', icon: Info },
    { id: 'photos',    label: 'Photos',          icon: ZoomIn },
    { id: 'map',       label: 'Carte',            icon: Map },
  ];

  return (
    <>
      <motion.div className="guide-detail-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <header className="detail-header">
          <button onClick={() => navigate(-1)} className="back-btn"><ChevronLeft size={24} /></button>
          <h2>{guide.title}</h2>
        </header>

        {guide.cover_image && (
          <div className="guide-hero-image clickable-photo"
            onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
            <img src={guide.cover_image} alt={guide.title} />
            <div className="photo-zoom-hint"><ZoomIn size={18} /></div>
            <div className="guide-hero-overlay">
              <div className="guide-hero-meta">
                <span className="guide-meta-chip"><Globe size={14} />{guide.destination}, {guide.country}</span>
                <span className="guide-meta-chip"><Calendar size={14} />{guide.duration_days} jours</span>
              </div>
            </div>
          </div>
        )}

        {guide.tags.length > 0 && (
          <div className="guide-tags-row">
            {guide.tags.map(tag => <span key={tag} className="guide-tag-pill">{tag}</span>)}
          </div>
        )}

        <div className="guide-section-tabs">
          {sections.map(({ id: sid, label, icon: Icon }) => (
            <button key={sid}
              className={`guide-tab-btn ${activeSection === sid ? 'active' : ''}`}
              onClick={() => setActiveSection(sid)}>
              <Icon size={15} />{label}
            </button>
          ))}
        </div>

        <div className="guide-detail-content">
          {guide.intro && (
            <div className="guide-intro" dangerouslySetInnerHTML={{ __html: guide.intro }} />
          )}

          {activeSection === 'itinerary' && (
            <div className="guide-itinerary">
              {guide.itinerary.length === 0
                ? <p className="guide-empty-section">Itinéraire à venir…</p>
                : guide.itinerary.map((day, i) => (
                    <DayAccordion key={i} day={day} places={places} defaultOpen={i === 0} />
                  ))}
            </div>
          )}

          {activeSection === 'practical' && (
            <div className="guide-practical">
              {(guide.practical_info?.budget_min || guide.practical_info?.budget_max) && (
                <div className="practical-block">
                  <h4><Wallet size={16} /> Budget estimé</h4>
                  <p>{guide.practical_info.budget_min}€ – {guide.practical_info.budget_max}€ / pers / jour</p>
                </div>
              )}
              {guide.practical_info?.best_seasons?.length > 0 && (
                <div className="practical-block">
                  <h4><Calendar size={16} /> Meilleures saisons</h4>
                  <div className="season-pills">
                    {guide.practical_info.best_seasons.map(s => <span key={s} className="season-pill">{s}</span>)}
                  </div>
                </div>
              )}
              {guide.practical_info?.transport_tips && (
                <div className="practical-block">
                  <h4><Plane size={16} /> Transports</h4>
                  <p>{guide.practical_info.transport_tips}</p>
                </div>
              )}
              {guide.practical_info?.visa_info && (
                <div className="practical-block">
                  <h4><Info size={16} /> Visa & formalités</h4>
                  <p>{guide.practical_info.visa_info}</p>
                </div>
              )}
              {guide.practical_info?.currency && (
                <div className="practical-block">
                  <h4><Wallet size={16} /> Monnaie</h4>
                  <p>{guide.practical_info.currency}</p>
                </div>
              )}
              {guide.practical_info?.language_tips && (
                <div className="practical-block">
                  <h4><Globe size={16} /> Langue</h4>
                  <p>{guide.practical_info.language_tips}</p>
                </div>
              )}
              {!guide.practical_info?.budget_min && !guide.practical_info?.transport_tips &&
               !guide.practical_info?.visa_info && !guide.practical_info?.currency &&
               !guide.practical_info?.language_tips && guide.practical_info?.best_seasons?.length === 0 && (
                <p className="guide-empty-section">Informations pratiques à venir…</p>
              )}
            </div>
          )}

          {activeSection === 'photos' && (
            <div className="guide-photos-grid">
              {allPhotos.length === 0
                ? <p className="guide-empty-section">Aucune photo pour ce guide.</p>
                : allPhotos.map((photo, i) => (
                    <div key={i} className="guide-photo-thumb clickable-photo"
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                      <img src={photo} alt={`${guide.title} ${i + 1}`} />
                      <div className="photo-zoom-hint"><ZoomIn size={18} /></div>
                    </div>
                  ))}
            </div>
          )}

          {activeSection === 'map' && (
            <div className="guide-map-section">
              {places.length === 0
                ? <p className="guide-empty-section">Aucun lieu lié à ce guide.</p>
                : (
                  <MapContainer center={mapCenter} zoom={7}
                    style={{ height: '400px', width: '100%', borderRadius: '12px' }}
                    scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
                    {places.map(place => (
                      <Marker key={place.id} position={[place.latitude, place.longitude]} icon={createMarkerIcon(place.category)}>
                        <Popup><div className="map-popup"><h4>{place.title}</h4><p>{place.address}</p></div></Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
            </div>
          )}
        </div>

        <Link to="/guides" className="floating-home"><BookOpen size={22} /></Link>
      </motion.div>

      <AnimatePresence>
        {lightboxOpen && allPhotos.length > 0 && (
          <Lightbox photos={allPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================================
// PLACE DETAIL PAGE — with lightbox
// ============================================================
const PlaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [place, setPlace] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => { fetchPlace(); }, [id]);

  const fetchPlace = async () => {
    try {
      const res = await fetch(`${API_URL}/api/places/${id}`);
      if (!res.ok) throw new Error('Lieu non trouvé');
      setPlace(await res.json());
    } catch { toast.error('Lieu non trouvé'); navigate('/'); }
    finally { setLoading(false); }
  };

  if (loading || !place) return <div className="loading-page">Chargement...</div>;

  const category = CATEGORIES.find(c => c.id === place.category);
  const CategoryIcon = category?.icon || MapPin;
  const openLightbox = (idx) => { setLightboxIndex(idx); setLightboxOpen(true); };

  return (
    <>
      <motion.div className="place-detail-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <header className="detail-header">
          <button onClick={() => navigate(-1)} className="back-btn" data-testid="back-btn"><ChevronLeft size={24} /></button>
          <h2>{place.title}</h2>
        </header>

        <div className="detail-gallery" data-testid="detail-gallery">
          {place.photos?.length > 0 ? (
            <>
              <div className="main-image clickable-photo" onClick={() => openLightbox(currentImage)} title="Cliquer pour agrandir">
                <img src={getPhotoSrc(place.photos[currentImage])} alt={place.title} />
                <div className="photo-zoom-hint"><ZoomIn size={18} /></div>
              </div>
              {place.photos.length > 1 && (
                <div className="thumbnail-strip">
                  {place.photos.map((photo, idx) => (
                    <button key={idx} className={`thumbnail ${idx === currentImage ? 'active' : ''}`} onClick={() => setCurrentImage(idx)}>
                      <img src={getPhotoSrc(photo)} alt={`${place.title} ${idx + 1}`} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : <div className="no-image"><CategoryIcon size={64} /></div>}
        </div>

        <div className="detail-content">
          <div className="detail-meta">
            <div className="category-badge" style={{ background: category?.color }}>
              <CategoryIcon size={16} color="#1A1A1A" /><span>{category?.name}</span>
            </div>
            <StarRating rating={place.rating} readonly />
          </div>
          <div className="detail-address"><MapPin size={18} /><span>{place.address}</span></div>
          <p className="detail-description">{place.description}</p>
          <div className="detail-map" data-testid="detail-map">
            <MapContainer center={[place.latitude, place.longitude]} zoom={14}
              style={{ height: '250px', width: '100%', borderRadius: '12px' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              <Marker position={[place.latitude, place.longitude]} icon={createMarkerIcon(place.category)} />
            </MapContainer>
          </div>
        </div>
        <Link to="/" className="floating-home" data-testid="floating-home"><Home size={24} /></Link>
      </motion.div>

      <AnimatePresence>
        {lightboxOpen && <Lightbox photos={place.photos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />}
      </AnimatePresence>
    </>
  );
};

// ============================================================
// ADMIN GUIDE FORM
// ============================================================
const AdminGuideForm = ({ show, guideFormData, setGuideFormData, editingGuide, onSubmit, onClose, loading, places }) => {
  if (!show) return null;

  const handleImageUpload = async (e, field) => {
    const files = Array.from(e.target.files);
    const token = localStorage.getItem('admin_token');
    for (const file of files) {
      const fd = new FormData(); fd.append('file', file);
      try {
        const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (res.ok) {
          if (field === 'cover_image') {
            setGuideFormData(prev => ({ ...prev, cover_image: data.url }));
          } else {
            setGuideFormData(prev => ({ ...prev, photos: [...prev.photos, data.url] }));
          }
          toast.success('Image uploadée');
        }
      } catch { toast.error('Erreur upload image'); }
    }
  };

  const addDay = () => {
    const nextDay = guideFormData.itinerary.length + 1;
    setGuideFormData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, { day_number: nextDay, title: '', description: '', activities: [], tips: [], place_ids: [] }]
    }));
  };

  const removeDay = (idx) => {
    setGuideFormData(prev => ({
      ...prev,
      itinerary: prev.itinerary.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day_number: i + 1 }))
    }));
  };

  const updateDay = (idx, field, value) => {
    setGuideFormData(prev => {
      const itinerary = [...prev.itinerary];
      itinerary[idx] = { ...itinerary[idx], [field]: value };
      return { ...prev, itinerary };
    });
  };

  const updateDayTips = (idx, value) => {
    updateDay(idx, 'tips', value.split('\n').filter(t => t.trim()));
  };

  const addActivity = (dayIdx) => {
    setGuideFormData(prev => {
      const itinerary = [...prev.itinerary];
      itinerary[dayIdx] = {
        ...itinerary[dayIdx],
        activities: [...itinerary[dayIdx].activities, { time: '', title: '', description: '', place_id: null }]
      };
      return { ...prev, itinerary };
    });
  };

  const updateActivity = (dayIdx, actIdx, field, value) => {
    setGuideFormData(prev => {
      const itinerary = [...prev.itinerary];
      const activities = [...itinerary[dayIdx].activities];
      activities[actIdx] = { ...activities[actIdx], [field]: value || null };
      itinerary[dayIdx] = { ...itinerary[dayIdx], activities };
      return { ...prev, itinerary };
    });
  };

  const removeActivity = (dayIdx, actIdx) => {
    setGuideFormData(prev => {
      const itinerary = [...prev.itinerary];
      itinerary[dayIdx] = { ...itinerary[dayIdx], activities: itinerary[dayIdx].activities.filter((_, i) => i !== actIdx) };
      return { ...prev, itinerary };
    });
  };

  const toggleTag = (tag) => {
    setGuideFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const toggleSeason = (season) => {
    setGuideFormData(prev => ({
      ...prev,
      practical_info: {
        ...prev.practical_info,
        best_seasons: prev.practical_info.best_seasons.includes(season)
          ? prev.practical_info.best_seasons.filter(s => s !== season)
          : [...prev.practical_info.best_seasons, season]
      }
    }));
  };

  return (
    <motion.div className="form-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="form-modal guide-form-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
        <div className="form-header">
          <h2>{editingGuide ? 'Modifier le guide' : 'Nouveau guide de voyage'}</h2>
          <button onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>
        <form onSubmit={onSubmit} className="place-form">
          {/* Informations de base */}
          <h3 className="form-section-title"><Globe size={16} />Informations générales</h3>
          <div className="form-grid">
            <div className="form-group full-width"><label>Titre du guide *</label>
              <input type="text" value={guideFormData.title} onChange={e => setGuideFormData(p => ({ ...p, title: e.target.value }))} required placeholder="Ex: 10 jours au Japon" /></div>
            <div className="form-group"><label>Destination *</label>
              <input type="text" value={guideFormData.destination} onChange={e => setGuideFormData(p => ({ ...p, destination: e.target.value }))} required placeholder="Ex: Tokyo" /></div>
            <div className="form-group"><label>Pays *</label>
              <input type="text" value={guideFormData.country} onChange={e => setGuideFormData(p => ({ ...p, country: e.target.value }))} required placeholder="Ex: Japon" /></div>
            <div className="form-group"><label>Durée (jours) *</label>
              <input type="number" min="1" max="365" value={guideFormData.duration_days} onChange={e => setGuideFormData(p => ({ ...p, duration_days: parseInt(e.target.value) || 1 }))} required /></div>
            <div className="form-group">
              <label>Statut</label>
              <div className="toggle-row">
                <input type="checkbox" id="published" checked={guideFormData.published} onChange={e => setGuideFormData(p => ({ ...p, published: e.target.checked }))} />
                <label htmlFor="published" className="toggle-label">Publié</label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <h3 className="form-section-title"><Tag size={16} />Tags</h3>
          <div className="tags-checkboxes">
            {GUIDE_TAGS.filter(t => t.id !== 'all').map(tag => (
              <label key={tag.id} className={`tag-checkbox ${guideFormData.tags.includes(tag.id) ? 'checked' : ''}`}>
                <input type="checkbox" checked={guideFormData.tags.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
                {tag.name}
              </label>
            ))}
          </div>

          {/* Image de couverture */}
          <h3 className="form-section-title"><ZoomIn size={16} />Image de couverture</h3>
          <div className="form-group">
            <div className="photo-upload-area">
              <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'cover_image')} id="cover-upload" className="hidden" />
              <label htmlFor="cover-upload" className="upload-btn"><Upload size={20} />Choisir une image</label>
              {guideFormData.cover_image && (
                <div className="uploaded-photos">
                  <div className="uploaded-photo">
                    <img src={guideFormData.cover_image} alt="Couverture" />
                    <button type="button" onClick={() => setGuideFormData(p => ({ ...p, cover_image: '' }))} className="remove-photo"><X size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Introduction */}
          <h3 className="form-section-title"><BookOpen size={16} />Introduction</h3>
          <div className="form-group full-width">
            <div className="quill-wrapper">
              <ReactQuill theme="snow" value={guideFormData.intro} onChange={v => setGuideFormData(p => ({ ...p, intro: v }))} modules={quillModules} formats={quillFormats} placeholder="Présentez votre guide de voyage..." />
            </div>
          </div>

          {/* Itinéraire */}
          <h3 className="form-section-title"><Calendar size={16} />Itinéraire jour par jour</h3>
          {guideFormData.itinerary.map((day, dayIdx) => (
            <div key={dayIdx} className="day-form-block">
              <div className="day-form-header">
                <span className="day-number-badge">Jour {day.day_number}</span>
                <button type="button" onClick={() => removeDay(dayIdx)} className="action-btn delete" style={{ marginLeft: 'auto' }}><Trash2 size={16} /></button>
              </div>
              <div className="form-group"><label>Titre du jour *</label>
                <input type="text" value={day.title} onChange={e => updateDay(dayIdx, 'title', e.target.value)} placeholder="Ex: Arrivée à Tokyo & Shinjuku" required /></div>
              <div className="form-group"><label>Description</label>
                <textarea value={day.description || ''} onChange={e => updateDay(dayIdx, 'description', e.target.value)} rows={2} placeholder="Description de la journée..." /></div>
              <div className="form-group"><label>Conseils du jour (un par ligne)</label>
                <textarea value={day.tips.join('\n')} onChange={e => updateDayTips(dayIdx, e.target.value)} rows={3} placeholder="Conseil 1&#10;Conseil 2&#10;..." /></div>

              <div className="activities-section">
                <div className="activities-header">
                  <label>Activités</label>
                  <button type="button" onClick={() => addActivity(dayIdx)} className="add-activity-btn"><Plus size={14} />Ajouter</button>
                </div>
                {day.activities.map((act, actIdx) => (
                  <div key={actIdx} className="activity-form-row">
                    <input type="text" value={act.time || ''} onChange={e => updateActivity(dayIdx, actIdx, 'time', e.target.value)} placeholder="09:00" style={{ width: '80px', flexShrink: 0 }} />
                    <input type="text" value={act.title} onChange={e => updateActivity(dayIdx, actIdx, 'title', e.target.value)} placeholder="Titre de l'activité" required />
                    <input type="text" value={act.description || ''} onChange={e => updateActivity(dayIdx, actIdx, 'description', e.target.value)} placeholder="Description" />
                    <select value={act.place_id || ''} onChange={e => updateActivity(dayIdx, actIdx, 'place_id', e.target.value || null)}>
                      <option value="">— Lieu lié —</option>
                      {places.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                    <button type="button" onClick={() => removeActivity(dayIdx, actIdx)} className="action-btn delete"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="button" onClick={addDay} className="btn-secondary add-day-btn"><Plus size={16} />Ajouter un jour</button>

          {/* Infos pratiques */}
          <h3 className="form-section-title"><Info size={16} />Informations pratiques</h3>
          <div className="form-grid">
            <div className="form-group"><label>Budget min (€/pers/jour)</label>
              <input type="number" min="0" value={guideFormData.practical_info.budget_min || ''} onChange={e => setGuideFormData(p => ({ ...p, practical_info: { ...p.practical_info, budget_min: e.target.value ? parseInt(e.target.value) : null } }))} placeholder="Ex: 50" /></div>
            <div className="form-group"><label>Budget max (€/pers/jour)</label>
              <input type="number" min="0" value={guideFormData.practical_info.budget_max || ''} onChange={e => setGuideFormData(p => ({ ...p, practical_info: { ...p.practical_info, budget_max: e.target.value ? parseInt(e.target.value) : null } }))} placeholder="Ex: 100" /></div>
            <div className="form-group full-width"><label>Meilleures saisons</label>
              <div className="tags-checkboxes">
                {SEASONS.map(s => (
                  <label key={s} className={`tag-checkbox ${guideFormData.practical_info.best_seasons.includes(s) ? 'checked' : ''}`}>
                    <input type="checkbox" checked={guideFormData.practical_info.best_seasons.includes(s)} onChange={() => toggleSeason(s)} />{s}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group full-width"><label>Transports</label>
              <textarea value={guideFormData.practical_info.transport_tips || ''} onChange={e => setGuideFormData(p => ({ ...p, practical_info: { ...p.practical_info, transport_tips: e.target.value } }))} rows={2} placeholder="Conseils transports..." /></div>
            <div className="form-group full-width"><label>Visa & formalités</label>
              <textarea value={guideFormData.practical_info.visa_info || ''} onChange={e => setGuideFormData(p => ({ ...p, practical_info: { ...p.practical_info, visa_info: e.target.value } }))} rows={2} placeholder="Infos visa..." /></div>
            <div className="form-group"><label>Monnaie</label>
              <input type="text" value={guideFormData.practical_info.currency || ''} onChange={e => setGuideFormData(p => ({ ...p, practical_info: { ...p.practical_info, currency: e.target.value } }))} placeholder="Ex: Yen (JPY)" /></div>
            <div className="form-group"><label>Langue</label>
              <input type="text" value={guideFormData.practical_info.language_tips || ''} onChange={e => setGuideFormData(p => ({ ...p, practical_info: { ...p.practical_info, language_tips: e.target.value } }))} placeholder="Ex: Japonais — quelques mots utiles..." /></div>
          </div>

          {/* Photos supplémentaires */}
          <h3 className="form-section-title"><ZoomIn size={16} />Photos du guide</h3>
          <div className="form-group full-width">
            <div className="photo-upload-area">
              <input type="file" accept="image/*" multiple onChange={e => handleImageUpload(e, 'photos')} id="guide-photos-upload" className="hidden" />
              <label htmlFor="guide-photos-upload" className="upload-btn"><Upload size={20} />Ajouter des photos</label>
              <div className="uploaded-photos">
                {guideFormData.photos.map((photo, idx) => (
                  <div key={idx} className="uploaded-photo">
                    <img src={photo} alt="" />
                    <button type="button" onClick={() => setGuideFormData(p => ({ ...p, photos: p.photos.filter((_, i) => i !== idx) }))} className="remove-photo"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">Annuler</button>
            <button type="submit" className="btn-primary" disabled={loading}><Save size={18} />{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// ADMIN PAGE
// ============================================================
const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [places, setPlaces] = useState([]);
  const [editingPlace, setEditingPlace] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewingPlace, setViewingPlace] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [formData, setFormData] = useState({
    title: '', address: '', description: '', category: 'accommodation',
    rating: 3, latitude: 48.8566, longitude: 2.3522, photos: [],
  });
  const [adminTab, setAdminTab] = useState('places');
  const [guides, setGuides] = useState([]);
  const [editingGuide, setEditingGuide] = useState(null);
  const [showGuideForm, setShowGuideForm] = useState(false);
  const [guideFormData, setGuideFormData] = useState({ ...EMPTY_GUIDE });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) verifyToken(token);
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setIsAuthenticated(true); fetchPlaces(token); fetchGuides(token); }
      else localStorage.removeItem('admin_token');
    } catch { localStorage.removeItem('admin_token'); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (res.ok) { localStorage.setItem('admin_token', data.token); setIsAuthenticated(true); fetchPlaces(data.token); fetchGuides(data.token); toast.success('Connexion réussie !'); }
      else toast.error(data.detail || 'Mot de passe incorrect');
    } catch { toast.error('Erreur de connexion'); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { localStorage.removeItem('admin_token'); setIsAuthenticated(false); setPlaces([]); setGuides([]); toast.success('Déconnexion réussie'); };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (passwordForm.newPassword.length < 6) { toast.error('Au moins 6 caractères requis'); return; }
    const token = localStorage.getItem('admin_token'); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: passwordForm.currentPassword, new_password: passwordForm.newPassword }),
      });
      const data = await res.json();
      if (res.ok) { toast.success('Mot de passe modifié !'); setShowPasswordModal(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
      else toast.error(data.detail || 'Erreur');
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const fetchPlaces = async () => {
    try { const res = await fetch(`${API_URL}/api/places`); setPlaces(await res.json()); }
    catch { toast.error('Erreur lors du chargement'); }
  };

  const fetchGuides = async (token) => {
    const t = token || localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${API_URL}/api/guides/all`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { const data = await res.json(); setGuides(Array.isArray(data) ? data : []); }
    } catch { toast.error('Erreur lors du chargement des guides'); }
  };

  const handleGuideSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token'); setLoading(true);
    try {
      const url = editingGuide ? `${API_URL}/api/guides/${editingGuide.id}` : `${API_URL}/api/guides`;
      const method = editingGuide ? 'PUT' : 'POST';
      const payload = {
        ...guideFormData,
        practical_info: {
          ...guideFormData.practical_info,
          budget_min: guideFormData.practical_info.budget_min ? parseInt(guideFormData.practical_info.budget_min) : null,
          budget_max: guideFormData.practical_info.budget_max ? parseInt(guideFormData.practical_info.budget_max) : null,
        }
      };
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) { toast.success(editingGuide ? 'Guide modifié !' : 'Guide créé !'); resetGuideForm(); fetchGuides(token); }
      else { const err = await res.json(); toast.error(err.detail || 'Erreur'); }
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  const handleDeleteGuide = async (guideId) => {
    if (!window.confirm('Supprimer ce guide ?')) return;
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${API_URL}/api/guides/${guideId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Guide supprimé'); fetchGuides(token); }
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const resetGuideForm = () => { setEditingGuide(null); setShowGuideForm(false); setGuideFormData({ ...EMPTY_GUIDE }); };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const token = localStorage.getItem('admin_token');
    for (const file of files) {
      const fd = new FormData(); fd.append('file', file);
      try {
        const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const data = await res.json();
        if (res.ok) { setFormData(prev => ({ ...prev, photos: [...prev.photos, data.url] })); toast.success('Image uploadée'); }
      } catch { toast.error('Erreur upload image'); }
    }
  };

  const removePhoto = (index) => setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token'); setLoading(true);
    try {
      const url = editingPlace ? `${API_URL}/api/places/${editingPlace.id}` : `${API_URL}/api/places`;
      const res = await fetch(url, { method: editingPlace ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(formData) });
      if (res.ok) { toast.success(editingPlace ? 'Lieu modifié !' : 'Lieu créé !'); resetForm(); fetchPlaces(token); }
      else { const error = await res.json(); toast.error(error.detail || 'Erreur'); }
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  const handleEdit = (place) => {
    setEditingPlace(place);
    setFormData({ title: place.title, address: place.address, description: place.description, category: place.category, rating: place.rating, latitude: place.latitude, longitude: place.longitude, photos: place.photos || [] });
    setShowForm(true);
  };

  const handleDelete = async (placeId) => {
    if (!window.confirm('Supprimer ce lieu ?')) return;
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${API_URL}/api/places/${placeId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success('Lieu supprimé'); fetchPlaces(token); }
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const resetForm = () => {
    setEditingPlace(null); setShowForm(false);
    setFormData({ title: '', address: '', description: '', category: 'accommodation', rating: 3, latitude: 48.8566, longitude: 2.3522, photos: [] });
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-page">
        <motion.div className="login-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/" className="login-logo"><img src="https://customer-assets.emergentagent.com/job_trip-spots-1/artifacts/w33bidjg_682F1216-435E-40FA-84C2-279EE5063CDF.PNG" alt="Logo" /></Link>
          <h2>Administration</h2>
          <form onSubmit={handleLogin} data-testid="login-form">
            <Link to="/" className="back-to-home-btn" data-testid="back-home-btn"><ChevronLeft size={18} />Retour à l'accueil</Link>
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Entrez le mot de passe" data-testid="password-input" />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} data-testid="login-btn">{loading ? 'Connexion...' : 'Se connecter'}</button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="admin-logo"><img src="https://customer-assets.emergentagent.com/job_trip-spots-1/artifacts/w33bidjg_682F1216-435E-40FA-84C2-279EE5063CDF.PNG" alt="Logo" /></Link>
        <h1>Administration</h1>
        <div className="admin-header-actions">
          <button onClick={() => setShowPasswordModal(true)} className="password-btn" data-testid="change-password-btn"><Key size={20} />Mot de passe</button>
          <button onClick={handleLogout} className="logout-btn" data-testid="logout-btn"><LogOut size={20} />Déconnexion</button>
        </div>
      </header>

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPasswordModal(false)}>
            <motion.div className="password-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
              <div className="form-header">
                <h2>Changer le mot de passe</h2>
                <button onClick={() => setShowPasswordModal(false)} className="close-btn"><X size={24} /></button>
              </div>
              <form onSubmit={handleChangePassword} className="password-form" data-testid="password-change-form">
                <div className="form-group"><label>Mot de passe actuel</label><input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required data-testid="current-password-input" /></div>
                <div className="form-group"><label>Nouveau mot de passe</label><input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={6} data-testid="new-password-input" /></div>
                <div className="form-group"><label>Confirmer le nouveau mot de passe</label><input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required minLength={6} data-testid="confirm-password-input" /></div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="btn-secondary">Annuler</button>
                  <button type="submit" className="btn-primary" disabled={loading}><Key size={18} />{loading ? 'Modification...' : 'Modifier'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin tabs */}
      <div className="admin-tabs">
        <button className={`admin-tab-btn ${adminTab === 'places' ? 'active' : ''}`} onClick={() => setAdminTab('places')}>
          <MapPin size={16} />Lieux
        </button>
        <button className={`admin-tab-btn ${adminTab === 'guides' ? 'active' : ''}`} onClick={() => setAdminTab('guides')}>
          <BookOpen size={16} />Guides de voyage
        </button>
      </div>

      <div className="admin-content">
        {/* ONGLET LIEUX */}
        {adminTab === 'places' && <>
          <div className="admin-toolbar">
            <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }} data-testid="add-place-btn"><Plus size={20} />Ajouter un lieu</button>
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div className="form-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <motion.div className="form-modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
                  <div className="form-header">
                    <h2>{editingPlace ? 'Modifier le lieu' : 'Nouveau lieu'}</h2>
                    <button onClick={resetForm} className="close-btn" data-testid="close-form-btn"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleSubmit} className="place-form" data-testid="place-form">
                    <div className="form-grid">
                      <div className="form-group"><label>Titre</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required data-testid="title-input" /></div>
                      <div className="form-group"><label>Catégorie</label>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} data-testid="category-select">
                          {CATEGORIES.filter(c => c.id !== 'all').map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group full-width"><label>Adresse</label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} required data-testid="address-input" /></div>
                      <div className="form-group full-width"><label>Description</label>
                        <div className="quill-wrapper" data-testid="description-input">
                          <ReactQuill theme="snow" value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} modules={quillModules} formats={quillFormats} placeholder="Décrivez ce lieu..." />
                        </div>
                      </div>
                      <div className="form-group"><label>Latitude</label><input type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })} required data-testid="latitude-input" /></div>
                      <div className="form-group"><label>Longitude</label><input type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })} required data-testid="longitude-input" /></div>
                      <div className="form-group full-width"><label>Note</label><StarRating rating={formData.rating} onChange={(rating) => setFormData({ ...formData, rating })} readonly={false} /></div>
                      <div className="form-group full-width"><label>Photos</label>
                        <div className="photo-upload-area">
                          <input type="file" accept="image/*" multiple onChange={handleImageUpload} id="photo-upload" className="hidden" data-testid="photo-upload-input" />
                          <label htmlFor="photo-upload" className="upload-btn"><Upload size={20} />Ajouter des photos</label>
                          <div className="uploaded-photos">
                            {formData.photos.map((photo, idx) => (
                              <div key={idx} className="uploaded-photo">
                                <img src={getPhotoSrc(photo)} alt="" />
                                <button type="button" onClick={() => removePhoto(idx)} className="remove-photo"><X size={14} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="button" onClick={resetForm} className="btn-secondary" data-testid="cancel-btn">Annuler</button>
                      <button type="submit" className="btn-primary" disabled={loading} data-testid="save-btn"><Save size={18} />{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="admin-places-list" data-testid="admin-places-list">
            {places.length === 0 ? (
              <div className="empty-admin"><MapPin size={48} /><h3>Aucun lieu</h3><p>Commencez par ajouter votre premier lieu</p></div>
            ) : places.map((place) => {
              const cat = CATEGORIES.find(c => c.id === place.category);
              const CatIcon = cat?.icon || MapPin;
              return (
                <motion.div key={place.id} className="admin-place-item" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={`admin-place-${place.id}`}>
                  <div className="admin-place-image">
                    {place.photos?.[0] ? <img src={getPhotoSrc(place.photos[0])} alt="" /> : <CatIcon size={32} />}
                  </div>
                  <div className="admin-place-info">
                    <h3>{place.title}</h3><p>{place.address}</p>
                    <div className="admin-place-meta">
                      <span className="cat-badge" style={{ background: cat?.color }}><CatIcon size={12} color="#1A1A1A" />{cat?.name}</span>
                      <StarRating rating={place.rating} readonly />
                    </div>
                  </div>
                  <div className="admin-place-actions">
                    <button onClick={() => setViewingPlace(place)} className="action-btn" data-testid={`view-${place.id}`}><Eye size={18} /></button>
                    <button onClick={() => handleEdit(place)} className="action-btn" data-testid={`edit-${place.id}`}><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(place.id)} className="action-btn delete" data-testid={`delete-${place.id}`}><Trash2 size={18} /></button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <AnimatePresence>
            {viewingPlace && <PlaceDetailModal place={viewingPlace} onClose={() => setViewingPlace(null)} />}
          </AnimatePresence>
        </>}

        {/* ONGLET GUIDES */}
        {adminTab === 'guides' && <>
          <div className="admin-toolbar">
            <button className="btn-primary" onClick={() => { resetGuideForm(); setShowGuideForm(true); }}><Plus size={20} />Nouveau guide</button>
          </div>

          <AnimatePresence>
            {showGuideForm && (
              <AdminGuideForm
                show={showGuideForm}
                guideFormData={guideFormData}
                setGuideFormData={setGuideFormData}
                editingGuide={editingGuide}
                onSubmit={handleGuideSubmit}
                onClose={resetGuideForm}
                loading={loading}
                places={places}
              />
            )}
          </AnimatePresence>

          <div className="admin-places-list">
            {guides.length === 0 ? (
              <div className="empty-admin"><BookOpen size={48} /><h3>Aucun guide</h3><p>Créez votre premier guide de voyage</p></div>
            ) : guides.map((guide) => (
              <motion.div key={guide.id} className="admin-place-item" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="admin-place-image">
                  {guide.cover_image ? <img src={guide.cover_image} alt="" /> : <BookOpen size={32} />}
                </div>
                <div className="admin-place-info">
                  <h3>{guide.title}</h3>
                  <p>{guide.destination}, {guide.country} — {guide.duration_days} jour{guide.duration_days > 1 ? 's' : ''}</p>
                  <div className="admin-place-meta">
                    <span className="cat-badge" style={{ background: guide.published ? '#5cb85c' : '#6c6c6c', color: '#fff' }}>
                      {guide.published ? 'Publié' : 'Brouillon'}
                    </span>
                    {guide.tags.slice(0, 2).map(tag => <span key={tag} className="guide-tag-pill">{tag}</span>)}
                  </div>
                </div>
                <div className="admin-place-actions">
                  <button onClick={() => { setEditingGuide(guide); setGuideFormData({ ...guide }); setShowGuideForm(true); }} className="action-btn"><Edit3 size={18} /></button>
                  <button onClick={() => handleDeleteGuide(guide.id)} className="action-btn delete"><Trash2 size={18} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        </>}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors theme="dark" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/place/:id" element={<PlaceDetailPage />} />
        <Route path="/guides" element={<GuidesPage />} />
        <Route path="/guides/:id" element={<GuideDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
