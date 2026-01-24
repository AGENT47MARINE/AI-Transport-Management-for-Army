'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

interface Asset {
  id: number;
  name: string;
  asset_type: string;
  current_lat?: number;
  current_long?: number;
  bearing?: number;
  is_available: boolean;
  convoy_id?: number | null;
}

interface Route {
  id: number;
  name: string;
  waypoints: number[][]; // [[lat, lng], ...]
  risk_level: string; // LOW, MEDIUM, HIGH-RISK
  status: string;
}

interface Checkpoint {
  id: number;
  name: string;
  lat: number;
  long: number;
  appointment_type?: string; // Legacy field match
  checkpoint_type: string;
  location_name?: string;
  capacity?: number;
  tcp_incharge?: string;
  upcoming_convoys?: any[];
}

interface Convoy {
  id: number;
  name: string;
  start_location: string;
  end_location: string;
  status: string;
  route_id?: number;
}

interface MapProps {
  assets: Asset[];
  routes?: Route[];
  convoys?: Convoy[];
  checkpoints?: Checkpoint[];
  draftRoute?: {
    start_lat: number;
    start_long: number;
    end_lat: number;
    end_long: number;
  };
  onRoutePointUpdate?: (point: 'start' | 'end', lat: number, lng: number) => void;
  initialSelectedRouteId?: number;
}

