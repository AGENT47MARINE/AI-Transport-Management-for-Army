'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Asset {
  id: number;
  name: string;
  asset_type: string;
  current_lat?: number;
  current_long?: number;
  bearing?: number;
  is_available: boolean;
}

interface Route {
  id: number;
  name: string;
  waypoints: number[][]; // [[lat, lng], ...]
  risk_level: string; // LOW, MEDIUM, HIGH-RISK
  status: string;
}

interface MapProps {
  assets: Asset[];
  routes?: Route[];
}

export default function MapComponent({ assets, routes = [] }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]); // Store all layers (markers + polylines)
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(containerRef.current, {
      center: [32.7266, 74.8570], // Jammu Coordinates
      zoom: 8,
      zoomControl: true,
      attributionControl: false
    });

    // --- BASE LAYERS ---
    const radarLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(map); // Default

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    // Add Layer Control
    const baseMaps = {
      "Radar (Dark)": radarLayer,
      "Satellite (Terrain)": satelliteLayer,
      "Street Map": streetLayer
    };

    L.control.layers(baseMaps, undefined, { position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update layers (Markers + Routes) when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old layers
    markersRef.current.forEach(layer => layer.remove());
    markersRef.current = [];

    // --- RENDER ROUTES ---
    routes.forEach(route => {
      if (!route.waypoints || route.waypoints.length < 2) return;

      let color = '#3b82f6'; // Default Blue
      let opacity = 0.5;
      let dashArray = '5, 10';

      if (route.risk_level === 'HIGH') {
        color = '#ef4444'; // Red
        opacity = 0.8;
        dashArray = 'none'; // Solid line for high risk
      } else if (route.risk_level === 'MEDIUM') {
        color = '#f59e0b'; // Amber
        opacity = 0.7;
      } else {
        color = '#10b981'; // Emerald/Green
        opacity = 0.4;
      }

      const polyline = L.polyline(route.waypoints as [number, number][], {
        color: color,
        weight: 3,
        opacity: opacity,
        dashArray: dashArray,
        lineCap: 'round'
      }).addTo(map);

      polyline.bindPopup(`
        <div style="font-family: system-ui; min-width: 150px; background: #0f172a; color: white; border: 1px solid #334155; padding: 10px; border-radius: 6px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">${route.name}</div>
          <div style="font-size: 11px; color: #94a3b8;">Risk Level: <span style="color:${color}; font-weight:bold">${route.risk_level}</span></div>
          <div style="font-size: 11px; color: #94a3b8;">Status: ${route.status}</div>
        </div>
      `);

      markersRef.current.push(polyline);
    });

    // --- RENDER ASSETS ---
    assets.forEach(asset => {
      if (asset.current_lat && asset.current_long) {

        // Create rotatable icon
        const color = asset.is_available ? '#10b981' : '#f59e0b';
        const bearing = asset.bearing || 0;

        const iconHtml = `
          <div style="
            width: 24px; 
            height: 24px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            transform: rotate(${bearing}deg);
            transition: transform 0.3s ease-out; 
          ">
            <!-- Asset Arrow/Triangle -->
            <div style="
              width: 0; 
              height: 0; 
              border-left: 8px solid transparent;
              border-right: 8px solid transparent;
              border-bottom: 16px solid ${color};
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
            "></div>
            
            <!-- Center Dot -->
            <div style="
              position: absolute;
              width: 4px; 
              height: 4px; 
              background: white; 
              border-radius: 50%;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            "></div>
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-vehicle-icon',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([asset.current_lat, asset.current_long], {
          icon: icon
        }).addTo(map);

        const popupContent = `
          <div style="font-family: system-ui; min-width: 150px; background: #0f172a; color: white; border: 1px solid #334155; padding: 10px; border-radius: 6px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">${asset.name}</div>
            <div style="color: #94a3b8; font-size: 11px;">${asset.asset_type}</div>
            <div style="font-size: 10px; color: #64748b;">Heading: ${Math.round(bearing)}°</div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155;">
              <span style="color: ${asset.is_available ? '#10b981' : '#f59e0b'}; font-weight: bold; font-size: 12px;">
                ${asset.is_available ? '● Available' : '● Busy'}
              </span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      }
    });

  }, [assets, routes]); // Re-run when data changes

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#020617' // Match body bg
      }}
    />
  );
}
