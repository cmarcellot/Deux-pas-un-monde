import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Map, List, Home, Settings, Star, MapPin, X, Plus, Trash2, Edit3, 
  LogOut, Upload, Camera, ChevronLeft, Menu, Filter, Bed, Utensils, 
  Compass, Gem, Eye, Save
} from 'lucide-react';
import './App.css';

const API_URL = '';

const CATEGORIES = [
  { id: 'all', name: 'Tous', icon: Filter, color: '#E8E0D5' },
  { id: 'accommodation', name: 'Hébergements', icon: Bed, color: '#C66B3D' },
  { id: 'restaurant', name: 'Restaurants', icon: Utensils, color: '#E8E0D5' },
  { id: 'activity', name: 'Activités', icon: Compass, color: '#4CAF50' },
  { id: 'gem', name: 'Bonnes adresses', icon: Gem, color: '#A0A0A0' },
];

const createMarkerIcon = (category) => {
  const colors = {
    accommodation: '#C66B3D',
    restaurant: '#E8E0D5',
    activity: '#4CAF50',
    gem: '#A0A0A0',
  };
  const color = colors[category] || '#C66B3D';
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      background: ${color};
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid #1A1A1A;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const StarRating = ({ rating, onChange, readonly = true }) => {
  return (
    <div className="star-rating" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          className={`star-btn ${readonly ? 'readonly' : ''}`}
          data-testid={`star-${star}`}
        >
          <Star
            size={20}
            fill={star <= rating ? '#C66B3D' : 'transparent'}
            color={star <= rating ? '#C66B3D' : '#666666'}
          />
        </button>
      ))}
    </div>
  );
};

const PlaceCard = ({ place, onClick }) => {
  const category = CATEGORIES.find(c => c.id === place.category);
  const CategoryIcon = category?.icon || MapPin;
  
  return (
    <motion.div
      className="place-card"
      whileHover={{ y: -4 }}
      onClick={onClick}
      data-testid={`place-card-${place.id}`}
    >
      <div className="place-card-image">
        {place.photos?.[0] ? (
          <img 
            src={place.photos[0].startsWith('/api') ? `${API_URL}${place.photos[0]}` : place.photos[0]} 
            alt={place.title}
          />
        ) : (
          <div className="place-card-placeholder">
            <CategoryIcon size={48} />
          </div>
        )}
        <div className="place-card-category" style={{ background: category?.color }}>
          <CategoryIcon size={14} color="#1A1A1A" />
        </div>
      </div>
      <div className="place-card-content">
        <h3>{place.title}</h3>
        <p className="place-card-address">
          <MapPin size={14} />
          {place.address}
        </p>
        <StarRating rating={place.rating} readonly />
      </div>
    </motion.div>
  );
};