export default function MapComponent({ assets, routes = [], convoys = [], checkpoints = [], draftRoute, onRoutePointUpdate, initialSelectedRouteId }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Layer[]>([]); // Store non-clustered layers (routes, draft markers)
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const checkpointMarkersRef = useRef<L.Layer[]>([]); // Store TCP layers separate to toggle
  const containerRef = useRef<HTMLDivElement>(null);
  const prevStaticAssetsJson = useRef<string>('[]'); // For deep comparison of static assets

  // State for selected route (visible only when Convoy clicked)
  const selectedRouteIdRef = useRef<number | null>(null); // Use Ref to avoid re-initializing map? No, need re-render of layers.
  // Actually, standard Ref for layers avoids React re-renders, but we need to trigger the effect. 
  // Let's use a Ref for tracking selection but maybe trigger update via dependency?
  // Ideally, passing selectedRouteId as prop or state.
  // Let's make it internal state but since we use Refs for Leaflet, we can just clear/redraw layers.
  // But we need a trigger. Let's add a dummy state or just rely on the effect.
  // Wait, if I click inside the map, I need to update the layers.
  // Let's use a state variable for selectedRouteId.
  // However, since this component uses refs heavily, let's stick to that pattern OR introduce state.
  // Using state will trigger re-render of component function, hitting the useEffect.
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(initialSelectedRouteId || null);

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
    }).addTo(map);

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    });

    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    const baseMaps = {
      "Radar (Dark)": radarLayer,
      "Satellite (Terrain)": satelliteLayer,
      "Street Map": streetLayer
    };

    L.control.layers(baseMaps, undefined, { position: 'bottomright' }).addTo(map);

    mapRef.current = map;

    // Initialize Cluster Group
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 0.5,
      iconCreateFunction: function (cluster) {
        const childCount = cluster.getChildCount();
        let c = ' marker-cluster-';
        if (childCount < 10) {
          c += 'small';
        } else if (childCount < 100) {
          c += 'medium';
        } else {
          c += 'large';
        }
        return new L.DivIcon({
          html: '<div><span>' + childCount + '</span></div>',
          className: 'marker-cluster' + c,
          iconSize: new L.Point(20, 20)
        });
      }
    });
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Zoom Listener for TCP Visibility
    map.on('zoomend', () => {
      const zoom = map.getZoom();

      checkpointMarkersRef.current.forEach((layer: any) => {
        // Retrieve custom data attached to marker if possible, or check icon URL/HTML?
        // Better: we can't easily check marker properties here without storing metadata.
        // Quick fix: Check if the icon HTML contains "AP" (Airport) or color blue.
        const iconHtml = layer.options.icon.options.html;
        const isAirport = iconHtml.includes('AP');

        // Show Airports at Zoom > 6, Regular TCPs at Zoom > 10
        const shouldShow = isAirport ? zoom > 9 : zoom > 10;

        if (shouldShow) {
          if (!map.hasLayer(layer)) layer.addTo(map);
        } else {
          if (map.hasLayer(layer)) layer.remove();
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update layers (Markers + Routes + Checkpoints) when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Separate Assets: Clustered (Available/Static) vs Non-Clustered (In Convoy/Busy)
    const staticAssets = assets.filter(a => !a.convoy_id);
    const movingAssets = assets.filter(a => a.convoy_id);

    // Remove old layers
    markersRef.current.forEach(layer => layer.remove());
    markersRef.current = [];
    checkpointMarkersRef.current.forEach(layer => layer.remove());
    checkpointMarkersRef.current = [];



    // --- RENDER CHECKPOINTS (TCPs) ---
    // Create markers but only add to map if zoom level is sufficient
    const currentZoom = map.getZoom();
    // Default visibility thresholds
    const showTCPsThreshold = 10;
    const showAirportsThreshold = 6;

    checkpoints.forEach(tcp => {
      const isAirport = tcp.checkpoint_type.includes('Airport') || tcp.checkpoint_type.includes('Airbase') || tcp.checkpoint_type.includes('AFS');
      const badgeColor = isAirport ? '#3b82f6' : '#ef4444';
      const badgeText = isAirport ? 'AP' : 'TC';

      const iconHtml = `
          <div style="
            background: ${badgeColor}; 
            border: 2px solid white; 
            color: white; 
            width: 24px; 
            height: 24px; 
            border-radius: 4px;
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
          ">
            ${badgeText}
          </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-tcp-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([tcp.lat, tcp.long], { icon });

      // Only add to map if zoom is sufficient
      const isVisible = isAirport ? currentZoom > showAirportsThreshold : currentZoom > showTCPsThreshold;

      if (isVisible) {
        marker.addTo(map);
      }
      checkpointMarkersRef.current.push(marker);

      marker.bindPopup(`
            <div style="font-family: system-ui; min-width: 150px; background: #0f172a; color: white; border: 1px solid #334155; padding: 10px; border-radius: 6px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px; color: ${badgeColor};">${tcp.name}</div>
                <div style="color: #94a3b8; font-size: 11px;">${tcp.location_name || ''}</div>
                <div style="font-size: 10px; color: #cbd5e1; margin-top:5px; border-top: 1px solid #334155; padding-top: 5px;">
                   <div>📋 Type: <b>${tcp.checkpoint_type}</b></div>
                   <div>👮 In-Charge: <b>${tcp.tcp_incharge || 'N/A'}</b></div>
                   <div>🏗️ Capacity: <b>${tcp.capacity} veh</b></div>
                   ${tcp.upcoming_convoys && tcp.upcoming_convoys.length > 0 ?
          `<div style="margin-top:5px; color:#fbbf24;">⚠️ Upcoming: ${tcp.upcoming_convoys.length} Convoy(s)</div>` :
          `<div style="margin-top:5px; color:#10b981;">✅ No Traffic/Convoys</div>`
        }
                </div>
            </div>
        `);
    });

    // --- RENDER ROUTES ---
    routes.forEach(route => {
      // Only show route if it is selected
      if (route.id !== selectedRouteId) return;

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

    // --- RENDER MOVING ASSETS (NO CLUSTER) ---
    movingAssets.forEach(asset => {
      if (asset.current_lat && asset.current_long) {
        const color = asset.is_available ? '#10b981' : '#f59e0b';
        const bearing = asset.bearing || 0;
        const iconHtml = `
              <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transform: rotate(${bearing}deg); transition: transform 0.3s ease-out;">
                <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 16px solid ${color}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></div>
                <div style="position: absolute; width: 4px; height: 4px; background: white; border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%);"></div>
              </div>
            `;
        const icon = L.divIcon({ html: iconHtml, className: 'custom-vehicle-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
        const marker = L.marker([asset.current_lat, asset.current_long], { icon }).addTo(map);

        // Click Handler: Show associated Route
        marker.on('click', () => {
          if (asset.convoy_id) {
            const convoy = convoys.find(c => c.id === asset.convoy_id);
            if (convoy && convoy.route_id) {
              setSelectedRouteId(convoy.route_id);
              // Also open popup?
              marker.openPopup();
            }
          }
        });

        const popupContent = `
              <div style="font-family: system-ui; min-width: 150px; background: #0f172a; color: white; border: 1px solid #334155; padding: 10px; border-radius: 6px;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 5px;">${asset.name}</div>
                <div style="color: #94a3b8; font-size: 11px;">${asset.asset_type}</div>
                <div style="font-size: 10px; color: #64748b;">Heading: ${Math.round(bearing)}°</div>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155;">
                  <span style="color: ${asset.is_available ? '#10b981' : '#f59e0b'}; font-weight: bold; font-size: 12px;">${asset.is_available ? '● Available' : '● Busy'}</span>
                </div>
              </div>
            `;
        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      }
    });

    // --- RENDER STATIC ASSETS (CLUSTERED) ---
    const currentStaticJson = JSON.stringify(staticAssets.map(a => ({ id: a.id, lat: a.current_lat, long: a.current_long, status: a.is_available })));
    if (currentStaticJson !== prevStaticAssetsJson.current) {
      prevStaticAssetsJson.current = currentStaticJson;
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        staticAssets.forEach(asset => {
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
            }); // Do NOT add to map directly

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

            // Add to Cluster Group
            if (clusterGroupRef.current) {
              clusterGroupRef.current.addLayer(marker);
            }
          }
        });
      }
    }



    // --- RENDER DRAFT MARKERS (Draggable) ---
    if (draftRoute && onRoutePointUpdate) {
      // Start Marker
      if (draftRoute.start_lat !== 0) {
        const startMarker = L.marker([draftRoute.start_lat, draftRoute.start_long], {
          draggable: true,
          icon: L.divIcon({
            className: 'custom-start-icon',
            html: `<div style="background:#10b981; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [16, 16]
          })
        }).addTo(map);

        startMarker.on('dragend', (e) => {
          const marker = e.target as L.Marker;
          const ll = marker.getLatLng();
          onRoutePointUpdate('start', Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
        });
        markersRef.current.push(startMarker);
      }

      // End Marker
      if (draftRoute.end_lat !== 0) {
        const endMarker = L.marker([draftRoute.end_lat, draftRoute.end_long], {
          draggable: true,
          icon: L.divIcon({
            className: 'custom-end-icon',
            html: `<div style="background:#ef4444; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
            iconSize: [16, 16]
          })
        }).addTo(map);

        endMarker.on('dragend', (e) => {
          const marker = e.target as L.Marker;
          const ll = marker.getLatLng();
          onRoutePointUpdate('end', Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)));
        });
        markersRef.current.push(endMarker);
      }


    }



  }, [assets, routes, draftRoute, checkpoints, convoys, selectedRouteId]); // Re-run when data changes

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
