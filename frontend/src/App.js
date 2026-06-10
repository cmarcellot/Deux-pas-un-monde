import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Home, Settings, Star, MapPin, X, Plus, Trash2, Edit3,
  LogOut, Upload, ChevronLeft, ChevronRight, Filter, Bed, Utensils,
  Compass, Gem, Eye, Save, Key, ZoomIn,
  BookOpen, Calendar, Globe, Wallet, Info, Plane,
  Search, CheckCircle, Loader2, GripVertical
} from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://deux-pas-un-monde.onrender.com';

// Activity types — couleurs, labels et icônes SVG (identiques au prototype)
const ACTIVITY_TYPES = {
  visite:    { label: 'Visite',    color: 'oklch(0.52 0.08 155)', bg: 'oklch(0.92 0.04 155)', path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
  repas:     { label: 'Repas',     color: 'oklch(0.58 0.09 35)',  bg: 'oklch(0.92 0.04 35)',  path: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z' },
  nuit:      { label: 'Nuit',      color: 'oklch(0.52 0.07 230)', bg: 'oklch(0.91 0.04 230)', path: 'M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z' },
  transport: { label: 'Transport', color: 'oklch(0.58 0.08 85)',  bg: 'oklch(0.92 0.04 85)',  path: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z' },
  conseil:   { label: 'Conseil',   color: 'oklch(0.50 0.07 300)', bg: 'oklch(0.92 0.04 300)', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z' },
  nature:    { label: 'Nature',    color: 'oklch(0.48 0.10 145)', bg: 'oklch(0.91 0.04 145)', path: 'M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20c4 0 4-2 8-2s4 2 8 2v-2c-4 0-4-2-8-2c-.43 0-.82.04-1.19.1C15.77 13.8 17.5 10.8 17 8z' },
  shopping:  { label: 'Shopping',  color: 'oklch(0.52 0.08 20)',  bg: 'oklch(0.92 0.04 20)',  path: 'M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3z' },
};

// Shared style for hero info pills
const heroPill = {
  fontFamily: 'Jost, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.88)',
  background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 14px',
  backdropFilter: 'blur(4px)',
};

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link'],
    ['clean']
  ],
};

const quillFormats = ['bold', 'italic', 'underline', 'list', 'bullet', 'link'];

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
  marker_color: '#c1845a', date: '',
};

// Map backend slugs to new design labels and category keys
const CATEGORIES = [
  { id: 'all',           key: 'all',        label: 'Tout',       icon: Filter },
  { id: 'accommodation', key: 'dormir',     label: 'Dormir',     icon: Bed },
  { id: 'restaurant',    key: 'manger',     label: 'Manger',     icon: Utensils },
  { id: 'activity',      key: 'decouvrir',  label: 'Découvrir',  icon: Compass },
  { id: 'gem',           key: 'partir',     label: 'Partir',     icon: Gem },
];

const getCatInfo = (categoryId) => CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];

// Formate "2025-03" → "Mars 2025"
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const formatMonthYear = (value) => {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  const m = parseInt(month, 10);
  return isNaN(m) ? value : `${MONTHS_FR[m - 1]} ${year}`;
};

// SVG icons for category badges (matching handoff)
const CAT_ICONS = {
  accommodation: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>`,
  restaurant:    `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>`,
  activity:      `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  gem:           `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
};

// Marker icons — inline SVG strings (14×14, white fill)
const MARKER_SVG_ICONS = {
  accommodation: `<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>`,
  restaurant:    `<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>`,
  activity:      `<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
  gem:           `<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
};

// Exact marker style from handoff: rotated square with rounded corner
const createMarkerIcon = (category) => {
  const colors = {
    accommodation: '#5B7A8A',
    restaurant:    '#8B6355',
    activity:      '#5A7A60',
    gem:           '#8A7845',
  };
  const color = colors[category] || '#888';
  const iconSvg = MARKER_SVG_ICONS[category] || MARKER_SVG_ICONS.activity;

  const html = `<div style="
    width:34px;height:34px;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    background:${color};
    border:2px solid #fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.25);
    display:flex;align-items:center;justify-content:center;
  "><div style="transform:rotate(45deg);width:14px;height:14px;display:flex;align-items:center;justify-content:center;">${iconSvg}</div></div>`;

  return L.divIcon({
    className: '',
    html,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -36],
  });
};

// Numbered circle marker for guide trip map (one per activity)
const ACTIVITY_MARKER_COLORS = {
  visite:    '#3d7a55',
  repas:     '#a05a35',
  nuit:      '#4a5e8a',
  transport: '#6d8030',
  conseil:   '#6a4a88',
  nature:    '#327848',
  shopping:  '#8a4030',
};
const createActivityMarkerIcon = (num, typeKey) => {
  const bg = ACTIVITY_MARKER_COLORS[typeKey] || '#8a7060';
  return L.divIcon({
    className: '',
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${bg};border:2.5px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.28);
      display:flex;align-items:center;justify-content:center;
      font-family:Jost,sans-serif;font-size:13px;font-weight:700;color:#fff;line-height:1;
    ">${num}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
};

const getPhotoSrc = (photo) => (photo.startsWith('/api') || photo.startsWith('/uploads')) ? `${API_URL}${photo}` : photo;

// ============================================================
// LOGO (4 SVG tiles)
// ============================================================
const DpmLogo = ({ light = false }) => {
  const fg = light ? '#3f4240' : '#ede8db';
  const bg = light ? '#ede8db' : '#3f4240';
  const size = 48;
  const gap = 3;
  const total = size * 4 + gap * 3;
  const tiles = [
    // plane
    { key: 'plane', d: 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z' },
    // camera
    { key: 'cam',   d: 'M12 15.2c-1.77 0-3.2-1.43-3.2-3.2s1.43-3.2 3.2-3.2 3.2 1.43 3.2 3.2-1.43 3.2-3.2 3.2zM9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z' },
    // pin
    { key: 'pin',   d: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z' },
    // fork
    { key: 'fork',  d: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z' },
  ];
  return (
    <div className={`dpm-logo${light ? ' light' : ''}`}>
      <svg width={total} height={size} viewBox={`0 0 ${total} ${size}`} fill="none">
        {tiles.map((t, i) => (
          <g key={t.key} transform={`translate(${i * (size + gap)}, 0)`}>
            <rect x={0} y={0} width={size} height={size} fill={fg}/>
            <g transform={`translate(${size*0.15},${size*0.15}) scale(${size*0.7/24})`} fill={bg}>
              <path d={t.d}/>
            </g>
          </g>
        ))}
      </svg>
      <div className="dpm-logo-wordmark">
        <span className="wm-top">DEUX PAS</span>
        <span className="wm-sub">UN MONDE</span>
      </div>
    </div>
  );
};

// Category badge (light theme)
const CategoryBadge = ({ categoryId, small = false }) => {
  const cat = getCatInfo(categoryId);
  const icon = CAT_ICONS[categoryId];
  if (!icon) return null;
  return (
    <span className={`cat-badge ${cat.key}${small ? ' small' : ''}`}>
      <span className="cat-badge-icon" dangerouslySetInnerHTML={{ __html: icon }}/>
      {cat.label}
    </span>
  );
};

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
              alt=""
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
const StarRating = ({ rating, onChange, readonly = true, size = 16 }) => (
  <div className="star-rating" data-testid="star-rating">
    {[1, 2, 3, 4, 5].map((star) => (
      <button key={star} type="button" onClick={() => !readonly && onChange?.(star)}
        className={`star-btn ${readonly ? 'readonly' : ''}`} data-testid={`star-${star}`}>
        <Star size={size} fill={star <= rating ? '#C4933A' : 'transparent'} color={star <= rating ? '#C4933A' : '#ccc'} />
      </button>
    ))}
  </div>
);

// ============================================================
// PHOTO PLACEHOLDER — gradient SVG with diagonal lines
// ============================================================
const PHOTO_COLORS = {
  accommodation: ['#5B7A8A', '#6E8E9E', '#89A5B3'],
  restaurant:    ['#8B6355', '#A07060', '#C4937E'],
  activity:      ['#5A7A60', '#6E9175', '#89A88D'],
  gem:           ['#8A7845', '#A08E56', '#BBA96E'],
};

const PhotoPlaceholder = ({ category, index = 0, height = 200, title = '' }) => {
  const colors = PHOTO_COLORS[category] || ['#888','#999','#aaa'];
  const c1 = colors[index % colors.length];
  const c2 = colors[(index + 1) % colors.length];
  const gradId = `grad-${category}-${index}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 400 ${height}`} preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1}/>
          <stop offset="100%" stopColor={c2}/>
        </linearGradient>
      </defs>
      <rect width="400" height={height} fill={`url(#${gradId})`}/>
      {Array.from({ length: 20 }).map((_, i) => (
        <line key={i} x1={i*25 - 100} y1={0} x2={i*25 + 100} y2={height}
          stroke="rgba(255,255,255,0.07)" strokeWidth="1.5"/>
      ))}
      {title && (
        <text x="200" y={height/2 + 6} textAnchor="middle" fill="rgba(255,255,255,0.35)"
          fontSize="12" fontFamily="Jost, sans-serif">{title}</text>
      )}
    </svg>
  );
};

// ============================================================
// PLACE CARD (light)
// ============================================================
const stripHtml = (html) => (html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

const PlaceCard = ({ place, onClick }) => (
  <div className="place-card" onClick={onClick} data-testid={`place-card-${place.id}`}>
    <div className="place-card-image">
      {place.photos?.[0]
        ? <img src={getPhotoSrc(place.photos[0])} alt={place.title} />
        : <PhotoPlaceholder category={place.category} index={place.id || 0} height={200} title={place.title} />
      }
      <div className="place-card-badge"><CategoryBadge categoryId={place.category} small /></div>
    </div>
    <div className="place-card-body">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <h3>{place.title}</h3>
        <StarRating rating={place.rating} readonly size={13} />
      </div>
      <p className="place-card-location">
        {place.city || place.address}{place.city && place.country ? `, ${place.country}` : ''}
      </p>
      <p className="place-card-desc">{stripHtml(place.description)}</p>
    </div>
  </div>
);

// ============================================================
// PLACE LIST ROW (light)
// ============================================================
const PlaceListRow = ({ place, onClick }) => (
  <div className="place-list-row" onClick={onClick} data-testid={`place-list-${place.id}`}>
    <div className="place-list-thumb">
      {place.photos?.[0]
        ? <img src={getPhotoSrc(place.photos[0])} alt={place.title} />
        : <PhotoPlaceholder category={place.category} index={place.id || 0} height={100} />
      }
    </div>
    <div className="place-list-body">
      <div className="place-list-meta-row">
        <CategoryBadge categoryId={place.category} small />
        <span className="place-list-date">{formatMonthYear(place.date)}</span>
      </div>
      <h3>{place.title}</h3>
      <p>{stripHtml(place.description)}</p>
    </div>
    <div className="place-list-right">
      <StarRating rating={place.rating} readonly size={13} />
      <span>{place.city || ''}{place.country ? `, ${place.country}` : ''}</span>
    </div>
  </div>
);

// ============================================================
// GUIDE CARD (light)
// ============================================================
const GuideListRow = ({ guide, onClick }) => (
  <div className="guide-list-row" onClick={onClick}>
    <div className="guide-list-thumb">
      {guide.cover_image
        ? <img src={guide.cover_image} alt={guide.title} />
        : <div className="guide-list-thumb-placeholder"><BookOpen size={24} /></div>}
    </div>
    <div className="guide-list-body">
      <div className="guide-list-meta">
        <Globe size={12} />
        <span>{guide.destination}{guide.country ? `, ${guide.country}` : ''}</span>
        <span className="guide-list-duration"><Calendar size={12} />{guide.duration_days} jour{guide.duration_days > 1 ? 's' : ''}</span>
      </div>
      <h3>{guide.title}</h3>
      <p>{stripHtml(guide.intro)}</p>
    </div>
  </div>
);

const GuideCard = ({ guide, onClick }) => (
  <div className="guide-card" onClick={onClick}>
    <div className="guide-card-image">
      {guide.cover_image
        ? <img src={guide.cover_image} alt={guide.title} />
        : <div className="guide-card-placeholder"><BookOpen size={48} /></div>}
      <div className="guide-card-duration"><Calendar size={13} />{guide.duration_days}j</div>
    </div>
    <div className="guide-card-body">
      <div className="guide-card-destination"><Globe size={13} />{guide.destination}, {guide.country}</div>
      <h3>{guide.title}</h3>
    </div>
  </div>
);


const MapRecenter = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
};

const FitBoundsToMarkers = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 1) { map.setView(positions[0], 14); return; }
    if (positions.length > 1) { map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] }); }
  }, [map, positions]);
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
              <div className="modal-no-image"><MapPin size={48} /></div>
            )}
          </div>

          <div className="modal-body">
            <h2 className="modal-title">{place.title}</h2>
            <div className="modal-meta">
              <CategoryBadge categoryId={place.category} />
              <StarRating rating={place.rating} readonly size={15} />
            </div>
            <div className="modal-address"><MapPin size={16} /><span>{place.address}</span></div>
            {place.date && <div className="modal-address"><Calendar size={16} /><span>{formatMonthYear(place.date)}</span></div>}
            <div className="modal-description" dangerouslySetInnerHTML={{ __html: place.description }} />
            <div className="modal-map">
              <MapContainer center={[place.latitude, place.longitude]} zoom={14}
                style={{ height: '200px', width: '100%', borderRadius: '12px' }} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
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
// SEARCH OVERLAY
// ============================================================
const CAT_COLORS = {
  accommodation: 'var(--cat-dormir)',
  restaurant:    'var(--cat-manger)',
  activity:      'var(--cat-decouvrir)',
  gem:           'var(--cat-partir)',
};

