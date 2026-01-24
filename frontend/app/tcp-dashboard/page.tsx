'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Droplet, Users, CheckCircle, ArrowLeft, Fuel, Truck, AlertTriangle, Clock, Search, Wrench, Thermometer, BatteryCharging, HeartPulse } from 'lucide-react';

export default function TcpDashboard() {
    const router = useRouter();
    const [indents, setIndents] = useState<any[]>([]);
    const [idleAssets, setIdleAssets] = useState<any[]>([]);
    const [checkpoints, setCheckpoints] = useState<any[]>([]);

    // State for Selection & Search
    const [selectedTcpId, setSelectedTcpId] = useState<number>(1);
    const [tcpSearch, setTcpSearch] = useState('');

    // Dummy Resources Data (Local State for Demo)
    const [resources, setResources] = useState({
        medic: true,
        fuel: true,
        mechanic: false,
        tyre_inflater: true
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/');
            return;
        }

        const fetchInitData = async () => {
            try {
                // Fetch All Checkpoints for Sidebar Search
                const cpRes = await fetch('http://localhost:8000/api/v1/checkpoints/');
                if (cpRes.ok) {
                    const data = await cpRes.json();
                    setCheckpoints(data);
                    if (data.length > 0 && !selectedTcpId) setSelectedTcpId(data[0].id);
                }
            } catch (e) { console.error(e); }
        };
        fetchInitData();
    }, []);

    useEffect(() => {
        if (!selectedTcpId) return;

        const fetchData = async () => {
            try {
                // Fetch Logistics
                const logRes = await fetch('http://localhost:8000/api/v1/logistics/pending');
                if (logRes.ok) setIndents(await logRes.json());

                // Fetch Idle Assets for Selected TCP
                const assetRes = await fetch(`http://localhost:8000/api/v1/assets/?checkpoint_id=${selectedTcpId}`);
                if (assetRes.ok) setIdleAssets(await assetRes.json());

                // Randomize Dummy Resources when switching TCPs to simulate real data
                setResources({
                    medic: Math.random() > 0.5,
                    fuel: Math.random() > 0.3,
                    mechanic: Math.random() > 0.5,
                    tyre_inflater: Math.random() > 0.2
                });

            } catch (e) {
                console.error(e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [selectedTcpId, router]);

    const selectedTcp = checkpoints.find(c => c.id === selectedTcpId) || { name: 'Unknown TCP', location_name: 'Unknown' };

    // Filter Indents by Location? 
    // Currently backend returns *all* pending. Ideally we filter client-side if we can't filter server-side yet.
    // Based on `location_id` in indent.
    const logisticsRequests = indents.filter(i => i.request_type !== 'OVERSTAY' && (!i.location_id || i.location_id === selectedTcpId));
    const overstayRequests = indents.filter(i => i.request_type === 'OVERSTAY' && (!i.location_id || i.location_id === selectedTcpId));

    const toggleResource = (key: keyof typeof resources) => {
        setResources(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div style={{ height: '100vh', background: '#020617', color: 'white', display: 'flex', fontFamily: 'system-ui, sans-serif' }}>
            {/* Sidebar */}
            <div style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '30px', color: '#3b82f6', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Package /> TCP COMMAND
                </div>

                {/* Search / Select TCP */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>Select Station</div>
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="Search TCP..."
                            value={tcpSearch}
                            onChange={(e) => setTcpSearch(e.target.value)}
                            style={{ width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', padding: '8px 8px 8px 32px', borderRadius: '6px', color: 'white', fontSize: '13px' }}
                        />
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {checkpoints.filter(c => c.name.toLowerCase().includes(tcpSearch.toLowerCase())).map(cp => (
                            <button
                                key={cp.id}
                                onClick={() => setSelectedTcpId(cp.id)}
                                style={{
                                    textAlign: 'left', padding: '10px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer',
                                    background: selectedTcpId === cp.id ? '#1e293b' : 'transparent',
                                    border: selectedTcpId === cp.id ? '1px solid #3b82f6' : '1px solid transparent',
                                    color: selectedTcpId === cp.id ? 'white' : '#94a3b8'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>{cp.name}</div>
                                <div style={{ fontSize: '11px', opacity: 0.7 }}>{cp.location_name}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ marginTop: 'auto' }}>
                    <div style={{ padding: '15px', background: '#1e293b', borderRadius: '8px', marginBottom: '20px' }}>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>Active Station</div>
                        <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#eab308' }}>{selectedTcp.name}</div>
                    </div>

                    <button onClick={() => router.push('/dashboard')} style={{ width: '100%', padding: '12px', marginBottom: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer', textAlign: 'left' }}>
                        Main Map
                    </button>
                    <button onClick={() => router.push('/')} style={{ width: '100%', padding: '12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <ArrowLeft size={16} /> Logout
                    </button>
                </div>
            </div>

            {/* Main Content Grid */}
            <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
                <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedTcp.name} Overview</h1>
                        <p style={{ color: '#94a3b8' }}>Managing logistics, assets, and halts for {selectedTcp.location_name}.</p>
                    </div>
                    {/* RESOURCES SECTION (HEADER/TOP WIDGET) */}
                    <div style={{ display: 'flex', gap: '15px' }}>
                        {[
                            { id: 'medic', label: 'Medic', icon: HeartPulse, active: resources.medic },
                            { id: 'fuel', label: 'Fuel Pump', icon: Fuel, active: resources.fuel },
                            { id: 'mechanic', label: 'Mechanic', icon: Wrench, active: resources.mechanic },
                            { id: 'tyre_inflater', label: 'Tyre Inflater', icon: DiscIcon, active: resources.tyre_inflater } // DiscIcon as placeholder or Circle
                        ].map((res) => (
                            <div
                                key={res.id}
                                onClick={() => toggleResource(res.id as any)}
                                style={{
                                    background: '#0f172a', border: res.active ? '1px solid #10b981' : '1px solid #334155',
                                    padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', minWidth: '100px',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px'
                                }}>
                                <res.icon size={20} color={res.active ? '#10b981' : '#64748b'} />
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: res.active ? 'white' : '#64748b' }}>{res.label}</div>
                                <div style={{ fontSize: '10px', color: res.active ? '#10b981' : '#ef4444' }}>{res.active ? 'AVAILABLE' : 'OFFLINE'}</div>
                            </div>
                        ))}
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>

                    {/* COLUMN 1: LOGISTICS INTIMATIONS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#eab308' }}>
                            <Droplet size={18} /> Logistics Intimations
                        </h2>
                        {logisticsRequests.length === 0 && <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px', background: '#0f172a', borderRadius: '8px', textAlign: 'center' }}>No incoming requests for this station.</div>}
                        {logisticsRequests.map((indent) => (
                            <div key={indent.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#eab308' }}>Convoy #{indent.convoy_id}</span>
                                    <span style={{ fontSize: '11px', background: '#1e293b', padding: '2px 8px', borderRadius: '4px' }}>ETA: 1400 hrs</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                                    <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Diesel</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{indent.fuel_diesel_liters} L</div>
                                    </div>
                                    <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Billeting</div>
                                        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{indent.accommodation_personnel} Pax</div>
                                    </div>
                                </div>
                                <button style={{ width: '100%', padding: '10px', background: '#10b981', color: '#020617', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    Acknowledge
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* COLUMN 2: IDLE ASSETS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6' }}>
                            <Truck size={18} /> Idle Assets (On Station)
                        </h2>
                        {idleAssets.length === 0 && <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px', background: '#0f172a', borderRadius: '8px', textAlign: 'center' }}>No assets parked at this station.</div>}
                        {idleAssets.map((asset) => (
                            <div key={asset.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '15px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '40px', height: '40px', background: '#1e293b', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                    <Truck size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>{asset.name}</div>
                                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{asset.asset_type} • {asset.capacity_tons} Tons</div>
                                </div>
                                <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>READY</div>
                            </div>
                        ))}
                    </div>

                    {/* COLUMN 3: OVERSTAY REQUESTS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#f43f5e' }}>
                            <AlertTriangle size={18} /> Overstay Requests
                        </h2>
                        {overstayRequests.length === 0 && <div style={{ color: '#64748b', fontStyle: 'italic', padding: '20px', background: '#0f172a', borderRadius: '8px', textAlign: 'center' }}>No active halt requests.</div>}
                        {overstayRequests.map((req) => (
                            <div key={req.id} style={{ background: '#1f1212', border: '1px solid #450a0a', borderRadius: '12px', padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontWeight: 'bold', color: '#f43f5e' }}>Convoy #{req.convoy_id}</span>
                                    <Clock size={16} color="#f43f5e" />
                                </div>
                                <div style={{ marginBottom: '15px', fontSize: '13px', color: '#fda4af', fontStyle: 'italic' }}>
                                    "{req.remarks || 'Requesting unscheduled halt due to technical issues / weather.'}"
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button style={{ flex: 1, padding: '8px', background: '#10b981', border: 'none', borderRadius: '6px', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>Approve</button>
                                    <button style={{ flex: 1, padding: '8px', background: '#dc2626', border: 'none', borderRadius: '6px', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Icon component placeholder if needed
const DiscIcon = ({ size, color }: { size: number, color: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
