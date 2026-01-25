'use client';

import { useState, useEffect, use } from 'react';
import dynamic from 'next/dynamic';

// Dynamic Map Import
const MapComponent = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div style={{ background: '#020617', height: '100%', width: '100%' }} />
});

export default function ConvoyDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [convoy, setConvoy] = useState<any>(null);
    const [checkpoints, setCheckpoints] = useState<any[]>([]); // NEW: Checkpoints state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch convoy with polling for live updates
    useEffect(() => {
        const fetchConvoy = async () => {
            try {
                const res = await fetch(`http://localhost:8000/api/v1/convoys/${resolvedParams.id}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                setConvoy(data);
                setLoading(false);
            } catch (e: any) {
                console.error('Fetch error:', e);
                setError(e.message);
                setLoading(false);
            }
        };

        fetchConvoy(); // Initial fetch
        const interval = setInterval(fetchConvoy, 2000); // Poll every 2s for live updates

        return () => clearInterval(interval);
    }, [resolvedParams.id]);

    // Fetch all checkpoints once
    useEffect(() => {
        fetch('http://localhost:8000/api/v1/checkpoints/')
            .then(res => res.json())
            .then(data => setCheckpoints(data))
            .catch(err => console.error('Checkpoint fetch error:', err));
    }, []);

    if (loading) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                fontFamily: 'monospace',
                fontSize: '18px'
            }}>
                LOADING CONVOY {resolvedParams.id}...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                background: '#0f172a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                fontFamily: 'monospace'
            }}>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>ERROR</div>
                <div>{error}</div>
            </div>
        );
    }

    if (!convoy) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
                fontFamily: 'monospace'
            }}>
                CONVOY NOT FOUND
            </div>
        );
    }

    const assets = convoy.assets || [];
    const route = convoy.route ? [convoy.route] : [];

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100vw', background: '#0f172a', overflow: 'hidden' }}>

            {/* MAP LAYER - Now with checkpoints and live updates */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}>
                <MapComponent
                    assets={assets}
                    routes={route}
                    convoys={[convoy]}
                    checkpoints={checkpoints}
                    initialSelectedRouteId={convoy.route_id}
                />
            </div>

            {/* OVERLAY CONTENT */}
            <div style={{
                position: 'absolute',
                zIndex: 10,
                padding: '20px',
                pointerEvents: 'none',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                gap: '20px'
            }}>

                {/* INFO PANEL */}
                <div style={{
                    pointerEvents: 'auto',
                    background: 'rgba(15, 23, 42, 0.90)',
                    padding: '25px',
                    borderRadius: '12px',
                    color: 'white',
                    width: '400px',
                    height: 'fit-content',
                    maxHeight: '100%',
                    overflowY: 'auto',
                    border: '1px solid #334155',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                        <button onClick={() => window.location.href = '/dashboard'} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'none', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            ← BACK TO DASHBOARD
                        </button>
                        <h1 style={{ fontSize: '24px', margin: '10px 0 5px 0', color: '#10b981', fontFamily: 'system-ui' }}>
                            {convoy.name}
                        </h1>
                        <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                            {convoy.start_location} → {convoy.end_location}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ background: '#020617', padding: '10px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Status</div>
                            <div style={{ color: '#f59e0b', fontWeight: 'bold' }}>{convoy.status}</div>
                        </div>
                        <div style={{ background: '#020617', padding: '10px', borderRadius: '6px' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>Assets</div>
                            <div style={{ color: 'white', fontWeight: 'bold' }}>{assets.length} Units</div>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '14px', marginBottom: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                        Manifest
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {assets.map((asset: any) => {
                            // Role-based color
                            let roleColor = '#10b981';
                            switch (asset.role) {
                                case 'ROP': roleColor = '#facc15'; break;
                                case 'QRT': roleColor = '#ef4444'; break;
                                case 'TECH': roleColor = '#3b82f6'; break;
                                case 'AMBULANCE': roleColor = '#d946ef'; break;
                                case 'COMMS': roleColor = '#06b6d4'; break;
                                case 'COMMANDER': roleColor = '#f59e0b'; break;
                                case 'CARGO': roleColor = '#10b981'; break;
                            }
                            return (
                                <div key={asset.id} style={{
                                    background: '#1e293b',
                                    border: '1px solid #334155',
                                    borderRadius: '6px',
                                    padding: '12px',
                                    cursor: 'pointer'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: roleColor }}>{asset.name}</div>
                                        <div style={{ fontSize: '10px', color: roleColor, fontWeight: 'bold', padding: '2px 6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px' }}>
                                            {asset.role || 'CARGO'}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                                        {asset.asset_type} • {asset.driver_name || 'No Pilot'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', fontSize: '10px', color: '#64748b' }}>
                                        <span>👥 {asset.personnel_count || 0}</span>
                                        <span>⛽ {asset.fuel_status || 0}%</span>
                                        <span>📦 {asset.capacity_tons || 0}t</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
