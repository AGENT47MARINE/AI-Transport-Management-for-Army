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
  is_available: boolean;
}

interface MapProps {
  assets: Asset[];
}

export default function MapComponent({ assets }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(containerRef.current, {
      center: [32.7266, 74.8570],
      zoom: 8,
      zoomControl: true
    });

    // Add dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when assets change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    assets.forEach(asset => {
      if (asset.current_lat && asset.current_long) {
        const color = asset.is_available ? '#10b981' : '#f59e0b';

        const marker = L.circleMarker([asset.current_lat, asset.current_long], {
          radius: 10,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: system-ui; min-width: 150px;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">${asset.name}</div>
            <div style="color: #666; font-size: 12px;">${asset.asset_type}</div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
              <span style="color: ${asset.is_available ? '#10b981' : '#f59e0b'}; font-weight: bold;">
                ${asset.is_available ? '● Available' : '● Busy'}
              </span>
            </div>
          </div>
        `);

        markersRef.current.push(marker);
      }
    });
  }, [assets]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: '#1e293b'
      }}
    />
  );
}
