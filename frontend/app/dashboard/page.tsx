
'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import DashboardOverlay from '@/components/DashboardOverlay';

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
    asset_source?: string;
    is_available: boolean;
    fuel_status: number;
    current_lat?: number;
    current_long?: number;
    convoy_id?: number;
}

interface Convoy {
    id: number;
    name: string;
    start_location: string;
    end_location: string;
    status: string;
    route_id?: number;
}

interface Route {
    id: number;
    name: string;
    waypoints: number[][];
    risk_level: string;
    status: string;
}

export default function Dashboard() {
    const router = useRouter();
    const [assets, setAssets] = useState<Asset[]>([]);
    const [convoys, setConvoys] = useState<Convoy[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [checkpoints, setCheckpoints] = useState<any[]>([]); // TCPs
    const [activeTab, setActiveTab] = useState<'assets' | 'convoys'>('assets');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Search State for Sidebar
    const [assetSearch, setAssetSearch] = useState('');
    const [convoySearch, setConvoySearch] = useState('');

    // Lifted Route Form State for Draggable Markers
    const [routeForm, setRouteForm] = useState({
        name: '',
        start_lat: 0,
        start_long: 0,
        end_lat: 0,
        end_long: 0
    });

    // Handler for map clicks/drags to update form
    const handleRoutePointUpdate = (point: 'start' | 'end', lat: number, lng: number) => {
        setRouteForm(prev => ({
            ...prev,
            [point === 'start' ? 'start_lat' : 'end_lat']: lat,
            [point === 'start' ? 'start_long' : 'end_long']: lng
        }));
    };

    useEffect(() => {
        // Auth Check
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const fetchData = async () => {
            try {
                const [assetRes, convoyRes, routeRes, checkpointRes] = await Promise.all([
                    fetch(`${API_BASE}/assets/`),
                    fetch(`${API_BASE}/convoys/`),
                    fetch(`${API_BASE}/routes/`),
                    fetch(`${API_BASE}/checkpoints/`)
                ]);
                if (assetRes.ok) setAssets(await assetRes.json());
                if (convoyRes.ok) setConvoys(await convoyRes.json());
                if (routeRes.ok) setRoutes(await routeRes.json());
                if (checkpointRes.ok) setCheckpoints(await checkpointRes.json());
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
                <MapComponent
                    assets={assets}
                    routes={routes}
                    convoys={convoys}
                    checkpoints={checkpoints}
                    draftRoute={routeForm}
                    onRoutePointUpdate={handleRoutePointUpdate}
                />
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
                        Transport
                        <span style={{
                            backgroundImage: 'linear-gradient(135deg, #79d835ff 20%, #197b2090 40%, #708238 60%, #1a1a1a 80%)',
                            backgroundSize: '300% 300%',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontWeight: '900',
                            marginLeft: 2,
                            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'
                        }}>
                            Radar
                        </span>
                        24
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        onClick={async () => {
                            try {
                                await fetch(`${API_BASE}/routes/analyze-risk`, { method: 'POST' });
                            } catch (e) {
                                console.error(e);
                            }
                        }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#ef4444',
                            padding: '5px 12px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5
                        }}
                    >
                        <span></span> SCAN THREATS
                    </button>

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

                    {/* ASSETS TAB */}
                    {activeTab === 'assets' && (
                        <>
                            <div style={{ marginBottom: 10, padding: '0 5px' }}>
                                <input
                                    type="text"
                                    placeholder="Search Assets..."
                                    value={assetSearch}
                                    onChange={(e) => setAssetSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'rgba(0,0,0,0.3)',
                                        color: 'white',
                                        fontSize: 12
                                    }}
                                />
                            </div>
                            {assets.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()) || a.asset_type.toLowerCase().includes(assetSearch.toLowerCase())).map((asset, i) => (
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
                        </>
                    )}

                    {/* CONVOYS TAB */}
                    {activeTab === 'convoys' && (
                        <>
                            <div style={{ marginBottom: 10, padding: '0 5px' }}>
                                <input
                                    type="text"
                                    placeholder="Search Convoys..."
                                    value={convoySearch}
                                    onChange={(e) => setConvoySearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'rgba(0,0,0,0.3)',
                                        color: 'white',
                                        fontSize: 12
                                    }}
                                />
                            </div>
                            {convoys.filter(c => c.name.toLowerCase().includes(convoySearch.toLowerCase()) || c.start_location.toLowerCase().includes(convoySearch.toLowerCase())).map((convoy) => (
                                <div
                                    key={convoy.id}
                                    onClick={() => router.push(`/convoys/${convoy.id}`)}
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 10,
                                        padding: 12,
                                        marginBottom: 8,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                >
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
                        </>
                    )}
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

            {/* MANUAL ENTRY OVERLAY */}
            <DashboardOverlay
                routeForm={routeForm}
                setRouteForm={setRouteForm}
            />
        </div>
    );
}