const Highlight = ({ text, query }) => {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
};

const SearchOverlay = ({ open, onClose, places, onSelectPlace }) => {
  const [query, setQuery]   = useState('');
  const [guides, setGuides] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) { setQuery(''); return; }
    setTimeout(() => inputRef.current?.focus(), 50);
    fetch(`${API_URL}/api/guides`)
      .then(r => r.json()).then(setGuides).catch(() => {});
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matchPlace = (p) => !q || [p.title, p.city, p.country, p.address].some(f => (f||'').toLowerCase().includes(q));
  const matchGuide = (g) => !q || [g.title, g.destination, g.country].some(f => (f||'').toLowerCase().includes(q));

  const filteredPlaces = places.filter(matchPlace);
  const filteredGuides = guides.filter(matchGuide);
  const total = filteredPlaces.length + filteredGuides.length;

  return (
    <div className="search-overlay-backdrop" onClick={onClose}>
      <div className="search-overlay-panel" onClick={e => e.stopPropagation()}>
        <div className="search-overlay-input-row">
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            className="search-overlay-input"
            placeholder="Rechercher adresses, guides, villes…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-overlay-clear" onClick={() => { setQuery(''); inputRef.current?.focus(); }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="search-overlay-results">
          {filteredPlaces.length > 0 && (
            <div className="search-section">
              <p className="search-section-label">Adresses · {filteredPlaces.length}</p>
              {filteredPlaces.map(place => {
                return (
                  <button key={place.id} className="search-result-row" onClick={() => { onSelectPlace(place); onClose(); }}>
                    <span className="search-result-thumb" style={{ background: CAT_COLORS[place.category] || '#888' }}>
                      {place.photos?.[0]
                        ? <img src={getPhotoSrc(place.photos[0])} alt={place.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
                            dangerouslySetInnerHTML={{ __html: MARKER_SVG_ICONS[place.category] || '' }} />
                      }
                    </span>
                    <span className="search-result-main">
                      <span className="search-result-title"><Highlight text={place.title} query={query} /></span>
                      <span className="search-result-sub">
                        <Highlight text={[place.city, place.country].filter(Boolean).join(', ') || place.address} query={query} />
                      </span>
                    </span>
                    <CategoryBadge categoryId={place.category} small />
                  </button>
                );
              })}
            </div>
          )}

          {filteredGuides.length > 0 && (
            <div className="search-section">
              <p className="search-section-label">Guides voyage · {filteredGuides.length}</p>
              {filteredGuides.map(guide => (
                <button key={guide.id} className="search-result-row" onClick={() => { navigate(`/guides/${guide.id}`); onClose(); }}>
                  <span className="search-result-thumb" style={{ background: 'var(--border)' }}>
                    {guide.cover_image && <img src={guide.cover_image} alt={guide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </span>
                  <span className="search-result-main">
                    <span className="search-result-title"><Highlight text={guide.title} query={query} /></span>
                    <span className="search-result-sub">
                      <Highlight text={[guide.destination, guide.country].filter(Boolean).join(', ')} query={query} />
                      {guide.duration_days ? ` · ${guide.duration_days} jour${guide.duration_days > 1 ? 's' : ''}` : ''}
                    </span>
                  </span>
                  <span className="cat-badge all small">Guide</span>
                </button>
              ))}
            </div>
          )}

          {q && total === 0 && (
            <p className="search-no-result">Aucun résultat pour « {query} »</p>
          )}
        </div>

        <div className="search-overlay-footer">
          {total > 0 ? `${total} résultat${total > 1 ? 's' : ''}` : 'Commencez à taper…'}
          {' · '}Échap pour fermer
        </div>
      </div>
    </div>
  );
};

// ============================================================
// HOME PAGE
// ============================================================
const HomePage = () => {
  const [places, setPlaces] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [mapCenter, setMapCenter] = useState([46.603354, 1.888334]);
  const [loading, setLoading] = useState(true);
  const location = window.location;
  const [viewMode, setViewMode] = useState(new URLSearchParams(location.search).get('view') || 'grid');
  const [searchOpen, setSearchOpen] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPlaces(); }, [activeCategory]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(v => !v); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  const filtered = places;

  const igUrl = "https://www.instagram.com/deuxpas_unmonde?igsh=MTFtYm0ydnI0aDQ0Zw%3D%3D&utm_source=qr";
  const igSvg = (
    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Dark hero */}
      <div className="site-hero">
        <Link to="/"><DpmLogo /></Link>
        <p className="site-hero-tagline">NOS BONNES ADRESSES À TRAVERS LE MONDE</p>
        <a href={igUrl} target="_blank" rel="noopener noreferrer" className="site-hero-instagram">
          {igSvg}@deuxpas_unmonde
        </a>
        <div className="section-nav">
          <Link to="/"><button className="section-nav-btn active">Adresses</button></Link>
          <Link to="/guides"><button className="section-nav-btn">Guides voyage</button></Link>
        </div>
        {/* Search bar */}
        <div className="hero-search-wrap">
          <div className="hero-search" onClick={() => setSearchOpen(true)} role="button" tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setSearchOpen(true)}>
            <Search size={15} style={{ color: '#b0ab9f', flexShrink: 0 }} />
            <span className="hero-search-input" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Rechercher adresses, guides, villes…
            </span>
            <span className="hero-search-kbd">⌘K</span>
          </div>
        </div>
      </div>

      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        places={places}
        onSelectPlace={setSelectedPlace}
      />

      {/* Filter bar (sticky) */}
      <div className="filter-bar" data-testid="header">
        <div className="filter-bar-inner">
          <div className="filter-pills">
            {CATEGORIES.map(cat => (
              <button key={cat.id}
                className={`filter-pill ${cat.key} ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`category-${cat.id}`}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="view-toggles">
            {[
              ['grid', <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>],
              ['list', <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>],
              ['map',  <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>],
            ].map(([mode, icon]) => (
              <button key={mode}
                className={`view-toggle-btn ${viewMode === mode ? 'active' : ''}`}
                onClick={() => setViewMode(mode)}
                data-testid={`view-${mode}-btn`}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="content-area">
        <p className="results-count">{filtered.length} adresse{filtered.length > 1 ? 's' : ''}</p>
        {viewMode === 'grid' ? (
          <div className="places-grid" data-testid="places-grid">
            {loading ? <div className="loading">Chargement…</div>
              : filtered.length === 0 ? (
                <div className="empty-state" data-testid="empty-state">
                  <MapPin size={40} /><h3>Aucun lieu pour le moment</h3><p>Les bonnes adresses arrivent bientôt !</p>
                </div>
              ) : filtered.map(place => (
                <PlaceCard key={place.id} place={place} onClick={() => setSelectedPlace(place)} />
              ))}
          </div>
        ) : viewMode === 'list' ? (
          <div data-testid="places-list">
            {loading ? <div className="loading">Chargement…</div>
              : filtered.length === 0 ? (
                <div className="empty-state" data-testid="empty-state">
                  <MapPin size={40} /><h3>Aucun lieu pour le moment</h3><p>Les bonnes adresses arrivent bientôt !</p>
                </div>
              ) : filtered.map(place => (
                <PlaceListRow key={place.id} place={place} onClick={() => setSelectedPlace(place)} />
              ))}
          </div>
        ) : (
          <div className="map-wrapper" data-testid="map-wrapper">
            <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              <MapRecenter center={mapCenter} />
              {filtered.map(place => (
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
        <p>Deux pas un monde © 2026 — <a href={igUrl} target="_blank" rel="noopener noreferrer">@deuxpas_unmonde</a></p>
      </footer>

      {/* Floating admin button */}
      <Link to="/admin" className="floating-admin-btn" data-testid="admin-link">
        <Settings size={15} />Admin
      </Link>

      <AnimatePresence>
        {selectedPlace && <PlaceDetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// ============================================================
// 3D GLOBE VIEW — Three.js natif (identique au prototype)
// ============================================================
const GUIDE_COLORS = ['#c17c5a','#5B7A8A','#5A7A60','#8A7845','#7B5A8A','#8A5A5A','#5A6A8A','#6A8A5A'];

const _geocodeCache = {};
const geocodeDestination = async (destination) => {
  if (_geocodeCache[destination]) return _geocodeCache[destination];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`);
    const data = await res.json();
    if (data[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      _geocodeCache[destination] = coords;
      return coords;
    }
  } catch {}
  return null;
};

const GlobeCanvas = ({ resolvedGuides, onSelectGuide }) => {
  const mountRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || resolvedGuides.length === 0) return;
    const container = mountRef.current;
    const W = container.clientWidth;
    const H = container.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xfff5e4, 1.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    const RADIUS = 1;
    const texLoader = new THREE.TextureLoader();
    const earthTex = texLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      () => renderer.render(scene, camera),
      undefined,
      () => {
        const cv = document.createElement('canvas');
        cv.width = 512; cv.height = 256;
        const cx = cv.getContext('2d');
        const grad = cx.createLinearGradient(0, 0, 512, 256);
        grad.addColorStop(0, '#1a3a5c'); grad.addColorStop(0.4, '#2d6a8a');
        grad.addColorStop(0.6, '#3d8a6a'); grad.addColorStop(1, '#1a3a5c');
        cx.fillStyle = grad; cx.fillRect(0, 0, 512, 256);
        earthTex.image = cv; earthTex.needsUpdate = true;
      }
    );
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({ map: earthTex, specular: new THREE.Color(0x222222), shininess: 12 })
    );
    scene.add(globe);

    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS * 1.02, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x4488cc, transparent: true, opacity: 0.08, side: THREE.FrontSide })
    ));

    const starVerts = [];
    for (let i = 0; i < 2000; i++) {
      starVerts.push((Math.random()-0.5)*200, (Math.random()-0.5)*200, (Math.random()-0.5)*200);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVerts, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6 })));

    const toVec3 = (lat, lng, r) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
         r * Math.cos(phi),
         r * Math.sin(phi) * Math.sin(theta)
      );
    };

    const markers = [];
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);

    resolvedGuides.forEach((guide, idx) => {
      const pos = toVec3(guide._lat, guide._lng, RADIUS + 0.012);
      const color = new THREE.Color(guide.markerColor || GUIDE_COLORS[idx % GUIDE_COLORS.length]);

      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 16, 16),
        new THREE.MeshPhongMaterial({ color, emissive: color, emissiveIntensity: 0.4 })
      );
      dot.position.copy(pos);
      dot.userData = { guide };
      markerGroup.add(dot);
      markers.push(dot);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.028, 0.038, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      );
      ring.position.copy(pos);
      ring.lookAt(0, 0, 0);
      ring.userData = { isPulse: true, phase: idx * 0.8 };
      markerGroup.add(ring);

      const spike = new THREE.Mesh(
        new THREE.CylinderGeometry(0.003, 0.003, 0.06, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 })
      );
      spike.position.copy(pos.clone().multiplyScalar(0.97));
      spike.lookAt(0, 0, 0);
      spike.rotateX(Math.PI / 2);
      markerGroup.add(spike);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false, prevX = 0, prevY = 0, rotX = 0, rotY = 0, autoRotate = true;
    const Z_MIN = 1.4, Z_MAX = 5.0;

    const onWheel = (evt) => {
      evt.preventDefault();
      camera.position.z = Math.max(Z_MIN, Math.min(Z_MAX, camera.position.z + evt.deltaY * 0.005));
    };
    container.addEventListener('wheel', onWheel, { passive: false });

    const onMouseMove = (evt) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((evt.clientX - rect.left) / W) * 2 - 1;
      mouse.y = -((evt.clientY - rect.top) / H) * 2 + 1;
      if (isDragging) {
        rotY += (evt.clientX - prevX) * 0.005;
        rotX += (evt.clientY - prevY) * 0.005;
        rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotX));
        prevX = evt.clientX; prevY = evt.clientY;
        autoRotate = false;
      }
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markers);
      if (hits.length > 0) {
        container.style.cursor = 'pointer';
        const g = hits[0].object.userData.guide;
        if (tooltipRef.current) {
          tooltipRef.current.innerHTML = `
            <div style="font-family:'Cormorant Garant',serif;font-size:15px;font-weight:600;color:#252826;line-height:1.2">${g.title}</div>
            <div style="font-family:Jost,sans-serif;font-size:11px;color:#888;margin-top:3px">${g.destination}, ${g.country}</div>
            <div style="font-family:Jost,sans-serif;font-size:10px;color:#aaa;margin-top:2px">${g.duration_days} jour${g.duration_days > 1 ? 's' : ''}</div>
          `;
          tooltipRef.current.style.display = 'block';
          tooltipRef.current.style.left = (evt.clientX - rect.left + 14) + 'px';
          tooltipRef.current.style.top = (evt.clientY - rect.top - 10) + 'px';
        }
      } else {
        container.style.cursor = isDragging ? 'grabbing' : 'grab';
        if (tooltipRef.current) tooltipRef.current.style.display = 'none';
      }
    };
    const onMouseDown = (evt) => { isDragging = true; prevX = evt.clientX; prevY = evt.clientY; container.style.cursor = 'grabbing'; };
    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false; container.style.cursor = 'grab';
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markers);
      if (hits.length > 0) onSelectGuide(hits[0].object.userData.guide);
    };
    const onMouseLeave = () => { isDragging = false; if (tooltipRef.current) tooltipRef.current.style.display = 'none'; };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mouseleave', onMouseLeave);

    let lastTouchX = 0, lastTouchY = 0, hasTouchStart = false, lastPinchDist = 0;
    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      } else {
        lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
        hasTouchStart = true; autoRotate = false;
      }
    });
    container.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        camera.position.z = Math.max(Z_MIN, Math.min(Z_MAX, camera.position.z - (dist - lastPinchDist) * 0.02));
        lastPinchDist = dist;
        e.preventDefault();
        return;
      }
      if (!hasTouchStart) return;
      const t = e.touches[0];
      rotY += (t.clientX - lastTouchX) * 0.005; rotX += (t.clientY - lastTouchY) * 0.005;
      rotX = Math.max(-Math.PI/2, Math.min(Math.PI/2, rotX));
      lastTouchX = t.clientX; lastTouchY = t.clientY; e.preventDefault();
    }, { passive: false });
    container.addEventListener('touchend', () => { hasTouchStart = false; });

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      if (autoRotate) { globe.rotation.y += 0.002; markerGroup.rotation.y = globe.rotation.y; }
      else { globe.rotation.set(rotX, rotY, 0); markerGroup.rotation.set(rotX, rotY, 0); }
      markerGroup.children.forEach(child => {
        if (child.userData.isPulse) {
          const sc = 1 + 0.35 * Math.sin(elapsed * 2 + child.userData.phase);
          child.scale.setScalar(sc);
          child.material.opacity = 0.4 * (1 - (sc - 1));
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nW = container.clientWidth, nH = container.clientHeight;
      camera.aspect = nW / nH; camera.updateProjectionMatrix(); renderer.setSize(nW, nH);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={mountRef} style={{
        width: '100%', height: 520, borderRadius: 12, overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 50%, #0a0e1a 100%)',
        cursor: 'grab', userSelect: 'none',
      }} />
      <div ref={tooltipRef} style={{
        position: 'absolute', display: 'none', pointerEvents: 'none',
        background: '#faf8f3', borderRadius: 8, padding: '10px 14px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)', border: '1px solid #e5e0d5',
        maxWidth: 200, zIndex: 10, top: 0, left: 0,
      }} />
    </div>
  );
};

const GlobeView = ({ guides, navigate }) => {
  const [resolvedGuides, setResolvedGuides] = useState([]);
  const [geocoding, setGeocoding] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setGeocoding(true);
      const results = await Promise.all(guides.map(async (guide, idx) => {
        const coords = await geocodeDestination(`${guide.destination}, ${guide.country}`);
        if (coords) return { ...guide, _lat: coords.lat, _lng: coords.lng, markerColor: guide.marker_color || GUIDE_COLORS[idx % GUIDE_COLORS.length] };
        return { ...guide, _lat: null, _lng: null };
      }));
      if (!cancelled) {
        setResolvedGuides(results.filter(g => g._lat && g._lng));
        setGeocoding(false);
      }
    };
    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides.length]);

  const globeKey = resolvedGuides.map(g => `${g.id}_${g._lat}_${g._lng}`).join(',');

  return (
    <div>
      {geocoding ? (
        <div style={{
          width: '100%', height: 520, borderRadius: 12, overflow: 'hidden',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 50%, #0a0e1a 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
            Localisation des destinations…
          </span>
        </div>
      ) : (
        <GlobeCanvas key={globeKey} resolvedGuides={resolvedGuides} onSelectGuide={g => navigate(`/guides/${g.id}`)} />
      )}
      {!geocoding && resolvedGuides.length > 0 && (
        <div style={{ marginTop: 20, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {resolvedGuides.map(g => (
            <div key={g.id} onClick={() => navigate(`/guides/${g.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 6, padding: '7px 14px',
                cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(63,66,64,0.12)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: g.markerColor, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: "'Cormorant Garant', serif", fontSize: 15, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>{g.title}</div>
                <div style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, color: 'var(--text-muted)' }}>{g.destination}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 14 }}>
        Cliquez et glissez pour faire tourner · Cliquez un marqueur pour ouvrir le guide
      </p>
    </div>
  );
};

// ============================================================
// GUIDES LIST PAGE — /guides
// ============================================================
const GuidesPage = () => {
  const [guides, setGuides]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const navigate = useNavigate();

  useEffect(() => { fetchGuides(); }, []);

  const fetchGuides = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/api/guides`);
      const data = await res.json();
      setGuides(Array.isArray(data) ? data : []);
    } catch { toast.error('Erreur lors du chargement des guides'); }
    finally { setLoading(false); }
  };

  const igUrl = "https://www.instagram.com/deuxpas_unmonde?igsh=MTFtYm0ydnI0aDQ0Zw%3D%3D&utm_source=qr";
  const igSvg = <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 14, height: 14 }}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;

  const VIEW_TOGGLES = [
    { mode: 'grid', icon: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M3 3h8v8H3V3zm0 10h8v8H3v-8zM13 3h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg> },
    { mode: 'list', icon: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg> },
    { mode: 'globe', icon: <svg viewBox="0 0 24 24" fill="currentColor" style={{width:16,height:16}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> },
  ];


  return (
    <div className="guides-page">
      {/* Hero */}
      <div className="site-hero">
        <Link to="/"><DpmLogo /></Link>
        <p className="site-hero-tagline">NOS GUIDES DE VOYAGE</p>
        <a href={igUrl} target="_blank" rel="noopener noreferrer" className="site-hero-instagram">
          {igSvg}@deuxpas_unmonde
        </a>
        <div className="section-nav">
          <Link to="/"><button className="section-nav-btn">Adresses</button></Link>
          <Link to="/guides"><button className="section-nav-btn active">Guides voyage</button></Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="filter-bar-inner">
          <p className="results-count" style={{ margin: 0 }}>{guides.length} guide{guides.length > 1 ? 's' : ''}</p>
          <div className="view-toggles">
            {VIEW_TOGGLES.map(({ mode, icon }) => (
              <button key={mode} className={`view-toggle-btn ${viewMode === mode ? 'active' : ''}`} onClick={() => setViewMode(mode)}>
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="guides-content">
        <SurpriseCountdown />
        {loading ? (
          <div className="loading">Chargement…</div>
        ) : guides.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={40} /><h3>Aucun guide pour le moment</h3><p>Les guides arrivent bientôt !</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="guides-grid">
            {guides.map(guide => (
              <GuideCard key={guide.id} guide={guide} onClick={() => navigate(`/guides/${guide.id}`)} />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="guides-list">
            {guides.map(guide => (
              <GuideListRow key={guide.id} guide={guide} onClick={() => navigate(`/guides/${guide.id}`)} />
            ))}
          </div>
        ) : (
          <div className="guides-globe-wrap">
            <GlobeView guides={guides} navigate={navigate} />
          </div>
        )}
      </div>

      <footer className="footer">
        <p>Deux pas un monde © 2026 — <a href={igUrl} target="_blank" rel="noopener noreferrer">@deuxpas_unmonde</a></p>
      </footer>

      <Link to="/admin" className="floating-admin-btn"><Settings size={15} />Admin</Link>
    </div>
  );
};

// ============================================================
// SURPRISE COUNTDOWN — teaser pour le guide du 25 avril 2026
// ============================================================
const REVEAL_DATE = new Date('2026-04-25T00:00:00');

const SurpriseCountdown = () => {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const tick = () => {
      const diff = REVEAL_DATE - new Date();
      if (diff <= 0) { setTimeLeft(null); return; }
      setTimeLeft({
        jours:    Math.floor(diff / (1000 * 60 * 60 * 24)),
        heures:   Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes:  Math.floor((diff / (1000 * 60)) % 60),
        secondes: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!timeLeft) return null;

  return (
    <div className="surprise-countdown">
      <div className="surprise-inner">
        <div className="surprise-top">
          <span className="surprise-icon">?</span>
          <div>
            <p className="surprise-label">Destination Surprise</p>
            <p className="surprise-sub">Un nouveau guide arrive le 25 avril 2026</p>
          </div>
        </div>
        <div className="countdown-blocks">
          {Object.entries(timeLeft).map(([unit, val]) => (
            <div key={unit} className="countdown-block">
              <span className="countdown-num">{String(val).padStart(2, '0')}</span>
              <span className="countdown-unit">{unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ============================================================
// GUIDE DETAIL PAGE — /guides/:id (style prototype)
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
  const [activeDay, setActiveDay] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchGuide(); }, [id]);

  const fetchGuide = async () => {
    try {
      const res = await fetch(`${API_URL}/api/guides/${id}`);
      if (!res.ok) throw new Error();
      const g = await res.json();
      setGuide(g);
      const activityPlaceIds = (g.itinerary || []).flatMap(day =>
        (day.activities || []).map(act => act.place_id).filter(Boolean)
      );
      const allPlaceIds = [...new Set([...(g.place_ids || []), ...activityPlaceIds])];
      if (allPlaceIds.length > 0) {
        const results = await Promise.all(
          allPlaceIds.map(pid => fetch(`${API_URL}/api/places/${pid}`).then(r => r.ok ? r.json() : null))
        );
        setPlaces(results.filter(Boolean));
      }
    } catch { toast.error('Guide non trouvé'); navigate('/guides'); }
    finally { setLoading(false); }
  };

  if (loading || !guide) return <div className="loading-page">Chargement...</div>;

  const allPhotos = [guide.cover_image, ...guide.photos].filter(Boolean);
  const mapCenter = places.length > 0 ? [places[0].latitude, places[0].longitude] : [46.6, 1.9];
  const placeMap = places.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});

  const TABS = [
    ['itinerary', 'Itinéraire'],
    ['practical', 'Infos pratiques'],
    ['photos',    'Photos'],
    ['map',       'Carte du séjour'],
  ];

  const PRACTICAL_BLOCKS = [
    { icon: <Wallet size={16} />, label: 'Budget estimé', show: guide.practical_info?.budget_min || guide.practical_info?.budget_max,
      content: `${guide.practical_info?.budget_min || '?'}€ – ${guide.practical_info?.budget_max || '?'}€ / pers / jour` },
    { icon: <Calendar size={16} />, label: 'Meilleures saisons', show: guide.practical_info?.best_seasons?.length > 0,
      content: guide.practical_info?.best_seasons?.join(' · ') },
    { icon: <Plane size={16} />, label: 'Transports', show: guide.practical_info?.transport_tips,
      content: guide.practical_info?.transport_tips },
    { icon: <Info size={16} />, label: 'Visa & formalités', show: guide.practical_info?.visa_info,
      content: guide.practical_info?.visa_info },
    { icon: <Wallet size={16} />, label: 'Monnaie', show: guide.practical_info?.currency,
      content: guide.practical_info?.currency },
    { icon: <Globe size={16} />, label: 'Langue', show: guide.practical_info?.language_tips,
      content: guide.practical_info?.language_tips },
  ].filter(b => b.show);

  return (
    <>
      <div className="guide-detail-page">

        {/* ── Hero ─────────────────────────────────────────── */}
        <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>
          {guide.cover_image
            ? <img src={guide.cover_image} alt={guide.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #c17c5a 0%, #5B7A8A 100%)' }} />
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,17,15,0.78) 0%, rgba(15,17,15,0.2) 55%, transparent 100%)' }} />

          {/* Back */}
          <button onClick={() => navigate(-1)} style={{
            position: 'absolute', top: 20, left: 20, background: 'rgba(0,0,0,0.38)',
            border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px',
            fontFamily: 'Jost, sans-serif', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)',
          }}>← Retour</button>

          {/* Photos shortcut */}
          {allPhotos.length > 0 && (
            <button onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }} style={{
              position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.38)',
              border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px',
              fontFamily: 'Jost, sans-serif', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)',
            }}><ZoomIn size={14} /> Photos ({allPhotos.length})</button>
          )}

          {/* Title block */}
          <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', width: '90%', maxWidth: 700 }}>
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}>
              Guide voyage — {guide.destination}, {guide.country}
            </p>
            <h1 style={{ fontFamily: "'Cormorant Garant', serif", fontWeight: 600, fontSize: 42, color: '#fff', margin: 0, lineHeight: 1.1, textShadow: '0 2px 16px rgba(0,0,0,0.35)' }}>
              {guide.title}
            </h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <span style={heroPill}>{guide.duration_days} jour{guide.duration_days > 1 ? 's' : ''}</span>
              {guide.practical_info?.best_seasons?.length > 0 && (
                <span style={heroPill}>{guide.practical_info.best_seasons.join(' · ')}</span>
              )}
              {guide.practical_info?.budget_min && (
                <span style={heroPill}>{guide.practical_info.budget_min}–{guide.practical_info.budget_max}€/j</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 80px' }}>

          {/* Intro */}
          {guide.intro && (
            <p style={{ fontFamily: "'Cormorant Garant', serif", fontStyle: 'italic', fontSize: 20, color: '#666',
              lineHeight: 1.75, marginBottom: 44, textAlign: 'center' }}
              dangerouslySetInnerHTML={{ __html: guide.intro }} />
          )}

          {/* Tab toggle */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 36, background: '#ede8db', borderRadius: 8, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
            {TABS.map(([key, label]) => (
              <button key={key} onClick={() => setActiveSection(key)} style={{
                fontFamily: 'Jost, sans-serif', fontSize: 13, padding: '7px 20px', borderRadius: 6,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: activeSection === key ? '#3f4240' : 'transparent',
                color: activeSection === key ? '#ede8db' : '#888',
                fontWeight: activeSection === key ? 500 : 400,
              }}>{label}</button>
            ))}
          </div>

          {/* ── Itinéraire ── */}
          {activeSection === 'itinerary' && (
            guide.itinerary.length === 0
              ? <p className="guide-empty-section">Itinéraire à venir…</p>
              : <>
                  {/* Day pills */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
                    {guide.itinerary.map((day, i) => (
                      <button key={i} onClick={() => setActiveDay(i)} style={{
                        fontFamily: 'Jost, sans-serif', fontSize: 13, padding: '8px 20px', borderRadius: 6,
                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: activeDay === i ? '#3f4240' : '#faf8f3',
                        color: activeDay === i ? '#ede8db' : '#888',
                        boxShadow: activeDay === i ? '0 2px 8px rgba(63,66,64,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                        fontWeight: activeDay === i ? 500 : 400,
                      }}>
                        Jour {day.day_number}
                        {day.title && <span style={{ fontSize: 11, opacity: 0.65, marginLeft: 6 }}>— {day.title}</span>}
                      </button>
                    ))}
                  </div>

                  {/* Day content */}
                  {guide.itinerary[activeDay] && (() => {
                    const day = guide.itinerary[activeDay];
                    return (
                      <div>
                        <h2 style={{ fontFamily: "'Cormorant Garant', serif", fontWeight: 600, fontSize: 30, color: '#252826', marginBottom: 8 }}>
                          Jour {day.day_number}
                          {day.title && <span style={{ fontWeight: 400, color: '#aaa', fontSize: 24 }}> — {day.title}</span>}
                        </h2>
                        {day.description && (
                          <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 14, color: '#777', lineHeight: 1.7, marginBottom: 32 }}
                            dangerouslySetInnerHTML={{ __html: day.description }} />
                        )}

                        {/* Timeline activities */}
                        <div style={{ marginBottom: day.tips?.length > 0 ? 0 : 8 }}>
                          {(day.activities || []).map((act, i) => {
                            const isLast = i === day.activities.length - 1;
                            const linked = act.place_id && placeMap[act.place_id];
                            const t = ACTIVITY_TYPES[act.type] || null;
                            return (
                              <div key={i} style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 8 : 28 }}>
                                {/* Timeline dot + line */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                  <div style={{ width: 34, height: 34, borderRadius: '50%',
                                    background: t ? t.bg : '#f0ece4',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {t ? (
                                      <svg viewBox="0 0 24 24" fill={t.color} style={{ width: 16, height: 16 }}>
                                        <path d={t.path} />
                                      </svg>
                                    ) : (
                                      <MapPin size={15} color="#c17c5a" />
                                    )}
                                  </div>
                                  {!isLast && <div style={{ width: 1, flex: 1, background: '#e8e3d9', marginTop: 4 }} />}
                                </div>
                                {/* Content */}
                                <div style={{ paddingTop: 5, flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    {act.time && (
                                      <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#bbb', letterSpacing: '0.06em', minWidth: 36 }}>
                                        {act.time}
                                      </span>
                                    )}
                                    {t && (
                                      <span style={{
                                        fontFamily: 'Jost, sans-serif', fontSize: 10, color: t.color,
                                        background: t.bg, borderRadius: 3, padding: '2px 7px',
                                        letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500,
                                      }}>{t.label}</span>
                                    )}
                                  </div>
                                  <div style={{ fontFamily: "'Cormorant Garant', serif", fontWeight: 600, fontSize: 20, color: '#252826', lineHeight: 1.2, marginBottom: 6 }}>
                                    {act.title}
                                  </div>
                                  {act.description && (
                                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 13.5, color: '#666', margin: '0 0 10px', lineHeight: 1.65 }}
                                      dangerouslySetInnerHTML={{ __html: act.description }} />
                                  )}
                                  {linked && (
                                    <button onClick={() => setSelectedPlace(linked)} style={{
                                      display: 'inline-flex', alignItems: 'center', gap: 8,
                                      background: '#f5f1ea', borderRadius: 6, padding: '6px 12px',
                                      border: '1px solid #e5e0d5', cursor: 'pointer',
                                      fontFamily: "'Cormorant Garant', serif", fontSize: 14, fontWeight: 600, color: '#252826',
                                    }}>
                                      <MapPin size={12} color="#c17c5a" />{linked.title}
                                      {linked.city && <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, color: '#aaa', fontWeight: 400 }}>{linked.city}</span>}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Tips du jour */}
                        {day.tips?.length > 0 && (
                          <div style={{ marginTop: 24, background: '#faf8f3', borderRadius: 8, padding: '20px 24px', border: '1px solid #e5e0d5' }}>
                            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bbb', marginBottom: 12 }}>
                              Conseils du jour
                            </p>
                            <ul style={{ paddingLeft: 18, margin: 0 }}>
                              {day.tips.map((tip, i) => (
                                <li key={i} style={{ fontFamily: 'Jost, sans-serif', fontSize: 13.5, color: '#555', lineHeight: 1.65, marginBottom: 6 }}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
          )}

          {/* ── Infos pratiques ── */}
          {activeSection === 'practical' && (
            PRACTICAL_BLOCKS.length === 0
              ? <p className="guide-empty-section">Informations pratiques à venir…</p>
              : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                  {PRACTICAL_BLOCKS.map((b, i) => (
                    <div key={i} style={{ background: '#faf8f3', borderRadius: 8, padding: '20px 22px', border: '1px solid #e5e0d5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#f0ece4',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#3f4240' }}>
                          {b.icon}
                        </div>
                        <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          {b.label}
                        </span>
                      </div>
                      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 13.5, color: '#555', margin: 0, lineHeight: 1.65 }}>{b.content}</p>
                    </div>
                  ))}
                </div>
          )}

          {/* ── Photos ── */}
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

          {/* ── Carte du séjour ── */}
          {activeSection === 'map' && (() => {
            // Numérotation séquentielle de toutes les activités
            let counter = 0;
            const allActs = guide.itinerary.flatMap(day =>
              (day.activities || []).map(act => ({
                ...act, dayNumber: day.day_number, dayTitle: day.title, num: ++counter,
              }))
            );
            const mappable = allActs.filter(a => a.latitude && a.longitude);
            const positions = mappable.map(a => [a.latitude, a.longitude]);
            const center = positions.length > 0
              ? [positions.reduce((s, p) => s + p[0], 0) / positions.length,
                 positions.reduce((s, p) => s + p[1], 0) / positions.length]
              : mapCenter;
            return (
              <div>
                {mappable.length === 0
                  ? <p className="guide-empty-section">Aucune activité géolocalisée — ajoutez des adresses dans l'éditeur.</p>
                  : (
                    <MapContainer center={center} zoom={13}
                      style={{ height: '440px', width: '100%', borderRadius: '10px', border: '1px solid #e5e0d5', marginBottom: 24 }}
                      scrollWheelZoom={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      <FitBoundsToMarkers positions={positions} />
                      {mappable.map(act => (
                        <Marker key={act.num} position={[act.latitude, act.longitude]}
                          icon={createActivityMarkerIcon(act.num, act.type)}>
                          <Popup>
                            <div style={{ fontFamily: 'Jost, sans-serif', minWidth: 140 }}>
                              <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>Jour {act.dayNumber}</div>
                              <div style={{ fontFamily: "'Cormorant Garant', serif", fontSize: 15, fontWeight: 600, color: '#252826' }}>{act.title}</div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  )
                }
                {/* Grille des activités */}
                {allActs.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                    {allActs.map(act => {
                      const bg = ACTIVITY_MARKER_COLORS[act.type] || '#8a7060';
                      const hasCoords = !!(act.latitude && act.longitude);
                      return (
                        <div key={act.num} style={{
                          background: '#faf8f3', borderRadius: 8, padding: '10px 14px',
                          border: '1px solid #e5e0d5', display: 'flex', alignItems: 'center', gap: 12,
                          opacity: hasCoords ? 1 : 0.5,
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: hasCoords ? bg : '#ccc',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'Jost, sans-serif', fontSize: 12, fontWeight: 700, color: '#fff',
                          }}>{act.num}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, color: '#bbb', marginBottom: 2 }}>
                              Jour {act.dayNumber}
                            </div>
                            <div style={{
                              fontFamily: "'Cormorant Garant', serif", fontWeight: 600,
                              fontSize: 14, color: '#252826', lineHeight: 1.2,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{act.title}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tags */}
          {guide.tags?.length > 0 && (
            <div style={{ marginTop: 48, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {guide.tags.map(t => (
                <span key={t} style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#aaa',
                  background: '#f0ece4', borderRadius: 20, padding: '4px 12px' }}>#{t}</span>
              ))}
            </div>
          )}
        </div>

        <Link to="/guides" className="floating-home"><BookOpen size={22} /></Link>
      </div>

      <AnimatePresence>
        {lightboxOpen && allPhotos.length > 0 && (
          <Lightbox photos={allPhotos} initialIndex={lightboxIndex} onClose={() => setLightboxOpen(false)} />
        )}
        {selectedPlace && (
          <PlaceDetailModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          ) : <div className="no-image"><MapPin size={64} /></div>}
        </div>

        <div className="detail-content">
          <div className="detail-meta">
            <CategoryBadge categoryId={place.category} />
            <StarRating rating={place.rating} readonly />
          </div>
          <div className="detail-address"><MapPin size={18} /><span>{place.address}</span></div>
          {place.date && <div className="detail-address"><Calendar size={18} /><span>{formatMonthYear(place.date)}</span></div>}
          <div className="detail-description" dangerouslySetInnerHTML={{ __html: place.description }} />
          <div className="detail-map" data-testid="detail-map">
            <MapContainer center={[place.latitude, place.longitude]} zoom={14}
              style={{ height: '250px', width: '100%', borderRadius: '12px' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
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
// DROP ZONE — composant réutilisable pour l'upload par glisser-déposer
// ============================================================
const DropZone = ({ onFiles, multiple = true, label = 'Glisser des photos ici', inputId }) => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) onFiles(files);
  };
  return (
    <div className={`drop-zone ${dragging ? 'dragging' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragEnter={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}>
      <input ref={inputRef} type="file" accept="image/*" multiple={multiple} id={inputId} className="hidden"
        onChange={e => { onFiles(Array.from(e.target.files)); e.target.value = ''; }} />
      <label className="drop-zone-label" onClick={() => inputRef.current?.click()}>
        <Upload size={28} />
        <span>{label}</span>
        <span className="drop-zone-hint">ou cliquer pour sélectionner</span>
      </label>
    </div>
  );
};

// ============================================================
// PLACE SEARCH — dropdown searchable pour lier une adresse à une activité
// ============================================================
const PlaceSearch = ({ act, dayIdx, actIdx, places, updateActivity }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);

  const linked = act.place_id ? places.find(p => p.id === act.place_id) : null;
  const showSearch = !linked || changing;

  const filtered = places.filter(p =>
    !search.trim() ? true :
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.city || '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  return (
    <div style={{ marginTop: 10, position: 'relative' }}>
      <label style={{ fontFamily: 'Jost, sans-serif', fontSize: 9, color: '#999', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Adresse liée
      </label>
      {!showSearch ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0ece4', borderRadius: 6, padding: '6px 10px', border: '1px solid #e5e0d5', marginTop: 4 }}>
          <CategoryBadge categoryId={linked.category} small />
          <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#252826', flex: 1 }}>{linked.title} — {linked.city}</span>
          <button type="button" onClick={() => { updateActivity(dayIdx, actIdx, 'place_id', null); setChanging(false); setSearch(''); }}
            style={{ background: 'none', border: 'none', color: '#bbb', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
          <button type="button" onClick={() => { setChanging(true); setOpen(true); setSearch(''); }}
            style={{ background: 'none', border: '1px solid #d0cbc0', color: '#888', cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontSize: 11, borderRadius: 4, padding: '2px 8px' }}>
            Changer
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
            <input
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 6, border: '1.5px solid #ddd9d0', fontFamily: 'Jost, sans-serif', fontSize: 12, background: '#fff', outline: 'none', color: '#252826', flex: 1 }}
              value={search}
              onChange={e => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              placeholder="Rechercher une adresse..."
            />
            {changing && (
              <button type="button" onClick={() => { setChanging(false); setSearch(''); setOpen(false); }}
                style={{ background: 'none', border: '1px solid #d0cbc0', color: '#888', cursor: 'pointer', fontFamily: 'Jost, sans-serif', fontSize: 11, borderRadius: 4, padding: '6px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Annuler
              </button>
            )}
          </div>
          {open && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid #ddd9d0', borderTop: 'none', borderRadius: '0 0 6px 6px', boxShadow: '0 8px 20px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '10px 12px', fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#bbb' }}>Aucune adresse trouvée</div>
              ) : filtered.map(p => (
                <div key={p.id}
                  onMouseDown={e => { e.preventDefault(); updateActivity(dayIdx, actIdx, 'place_id', p.id); setSearch(''); setOpen(false); setChanging(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f5f1ea' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f0e8'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <CategoryBadge categoryId={p.category} small />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garant', serif", fontSize: 14, fontWeight: 600, color: '#252826', lineHeight: 1.1 }}>{p.title}</div>
                    <div style={{ fontFamily: 'Jost, sans-serif', fontSize: 10, color: '#aaa' }}>{p.city}, {p.country}</div>
                  </div>
                </div>
              ))}
              {!search && places.length > 0 && (
                <div style={{ padding: '6px 12px', fontFamily: 'Jost, sans-serif', fontSize: 10, color: '#ccc', borderTop: '1px solid #f0ece4' }}>
                  Tapez pour filtrer ({places.length} adresses)
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ACTIVITY ADDRESS GEO — géolocalisation de l'adresse d'une activité
// ============================================================
const ActivityAddressGeo = ({ act, dayIdx, actIdx, updateActivityFields }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(
    act.latitude && act.longitude ? { lat: act.latitude, lng: act.longitude } : null
  );

  const geocode = async () => {
    const q = (act.address || '').trim();
    if (!q) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data[0]) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        updateActivityFields(dayIdx, actIdx, { latitude: lat, longitude: lng });
        setResult({ lat, lng, display_name: data[0].display_name });
        toast.success('Coordonnées trouvées !');
      } else {
        toast.error('Adresse introuvable');
      }
    } catch { toast.error('Erreur de géolocalisation'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ marginTop: 4 }}>
      <div className="address-geocode-row">
        <input
          type="text"
          value={act.address || ''}
          onChange={e => {
            updateActivityFields(dayIdx, actIdx, { address: e.target.value || null });
            setResult(null);
          }}
          placeholder="Adresse ou nom du lieu"
          className="input-xs"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="geocode-btn"
          onClick={geocode}
          disabled={loading || !act.address?.trim()}
          style={{ padding: '0 10px', fontSize: 12, gap: 4 }}
        >
          {loading ? <Loader2 size={13} className="spin" /> : <Search size={13} />}
          {!loading && ' Géo'}
        </button>
      </div>
      {result && (
        <div className="geocode-result" style={{ fontSize: 10, padding: '4px 8px', marginTop: 4 }}>
          <CheckCircle size={11} />
          {result.display_name}
          <span className="geocode-coords">{result.lat.toFixed(5)}, {result.lng.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// ADMIN GUIDE FORM
// ============================================================
const AdminGuideForm = ({ show, guideFormData, setGuideFormData, editingGuide, onSubmit, onClose, loading, places, entityId }) => {
  const [pendingCover, setPendingCover] = useState(null);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [removedGuidePhotos, setRemovedGuidePhotos] = useState([]);

  if (!show) return null;

  const addFiles = (files, field) => {
    if (field === 'cover_image') {
      if (pendingCover) URL.revokeObjectURL(pendingCover.preview);
      setPendingCover({ file: files[0], preview: URL.createObjectURL(files[0]) });
    } else {
      setPendingPhotos(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
    }
  };

  const handleSubmitWithUpload = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token');
    let finalCover = guideFormData.cover_image;
    if (pendingCover) {
      const fd = new FormData(); fd.append('file', pendingCover.file);
      try {
        const r = await fetch(`${API_URL}/api/upload?entity_type=guides&entity_id=${entityId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const d = await r.json();
        if (r.ok) finalCover = d.url;
      } catch {}
    }
    const finalPhotos = [...guideFormData.photos];
    for (const { file } of pendingPhotos) {
      const fd = new FormData(); fd.append('file', file);
      try {
        const r = await fetch(`${API_URL}/api/upload?entity_type=guides&entity_id=${entityId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const d = await r.json();
        if (r.ok) finalPhotos.push(d.url);
      } catch {}
    }
    onSubmit(e, { ...guideFormData, cover_image: finalCover, photos: finalPhotos, removedPhotos: removedGuidePhotos });
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
        activities: [...itinerary[dayIdx].activities, { time: '', type: 'visite', title: '', description: '', place_id: null }]
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

  const updateActivityFields = (dayIdx, actIdx, fields) => {
    setGuideFormData(prev => {
      const itinerary = [...prev.itinerary];
      const activities = [...itinerary[dayIdx].activities];
      activities[actIdx] = { ...activities[actIdx], ...fields };
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
    <div className="admin-inline-form">
      <div className="form-header">
        <h2>{editingGuide ? 'Modifier le guide' : 'Nouveau guide de voyage'}</h2>
        <button onClick={onClose} className="close-btn"><X size={24} /></button>
      </div>
      <form onSubmit={handleSubmitWithUpload} className="place-form">
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
            <div className="form-group"><label>Date de publication</label>
              <input type="month" value={guideFormData.date || ''} onChange={e => setGuideFormData(p => ({ ...p, date: e.target.value }))} /></div>
            <div className="form-group full-width"><label>Tags (séparés par des virgules)</label>
              <input type="text" value={(guideFormData.tags || []).join(', ')} onChange={e => setGuideFormData(p => ({ ...p, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))} placeholder="italie, city-break, gastronomie" /></div>
            <div className="form-group">
              <label>Couleur du marqueur (globe)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <input type="color" value={guideFormData.marker_color || '#c1845a'} onChange={e => setGuideFormData(p => ({ ...p, marker_color: e.target.value }))}
                  style={{ width: 44, height: 34, padding: 2, borderRadius: 6, border: '1.5px solid var(--border)', cursor: 'pointer' }} />
                <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#aaa' }}>Point affiché sur le globe 3D</span>
              </div>
            </div>
            <div className="form-group">
              <label>Statut</label>
              <div className="toggle-row">
                <input type="checkbox" id="published" checked={guideFormData.published} onChange={e => setGuideFormData(p => ({ ...p, published: e.target.checked }))} />
                <label htmlFor="published" className="toggle-label">Publié</label>
              </div>
            </div>
          </div>

          {/* Image de couverture */}
          <h3 className="form-section-title"><ZoomIn size={16} />Image de couverture</h3>
          <div className="form-group">
            <div className="photo-upload-area">
              <DropZone inputId="cover-upload" multiple={false} label="Glisser l'image de couverture ici"
                onFiles={files => addFiles(files, 'cover_image')} />
              {(pendingCover || guideFormData.cover_image) && (
                <div className="uploaded-photos">
                  <div className="uploaded-photo">
                    <img src={pendingCover ? pendingCover.preview : getPhotoSrc(guideFormData.cover_image)} alt="Couverture" />
                    <button type="button" onClick={() => { if (pendingCover) { URL.revokeObjectURL(pendingCover.preview); setPendingCover(null); } else { setRemovedGuidePhotos(prev => [...prev, guideFormData.cover_image]); setGuideFormData(p => ({ ...p, cover_image: '' })); } }} className="remove-photo"><X size={14} /></button>
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
                  <div key={actIdx} className="activity-form-card">
                    <div className="activity-form-card-grid">
                      {/* Heure */}
                      <div>
                        <label className="form-label-xs">Heure</label>
                        <input type="text" value={act.time || ''} onChange={e => updateActivity(dayIdx, actIdx, 'time', e.target.value)} placeholder="09h00" className="input-xs" />
                      </div>
                      {/* Type */}
                      <div>
                        <label className="form-label-xs">Type</label>
                        <select value={act.type || ''} onChange={e => updateActivity(dayIdx, actIdx, 'type', e.target.value || null)} className="input-xs">
                          <option value="">— —</option>
                          {Object.entries(ACTIVITY_TYPES).map(([key, t]) => (
                            <option key={key} value={key}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      {/* Titre + Description + Lat/Lng */}
                      <div>
                        <label className="form-label-xs">Titre & description</label>
                        <input type="text" value={act.title} onChange={e => updateActivity(dayIdx, actIdx, 'title', e.target.value)} placeholder="Nom de l'activité" required className="input-xs" />
                        <textarea value={act.description || ''} onChange={e => updateActivity(dayIdx, actIdx, 'description', e.target.value)} placeholder="Description (optionnel)" rows={2} className="input-xs" style={{ marginTop: 4, resize: 'none' }} />
                        <ActivityAddressGeo act={act} dayIdx={dayIdx} actIdx={actIdx} updateActivityFields={updateActivityFields} />
                      </div>
                      {/* Supprimer */}
                      <button type="button" onClick={() => removeActivity(dayIdx, actIdx)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18, alignSelf: 'start', paddingTop: 20 }}>×</button>
                    </div>
                    <PlaceSearch act={act} dayIdx={dayIdx} actIdx={actIdx} places={places} updateActivity={updateActivity} />
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
              <DropZone inputId="guide-photos-upload" label="Glisser des photos ici"
                onFiles={files => addFiles(files, 'photos')} />
              <div className="uploaded-photos">
                {guideFormData.photos.map((photo, idx) => (
                  <div key={idx} className="uploaded-photo">
                    <img src={getPhotoSrc(photo)} alt="" />
                    <button type="button" onClick={() => { setRemovedGuidePhotos(prev => [...prev, photo]); setGuideFormData(p => ({ ...p, photos: p.photos.filter((_, i) => i !== idx) })); }} className="remove-photo"><X size={14} /></button>
                  </div>
                ))}
                {pendingPhotos.map(({ preview }, idx) => (
                  <div key={`pending-${idx}`} className="uploaded-photo">
                    <img src={preview} alt="" />
                    <button type="button" onClick={() => { URL.revokeObjectURL(preview); setPendingPhotos(prev => prev.filter((_, i) => i !== idx)); }} className="remove-photo"><X size={14} /></button>
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
    </div>
  );
};

// ============================================================
// ADMIN PAGE
// ============================================================
const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [places, setPlaces] = useState([]);
  const [editingPlace, setEditingPlace] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewingPlace, setViewingPlace] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [formData, setFormData] = useState({
    title: '', address: '', city: '', country: '', date: '',
    description: '', category: 'accommodation',
    rating: 3, latitude: 48.8566, longitude: 2.3522, photos: [],
  });
  const [placeFormId, setPlaceFormId] = useState(() => crypto.randomUUID());
  const [adminTab, setAdminTab] = useState('places');
  const [guides, setGuides] = useState([]);
  const [editingGuide, setEditingGuide] = useState(null);
  const [showGuideForm, setShowGuideForm] = useState(false);
  const [guideFormData, setGuideFormData] = useState({ ...EMPTY_GUIDE });
  const [guideFormId, setGuideFormId] = useState(() => crypto.randomUUID());
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState(null);
  const [pendingPlaceFiles, setPendingPlaceFiles] = useState([]);
  const [removedPlacePhotos, setRemovedPlacePhotos] = useState([]);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState(null);
  const [dragOverPhotoIdx, setDragOverPhotoIdx] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) verifyToken(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setIsAuthenticated(true); fetchPlaces(token); fetchGuides(token); }
      else localStorage.removeItem('admin_token');
    } catch { localStorage.removeItem('admin_token'); }
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setLoginError(false);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (res.ok) { localStorage.setItem('admin_token', data.token); setIsAuthenticated(true); fetchPlaces(data.token); fetchGuides(data.token); }
      else { setLoginError(true); }
    } catch { setLoginError(true); }
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

  const handleGuideSubmit = async (e, uploadedData = null) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token'); setLoading(true);
    const data = uploadedData || guideFormData;
    const removedPhotos = uploadedData?.removedPhotos || [];
    try {
      const url = editingGuide ? `${API_URL}/api/guides/${editingGuide.id}` : `${API_URL}/api/guides`;
      const method = editingGuide ? 'PUT' : 'POST';
      const payload = {
        ...data,
        ...(editingGuide ? {} : { id: guideFormId }),
        tags: Array.isArray(data.tags) ? data.tags : (data.tags || '').split(',').map(t => t.trim()).filter(Boolean),
        practical_info: {
          ...data.practical_info,
          budget_min: data.practical_info.budget_min ? parseInt(data.practical_info.budget_min) : null,
          budget_max: data.practical_info.budget_max ? parseInt(data.practical_info.budget_max) : null,
        }
      };
      delete payload.removedPhotos;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.ok) {
        for (const photoUrl of removedPhotos) {
          if (photoUrl.startsWith('/uploads/')) await fetch(`${API_URL}/api/upload?url=${encodeURIComponent(photoUrl)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
        toast.success(editingGuide ? 'Guide modifié !' : 'Guide créé !'); resetGuideForm(); fetchGuides(token);
      } else { const err = await res.json(); toast.error(err.detail || 'Erreur'); }
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

  const resetGuideForm = () => { setEditingGuide(null); setShowGuideForm(false); setGuideFormData({ ...EMPTY_GUIDE }); setGuideFormId(crypto.randomUUID()); };

  const geocodeAddress = async () => {
    if (!formData.address.trim()) return;
    setGeocoding(true); setGeocodeResult(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.address)}&format=json&limit=1&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const addr = data[0].address || {};
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
        const country = addr.country || '';
        setFormData(f => ({ ...f, latitude: lat, longitude: lng, city, country }));
        setGeocodeResult({ lat, lng, display_name: data[0].display_name });
        toast.success('Coordonnées, ville et pays trouvés !');
      } else {
        toast.error('Adresse introuvable — vérifiez ou saisissez les coordonnées manuellement.');
      }
    } catch { toast.error('Erreur de géolocalisation'); }
    finally { setGeocoding(false); }
  };

  const addFiles = (files) => {
    setPendingPlaceFiles(prev => [...prev, ...files.map(f => ({ file: f, preview: URL.createObjectURL(f) }))]);
  };

  const removePhoto = (index) => {
    if (index < formData.photos.length) {
      setRemovedPlacePhotos(prev => [...prev, formData.photos[index]]);
      setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }));
    } else {
      const pendingIdx = index - formData.photos.length;
      URL.revokeObjectURL(pendingPlaceFiles[pendingIdx].preview);
      setPendingPlaceFiles(prev => prev.filter((_, i) => i !== pendingIdx));
    }
  };

  const reorderPhotos = (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    setFormData(prev => {
      const photos = [...prev.photos];
      const [moved] = photos.splice(fromIdx, 1);
      photos.splice(toIdx, 0, moved);
      return { ...prev, photos };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('admin_token'); setLoading(true);
    try {
      const placeId = editingPlace ? editingPlace.id : placeFormId;
      const newUrls = [];
      for (const { file } of pendingPlaceFiles) {
        const fd = new FormData(); fd.append('file', file);
        const r = await fetch(`${API_URL}/api/upload?entity_type=places&entity_id=${placeId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const d = await r.json();
        if (r.ok) newUrls.push(d.url);
      }
      const finalPhotos = [...formData.photos, ...newUrls];
      const url = editingPlace ? `${API_URL}/api/places/${editingPlace.id}` : `${API_URL}/api/places`;
      const payload = editingPlace ? { ...formData, photos: finalPhotos } : { ...formData, id: placeFormId, photos: finalPhotos };
      const res = await fetch(url, { method: editingPlace ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      if (res.ok) {
        for (const photoUrl of removedPlacePhotos) {
          if (photoUrl.startsWith('/uploads/')) await fetch(`${API_URL}/api/upload?url=${encodeURIComponent(photoUrl)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
        toast.success(editingPlace ? 'Lieu modifié !' : 'Lieu créé !'); resetForm(); fetchPlaces(token);
      } else { const error = await res.json(); toast.error(error.detail || 'Erreur'); }
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setLoading(false); }
  };

  const handleEdit = (place) => {
    setPendingPlaceFiles([]); setRemovedPlacePhotos([]);
    setEditingPlace(place);
    setPlaceFormId(place.id);
    setFormData({ title: place.title, address: place.address, city: place.city || '', country: place.country || '', date: place.date || '', description: place.description, category: place.category, rating: place.rating, latitude: place.latitude, longitude: place.longitude, photos: place.photos || [] });
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
    pendingPlaceFiles.forEach(p => URL.revokeObjectURL(p.preview));
    setPendingPlaceFiles([]); setRemovedPlacePhotos([]);
    setEditingPlace(null); setShowForm(false);
    setPlaceFormId(crypto.randomUUID());
    setFormData({ title: '', address: '', city: '', country: '', date: '', description: '', category: 'accommodation', rating: 3, latitude: 48.8566, longitude: 2.3522, photos: [] });
    setGeocodeResult(null); setShowManualCoords(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-login-page">
        <motion.div className="login-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="login-logo">
            <Link to="/"><DpmLogo light={true} /></Link>
          </div>
          <p className="login-subtitle">INTERFACE D'ADMINISTRATION</p>
          <form onSubmit={handleLogin} data-testid="login-form">
            <label className="login-label">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
              placeholder="••••••••"
              className={`login-input${loginError ? ' error' : ''}`}
              data-testid="password-input"
            />
            {loginError && <p className="login-error">Mot de passe incorrect.</p>}
            <button type="submit" className="login-submit-btn" disabled={loading} data-testid="login-btn">
              {loading ? 'Connexion…' : 'SE CONNECTER'}
            </button>
            <Link to="/" className="back-to-home-btn" data-testid="back-home-btn">← Retour au site</Link>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/"><DpmLogo /></Link>
        <span className="admin-header-title">Administration</span>
        <div className="admin-header-actions">
          <button onClick={() => setShowPasswordModal(true)} className="admin-header-btn" data-testid="change-password-btn"><Key size={16} />Mot de passe</button>
          <button onClick={handleLogout} className="admin-header-btn danger" data-testid="logout-btn"><LogOut size={16} />Déconnexion</button>
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
        {/* ONGLET LIEUX — FORMULAIRE */}
        {adminTab === 'places' && showForm && (
          <div className="admin-inline-form">
            <div className="form-header">
              <h2>{editingPlace ? 'Modifier le lieu' : 'Nouveau lieu'}</h2>
              <button onClick={resetForm} className="close-btn" data-testid="close-form-btn"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="place-form" data-testid="place-form">
                    <div className="form-grid">
                      <div className="form-group"><label>Titre</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required data-testid="title-input" /></div>
                      <div className="form-group"><label>Catégorie</label>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} data-testid="category-select">
                          {CATEGORIES.filter(c => c.id !== 'all').map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                        </select>
                      </div>
                      <div className="form-group full-width">
                        <label>Adresse</label>
                        <div className="address-geocode-row">
                          <input type="text" value={formData.address}
                            onChange={(e) => { setFormData({ ...formData, address: e.target.value }); setGeocodeResult(null); }}
                            required data-testid="address-input" placeholder="Ex: 12 rue de la Paix, Paris" />
                          <button type="button" className="geocode-btn" onClick={geocodeAddress} disabled={geocoding}>
                            {geocoding ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
                            {geocoding ? 'Recherche…' : 'Géolocaliser'}
                          </button>
                        </div>
                        {geocodeResult && (
                          <div className="geocode-result">
                            <CheckCircle size={13} />
                            {geocodeResult.display_name}
                            <span className="geocode-coords">{geocodeResult.lat.toFixed(5)}, {geocodeResult.lng.toFixed(5)}</span>
                          </div>
                        )}
                        <button type="button" className="coords-manual-toggle"
                          onClick={() => setShowManualCoords(v => !v)}>
                          {showManualCoords ? 'Masquer' : 'Saisir les coordonnées manuellement'}
                        </button>
                        {showManualCoords && (
                          <div className="coords-manual-fields">
                            <div className="form-group"><label>Latitude</label><input type="number" step="any" value={formData.latitude} onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })} required data-testid="latitude-input" /></div>
                            <div className="form-group"><label>Longitude</label><input type="number" step="any" value={formData.longitude} onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })} required data-testid="longitude-input" /></div>
                          </div>
                        )}
                      </div>
                      <div className="form-group"><label>Ville</label><input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Ex: Lyon" /></div>
                      <div className="form-group"><label>Pays</label><input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="Ex: France" /></div>
                      <div className="form-group full-width"><label>Date de visite</label><input type="month" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                      <div className="form-group full-width"><label>Description</label>
                        <div className="quill-wrapper" data-testid="description-input">
                          <ReactQuill theme="snow" value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} modules={quillModules} formats={quillFormats} placeholder="Décrivez ce lieu..." />
                        </div>
                      </div>
                      <div className="form-group full-width"><label>Note</label><StarRating rating={formData.rating} onChange={(rating) => setFormData({ ...formData, rating })} readonly={false} /></div>
                      <div className="form-group full-width"><label>Photos</label>
                        <div className="photo-upload-area">
                          <DropZone inputId="photo-upload" label="Glisser des photos ici" onFiles={addFiles} />
                          <div className="uploaded-photos">
                            {formData.photos.map((photo, idx) => (
                              <div key={idx}
                                className={`uploaded-photo draggable-photo ${dragOverPhotoIdx === idx ? 'drag-over' : ''}`}
                                draggable
                                onDragStart={() => setDraggedPhotoIdx(idx)}
                                onDragOver={e => { e.preventDefault(); setDragOverPhotoIdx(idx); }}
                                onDragLeave={() => setDragOverPhotoIdx(null)}
                                onDrop={e => { e.preventDefault(); reorderPhotos(draggedPhotoIdx, idx); setDraggedPhotoIdx(null); setDragOverPhotoIdx(null); }}
                                onDragEnd={() => { setDraggedPhotoIdx(null); setDragOverPhotoIdx(null); }}>
                                <img src={getPhotoSrc(photo)} alt="" />
                                <div className="photo-drag-handle"><GripVertical size={14} /></div>
                                <button type="button" onClick={() => removePhoto(idx)} className="remove-photo"><X size={14} /></button>
                              </div>
                            ))}
                            {pendingPlaceFiles.map(({ preview }, idx) => (
                              <div key={`pending-${idx}`} className="uploaded-photo">
                                <img src={preview} alt="" />
                                <button type="button" onClick={() => removePhoto(formData.photos.length + idx)} className="remove-photo"><X size={14} /></button>
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
          </div>
        )}

        {/* ONGLET LIEUX — LISTE */}
        {adminTab === 'places' && !showForm && (
          <>
            <div className="admin-toolbar">
              <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }} data-testid="add-place-btn"><Plus size={20} />Ajouter un lieu</button>
            </div>

            <div className="admin-places-list" data-testid="admin-places-list">
              {places.length === 0 ? (
                <div className="empty-admin"><MapPin size={48} /><h3>Aucun lieu</h3><p>Commencez par ajouter votre premier lieu</p></div>
              ) : places.map((place) => {
                const cat = getCatInfo(place.category);
                const CatIcon = cat?.icon || MapPin;
                return (
                  <motion.div key={place.id} className="admin-place-item" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid={`admin-place-${place.id}`}>
                    <div className="admin-place-image">
                      {place.photos?.[0] ? <img src={getPhotoSrc(place.photos[0])} alt="" /> : <CatIcon size={32} />}
                    </div>
                    <div className="admin-place-info">
                      <h3>{place.title}</h3><p>{place.address}</p>
                      <div className="admin-place-meta">
                        <CategoryBadge categoryId={place.category} small />
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
          </>
        )}

        {/* ONGLET GUIDES — FORMULAIRE */}
        {adminTab === 'guides' && showGuideForm && (
          <AdminGuideForm
            show={showGuideForm}
            guideFormData={guideFormData}
            setGuideFormData={setGuideFormData}
            editingGuide={editingGuide}
            onSubmit={handleGuideSubmit}
            onClose={resetGuideForm}
            loading={loading}
            places={places}
            entityId={guideFormId}
          />
        )}

        {/* ONGLET GUIDES — LISTE */}
        {adminTab === 'guides' && !showGuideForm && (
          <>
            <div className="admin-toolbar">
              <button className="btn-primary" onClick={() => { resetGuideForm(); setShowGuideForm(true); }}><Plus size={20} />Nouveau guide</button>
            </div>

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
                    </div>
                  </div>
                  <div className="admin-place-actions">
                    <button onClick={() => { setEditingGuide(guide); setGuideFormId(guide.id); setGuideFormData({ ...guide }); setShowGuideForm(true); }} className="action-btn"><Edit3 size={18} /></button>
                    <button onClick={() => handleDeleteGuide(guide.id)} className="action-btn delete"><Trash2 size={18} /></button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
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