const CategoryFilter = ({ activeCategory, onChange }) => {
  return (
    <div className="category-filter" data-testid="category-filter">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        return (
          <button
            key={cat.id}
            className={`category-pill ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => onChange(cat.id)}
            data-testid={`category-${cat.id}`}
          >
            <Icon size={16} />
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};

const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

const PlaceDetailModal = ({ place, onClose }) => {
  const [currentImage, setCurrentImage] = useState(0);
  
  if (!place) return null;
  
  const category = CATEGORIES.find(c => c.id === place.category);
  const CategoryIcon = category?.icon || MapPin;

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="place-detail-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        data-testid="place-detail-modal"
      >
        <button className="modal-close-btn" onClick={onClose} data-testid="close-modal-btn">
          <X size={24} />
        </button>

        <div className="modal-gallery">
          {place.photos?.length > 0 ? (
            <>
              <div className="modal-main-image">
                <img
                  src={place.photos[currentImage].startsWith('/api') 
                    ? `${API_URL}${place.photos[currentImage]}` 
                    : place.photos[currentImage]}
                  alt={place.title}
                />
              </div>
              {place.photos.length > 1 && (
                <div className="modal-thumbnails">
                  {place.photos.map((photo, idx) => (
                    <button
                      key={idx}
                      className={`modal-thumb ${idx === currentImage ? 'active' : ''}`}
                      onClick={() => setCurrentImage(idx)}
                    >
                      <img
                        src={photo.startsWith('/api') ? `${API_URL}${photo}` : photo}
                        alt={`${place.title} ${idx + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="modal-no-image">
              <CategoryIcon size={64} />
            </div>
          )}
        </div>

        <div className="modal-content">
          <div className="modal-header">
            <h2>{place.title}</h2>
            <div className="modal-meta">
              <div className="category-badge" style={{ background: category?.color }}>
                <CategoryIcon size={14} color="#414441" />
                <span>{category?.name}</span>
              </div>
              <StarRating rating={place.rating} readonly />
            </div>
          </div>

          <div className="modal-address">
            <MapPin size={18} />
            <span>{place.address}</span>
          </div>

          <p className="modal-description">{place.description}</p>

          <div className="modal-map">
            <MapContainer
              center={[place.latitude, place.longitude]}
              zoom={14}
              style={{ height: '200px', width: '100%', borderRadius: '12px' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap'
              />
              <Marker
                position={[place.latitude, place.longitude]}
                icon={createMarkerIcon(place.category)}
              />
            </MapContainer>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [viewMode, setViewMode] = useState('list');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenter, setMapCenter] = useState([46.603354, 1.888334]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaces();
  }, [activeCategory]);

  const fetchPlaces = async () => {
    try {
      const url = activeCategory === 'all' 
        ? `${API_URL}/api/places` 
        : `${API_URL}/api/places?category=${activeCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setPlaces(data);
      if (data.length > 0) {
        setMapCenter([data[0].latitude, data[0].longitude]);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des lieux');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      <header className="header" data-testid="header">
        <Link to="/" className="logo">
          <img src="https://customer-assets.emergentagent.com/job_trip-spots-1/artifacts/w33bidjg_682F1216-435E-40FA-84C2-279EE5063CDF.PNG" alt="Deux pas un monde" />
        </Link>
        <nav className="header-nav">
          <button
            className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            data-testid="view-list-btn"
          >
            <List size={20} />
          </button>
          <button
            className={`view-toggle ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
            data-testid="view-map-btn"
          >
            <Map size={20} />
          </button>
          <Link to="/admin" className="admin-link" data-testid="admin-link">
            <Settings size={20} />
          </Link>
        </nav>
      </header>

      <div className="hero-section">
        <h1>Découvrez nos bonnes adresses</h1>
        <p>Les lieux que nous avons aimé, partagés avec vous</p>
      </div>

      <CategoryFilter activeCategory={activeCategory} onChange={setActiveCategory} />

      <div className={`content-wrapper ${viewMode}`}>
        {viewMode === 'list' ? (
          <div className="places-grid" data-testid="places-grid">
            {loading ? (
              <div className="loading">Chargement...</div>
            ) : places.length === 0 ? (
              <div className="empty-state" data-testid="empty-state">
                <MapPin size={48} />
                <h3>Aucun lieu pour le moment</h3>
                <p>Les bonnes adresses arrivent bientôt !</p>
              </div>
            ) : (
              places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  onClick={() => setSelectedPlace(place)}
                />
              ))
            )}
          </div>
        ) : (
          <div className="map-wrapper" data-testid="map-wrapper">
            <MapContainer
              center={mapCenter}
              zoom={6}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapRecenter center={mapCenter} />
              {places.map((place) => (
                <Marker
                  key={place.id}
                  position={[place.latitude, place.longitude]}
                  icon={createMarkerIcon(place.category)}
                  eventHandlers={{
                    click: () => setSelectedPlace(place),
                  }}
                >
                  <Popup>
                    <div className="map-popup" onClick={() => setSelectedPlace(place)}>
                      <h4>{place.title}</h4>
                      <p>{place.address}</p>
                      <StarRating rating={place.rating} readonly />
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>

      <footer className="footer">
        <p>Deux pas un monde © 2024 - Suivez-nous sur 
          <a href="https://instagram.com/deuxpasunmonde" target="_blank" rel="noopener noreferrer"> Instagram</a>
        </p>
      </footer>

      <AnimatePresence>
        {selectedPlace && (
          <PlaceDetailModal
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PlaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [place, setPlace] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlace();
  }, [id]);

  const fetchPlace = async () => {
    try {
      const res = await fetch(`${API_URL}/api/places/${id}`);
      if (!res.ok) throw new Error('Lieu non trouvé');
      const data = await res.json();
      setPlace(data);
    } catch (error) {
      toast.error('Lieu non trouvé');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !place) {
    return <div className="loading-page">Chargement...</div>;
  }

  const category = CATEGORIES.find(c => c.id === place.category);
  const CategoryIcon = category?.icon || MapPin;

  return (
    <motion.div
      className="place-detail-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="detail-header">
        <button onClick={() => navigate(-1)} className="back-btn" data-testid="back-btn">
          <ChevronLeft size={24} />
        </button>
        <h2>{place.title}</h2>
      </header>

      <div className="detail-gallery" data-testid="detail-gallery">
        {place.photos?.length > 0 ? (
          <>
            <div className="main-image">
              <img
                src={place.photos[currentImage].startsWith('/api') 
                  ? `${API_URL}${place.photos[currentImage]}` 
                  : place.photos[currentImage]}
                alt={place.title}
              />
            </div>
            {place.photos.length > 1 && (
              <div className="thumbnail-strip">
                {place.photos.map((photo, idx) => (
                  <button
                    key={idx}
                    className={`thumbnail ${idx === currentImage ? 'active' : ''}`}
                    onClick={() => setCurrentImage(idx)}
                  >
                    <img
                      src={photo.startsWith('/api') ? `${API_URL}${photo}` : photo}
                      alt={`${place.title} ${idx + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="no-image">
            <CategoryIcon size={64} />
          </div>
        )}
      </div>

      <div className="detail-content">
        <div className="detail-meta">
          <div className="category-badge" style={{ background: category?.color }}>
            <CategoryIcon size={16} color="#1A1A1A" />
            <span>{category?.name}</span>
          </div>
          <StarRating rating={place.rating} readonly />
        </div>

        <div className="detail-address">
          <MapPin size={18} />
          <span>{place.address}</span>
        </div>

        <p className="detail-description">{place.description}</p>

        <div className="detail-map" data-testid="detail-map">
          <MapContainer
            center={[place.latitude, place.longitude]}
            zoom={14}
            style={{ height: '250px', width: '100%', borderRadius: '12px' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Marker
              position={[place.latitude, place.longitude]}
              icon={createMarkerIcon(place.category)}
            />
          </MapContainer>
        </div>
      </div>

      <Link to="/" className="floating-home" data-testid="floating-home">
        <Home size={24} />
      </Link>
    </motion.div>
  );
};

const AdminPage = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [places, setPlaces] = useState([]);
  const [editingPlace, setEditingPlace] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewingPlace, setViewingPlace] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    address: '',
    description: '',
    category: 'accommodation',
    rating: 3,
    latitude: 48.8566,
    longitude: 2.3522,
    photos: [],
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      verifyToken(token);
    }
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsAuthenticated(true);
        fetchPlaces(token);
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch (error) {
      localStorage.removeItem('admin_token');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('admin_token', data.token);
        setIsAuthenticated(true);
        fetchPlaces(data.token);
        toast.success('Connexion réussie !');
      } else {
        toast.error(data.detail || 'Mot de passe incorrect');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setPlaces([]);
    toast.success('Déconnexion réussie');
  };

  const fetchPlaces = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/places`);
      const data = await res.json();
      setPlaces(data);
    } catch (error) {
      toast.error('Erreur lors du chargement');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const token = localStorage.getItem('admin_token');
    
    for (const file of files) {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      
      try {
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataUpload,
        });
        const data = await res.json();
        if (res.ok) {
          setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, data.url],
          }));
          toast.success('Image uploadée');
        }
      } catch (error) {
        toast.error('Erreur upload image');
      }
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    setLoading(true);

    try {
      const url = editingPlace
        ? `${API_URL}/api/places/${editingPlace.id}`
        : `${API_URL}/api/places`;
      const method = editingPlace ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingPlace ? 'Lieu modifié !' : 'Lieu créé !');
        resetForm();
        fetchPlaces(token);
      } else {
        const error = await res.json();
        toast.error(error.detail || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (place) => {
    setEditingPlace(place);
    setFormData({
      title: place.title,
      address: place.address,
      description: place.description,
      category: place.category,
      rating: place.rating,
      latitude: place.latitude,
      longitude: place.longitude,
      photos: place.photos || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (placeId) => {
    if (!window.confirm('Supprimer ce lieu ?')) return;
    
    const token = localStorage.getItem('admin_token');
    try {
      const res = await fetch(`${API_URL}/api/places/${placeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Lieu supprimé');
        fetchPlaces(token);
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setEditingPlace(null);
    setShowForm(false);
    setFormData({
      title: '',
      address: '',
      description: '',
      category: 'accommodation',
      rating: 3,
      latitude: 48.8566,
      longitude: 2.3522,
      photos: [],
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-page">
        <motion.div
          className="login-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link to="/" className="login-logo">
            <img src="https://customer-assets.emergentagent.com/job_trip-spots-1/artifacts/w33bidjg_682F1216-435E-40FA-84C2-279EE5063CDF.PNG" alt="Logo" />
          </Link>
          <h2>Administration</h2>
          <form onSubmit={handleLogin} data-testid="login-form">
            <Link to="/" className="back-to-home-btn" data-testid="back-home-btn">
              <ChevronLeft size={18} />
              Retour à l'accueil
            </Link>
            <div className="form-group">
              <label>Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                data-testid="password-input"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={loading} data-testid="login-btn">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="admin-logo">
          <img src="https://customer-assets.emergentagent.com/job_trip-spots-1/artifacts/w33bidjg_682F1216-435E-40FA-84C2-279EE5063CDF.PNG" alt="Logo" />
        </Link>
        <h1>Administration</h1>
        <button onClick={handleLogout} className="logout-btn" data-testid="logout-btn">
          <LogOut size={20} />
          Déconnexion
        </button>
      </header>

      <div className="admin-content">
        <div className="admin-toolbar">
          <button
            className="btn-primary"
            onClick={() => { resetForm(); setShowForm(true); }}
            data-testid="add-place-btn"
          >
            <Plus size={20} />
            Ajouter un lieu
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              className="form-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="form-modal"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                <div className="form-header">
                  <h2>{editingPlace ? 'Modifier le lieu' : 'Nouveau lieu'}</h2>
                  <button onClick={resetForm} className="close-btn" data-testid="close-form-btn">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="place-form" data-testid="place-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Titre</label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        data-testid="title-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Catégorie</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        data-testid="category-select"
                      >
                        {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group full-width">
                      <label>Adresse</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                        data-testid="address-input"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        required
                        data-testid="description-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                        required
                        data-testid="latitude-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                        required
                        data-testid="longitude-input"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Note</label>
                      <StarRating
                        rating={formData.rating}
                        onChange={(rating) => setFormData({ ...formData, rating })}
                        readonly={false}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Photos</label>
                      <div className="photo-upload-area">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          id="photo-upload"
                          className="hidden"
                          data-testid="photo-upload-input"
                        />
                        <label htmlFor="photo-upload" className="upload-btn">
                          <Upload size={20} />
                          Ajouter des photos
                        </label>
                        <div className="uploaded-photos">
                          {formData.photos.map((photo, idx) => (
                            <div key={idx} className="uploaded-photo">
                              <img src={photo.startsWith('/api') ? `${API_URL}${photo}` : photo} alt="" />
                              <button
                                type="button"
                                onClick={() => removePhoto(idx)}
                                className="remove-photo"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" onClick={resetForm} className="btn-secondary" data-testid="cancel-btn">
                      Annuler
                    </button>
                    <button type="submit" className="btn-primary" disabled={loading} data-testid="save-btn">
                      <Save size={18} />
                      {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="admin-places-list" data-testid="admin-places-list">
          {places.length === 0 ? (
            <div className="empty-admin">
              <MapPin size={48} />
              <h3>Aucun lieu</h3>
              <p>Commencez par ajouter votre premier lieu</p>
            </div>
          ) : (
            places.map((place) => {
              const cat = CATEGORIES.find(c => c.id === place.category);
              const CatIcon = cat?.icon || MapPin;
              return (
                <motion.div
                  key={place.id}
                  className="admin-place-item"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  data-testid={`admin-place-${place.id}`}
                >
                  <div className="admin-place-image">
                    {place.photos?.[0] ? (
                      <img src={place.photos[0].startsWith('/api') ? `${API_URL}${place.photos[0]}` : place.photos[0]} alt="" />
                    ) : (
                      <CatIcon size={32} />
                    )}
                  </div>
                  <div className="admin-place-info">
                    <h3>{place.title}</h3>
                    <p>{place.address}</p>
                    <div className="admin-place-meta">
                      <span className="cat-badge" style={{ background: cat?.color }}>
                        <CatIcon size={12} color="#1A1A1A" />
                        {cat?.name}
                      </span>
                      <StarRating rating={place.rating} readonly />
                    </div>
                  </div>
                  <div className="admin-place-actions">
                    <button onClick={() => setViewingPlace(place)} className="action-btn" data-testid={`view-${place.id}`}>
                      <Eye size={18} />
                    </button>
                    <button onClick={() => handleEdit(place)} className="action-btn" data-testid={`edit-${place.id}`}>
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(place.id)} className="action-btn delete" data-testid={`delete-${place.id}`}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <AnimatePresence>
          {viewingPlace && (
            <PlaceDetailModal
              place={viewingPlace}
              onClose={() => setViewingPlace(null)}
            />
          )}
        </AnimatePresence>
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
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
