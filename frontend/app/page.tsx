'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for map (must be client-side only)
const MapComponent = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', background: '#0f172a' }} />
});

const API_BASE = 'http://localhost:8000/api/v1';

interface Asset {
  id: number;
  name: string;
  asset_type: string;
  is_available: boolean;
  fuel_status: number;
  current_lat?: number;
  current_long?: number;
}

interface Convoy {
  id: number;
  name: string;
  start_location: string;
  end_location: string;
  status: string;
}

export default function Home() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [convoys, setConvoys] = useState<Convoy[]>([]);
  const [activeTab, setActiveTab] = useState<'assets' | 'convoys'>('assets');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [assetRes, convoyRes] = await Promise.all([
          fetch(`${API_BASE}/assets/`),
          fetch(`${API_BASE}/convoys/`)
        ]);
        if (assetRes.ok) setAssets(await assetRes.json());
        if (convoyRes.ok) setConvoys(await convoyRes.json());
      } catch (e) {
        console.error('API Error:', e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#0f172a',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* MAP - Full Screen Background */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
        <MapComponent assets={assets} />
      </div>

      {/* HEADER BAR */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        background: 'rgba(0,0,0,0.85)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
              padding: 5
            }}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
            Transport<span style={{ color: '#eab308' }}>Radar</span>24
          </span>
        </div>
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          padding: '5px 15px',
          borderRadius: 20,
          color: '#94a3b8',
          fontSize: 12
        }}>
          {assets.length} UNITS TRACKED
        </div>
      </div>

      {/* SIDEBAR - Overlay Panel */}
      <div style={{
        position: 'absolute',
        top: 50,
        left: 0,
        bottom: 0,
        width: 350,
        background: 'rgba(0,0,0,0.9)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.5)'
        }}>
          <button
            onClick={() => setActiveTab('assets')}
            style={{
              flex: 1,
              padding: '15px 0',
              background: activeTab === 'assets' ? 'rgba(234,179,8,0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'assets' ? '2px solid #eab308' : '2px solid transparent',
              color: activeTab === 'assets' ? '#eab308' : '#64748b',
              fontWeight: 'bold',
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab('convoys')}
            style={{
              flex: 1,
              padding: '15px 0',
              background: activeTab === 'convoys' ? 'rgba(234,179,8,0.2)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'convoys' ? '2px solid #eab308' : '2px solid transparent',
              color: activeTab === 'convoys' ? '#eab308' : '#64748b',
              fontWeight: 'bold',
              fontSize: 12,
              cursor: 'pointer',
              textTransform: 'uppercase'
            }}
          >
            Convoys
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 10 }}>
          {activeTab === 'assets' && assets.map((asset, i) => (
            <div key={asset.id} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 8,
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{asset.name}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{asset.asset_type}</div>
                </div>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: asset.is_available ? '#10b981' : '#f59e0b'
                }} />
              </div>
              <div style={{ display: 'flex', gap: 15, fontSize: 10, color: '#64748b' }}>
                <span>Fuel: {asset.fuel_status}%</span>
                <span>Pos: {asset.current_lat?.toFixed(2)}, {asset.current_long?.toFixed(2)}</span>
              </div>
            </div>
          ))}

          {activeTab === 'convoys' && convoys.map((convoy) => (
            <div key={convoy.id} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{convoy.name}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 'bold',
                  background: convoy.status === 'IN_TRANSIT' ? 'rgba(234,179,8,0.2)' : 'rgba(59,130,246,0.2)',
                  color: convoy.status === 'IN_TRANSIT' ? '#eab308' : '#3b82f6'
                }}>
                  {convoy.status === 'IN_TRANSIT' ? 'LIVE' : 'PLAN'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                {convoy.start_location} → {convoy.end_location}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: 15,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#64748b'
        }}>
          <span>Assets: {assets.length}</span>
          <span>Convoys: {convoys.length}</span>
          <span style={{ color: '#10b981' }}>● LIVE</span>
        </div>
      </div>
    </div>
  );
}
