'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, MapPin, Search, Truck, Calendar, Clock } from 'lucide-react';

export default function NewConvoyPage() {
    const router = useRouter();
    const [assets, setAssets] = useState<any[]>([]);
    const [startSearchResults, setStartSearchResults] = useState<any[]>([]);
    const [endSearchResults, setEndSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [view, setView] = useState<'input' | 'review'>('input');
    const [generatedPlan, setGeneratedPlan] = useState<any>(null);
    const [existingRoutes, setExistingRoutes] = useState<any[]>([]); // NEW: Store routes
    const [transitCamps, setTransitCamps] = useState<any[]>([]); // NEW: Store Transit Camps

    const [form, setForm] = useState({
        name: '',
        start_location: '',
        end_location: '',
        start_lat: 0,
        start_long: 0,
        end_lat: 0,
        end_long: 0,
        start_time: '',
        estimated_arrival_time: '',
        asset_ids: [] as number[],
        route_id: null as number | null
    });

    useEffect(() => {
        // Fetch Assets
        fetch('http://localhost:8000/api/v1/assets/')
            .then(res => res.json())
            .then(data => setAssets(data))
            .catch(err => console.error(err));

        // Fetch Routes
        fetch('http://localhost:8000/api/v1/routes/')
            .then(res => res.json())
            .then(data => setExistingRoutes(data))
            .catch(err => console.error(err));

        // Fetch Checkpoints (Transit Camps)
        fetch('http://localhost:8000/api/v1/checkpoints/')
            .then(res => res.json())
            .then(data => {
                const camps = data.filter((cp: any) => cp.checkpoint_type.includes('Transit Camp'));
                setTransitCamps(camps);
            })
            .catch(err => console.error(err));
    }, []);

    const handleSearch = async (query: string, type: 'start' | 'end') => {
        if (!query || query.length < 3) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await res.json();
            if (type === 'start') setStartSearchResults(data);
            else setEndSearchResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleAsset = (id: number) => {
        const current = form.asset_ids;
        if (current.includes(id)) {
            setForm({ ...form, asset_ids: current.filter(x => x !== id) });
        } else {
            setForm({ ...form, asset_ids: [...current, id] });
        }
    };

    // Updated Submit -> Generate Plan
    const handleGeneratePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // For now, we create the convoy in DRAFT/PLANNED state as a "Plan"
            // In a real system, we might hit a specific /plan endpoint, but create works for now.
            const res = await fetch('http://localhost:8000/api/v1/convoys/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                const plan = await res.json();
                setGeneratedPlan(plan);
                setView('review');
            } else {
                alert('Failed to generate plan');
            }
        } catch (err) {
            console.error(err);
            alert('Error generating plan');
        }
    };

    const handleConfirm = () => {
        // Here we could call an update endpoint to set status='CONFIRMED'
        // For now, we assume the plan is accepted.
        alert('Convoy Mission Confirmed & Initiated!');
        router.push('/');
    };

    if (view === 'review' && generatedPlan) {
        return (
            <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px', color: '#eab308' }}>Review Generated Plan</h1>

                    <div style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{generatedPlan.name}</h2>
                                <div style={{ color: '#94a3b8' }}>{generatedPlan.start_location} ➝ {generatedPlan.end_location}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{generatedPlan.route?.risk_level || 'LOW'} RISK</div>
                                <div style={{ color: '#94a3b8', fontSize: '12px' }}>AI ANALYSIS</div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px', background: '#0f172a', padding: '15px', borderRadius: '8px' }}>
                            <div>
                                <label style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>DEPARTURE</label>
                                <div>{new Date(generatedPlan.start_time).toLocaleString()}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>EST. ARRIVAL</label>
                                <div>{generatedPlan.estimated_arrival_time ? new Date(generatedPlan.estimated_arrival_time).toLocaleString() : 'N/A'}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>ASSETS</label>
                                <div>{generatedPlan.assets?.length || 0} Vehicles</div>
                            </div>
                        </div>

                        {/* Route Waypoints Visualization Placeholder */}
                        <div style={{ height: '200px', background: '#020617', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155', color: '#475569' }}>
                            Map Visualization of {generatedPlan.route ? generatedPlan.route.waypoints.length : 0} Waypoints
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button
                            onClick={() => setView('input')}
                            style={{ flex: 1, padding: '15px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Back to Edit
                        </button>
                        <button
                            onClick={handleConfirm}
                            style={{ flex: 2, padding: '15px', background: '#10b981', border: 'none', color: 'black', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                        >
                            Confirm & Execute Mission
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Plan New Convoy</h1>
                </header>

                <form onSubmit={handleGeneratePlan} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>

                    {/* LEFT COLUMN - MAIN DETAILS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                        {/* BASIC INFO */}
                        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <h2 style={{ fontSize: '20px', marginBottom: '25px', color: '#eab308' }}>Mission Details</h2>
                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Convoy ID / Name</label>
                                <input
                                    type="text" required
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. CVY-Alpha-01"
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                    style={{ color: 'white', fontSize: '16px' }}
                                />
                            </div>

                            {/* TIMING */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Departure Time</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a', padding: '12px', borderRadius: '12px', border: '1px solid #475569' }}>
                                        <Calendar size={20} color="#94a3b8" />
                                        <input
                                            type="datetime-local"
                                            value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '16px', width: '100%', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Est. Arrival (End Point)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a', padding: '12px', borderRadius: '12px', border: '1px solid #475569' }}>
                                        <Clock size={20} color="#94a3b8" />
                                        <input
                                            type="datetime-local"
                                            value={form.estimated_arrival_time} onChange={e => setForm({ ...form, estimated_arrival_time: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '16px', width: '100%', outline: 'none' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ROUTING */}
                        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <h2 style={{ fontSize: '20px', marginBottom: '25px', color: '#3b82f6' }}>Route Planning</h2>

                            {/* PRE-EXISTING ROUTE SELECTOR */}
                            <div style={{ marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px dashed #334155' }}>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Select Existing Route (Optional)</label>
                                <select
                                    value={form.route_id || ''}
                                    onChange={(e) => {
                                        const rId = e.target.value ? parseInt(e.target.value) : null;
                                        const route = existingRoutes.find(r => r.id === rId);
                                        setForm({
                                            ...form,
                                            route_id: rId,
                                            // Auto-fill required fields to satisfy backend schema if they are empty
                                            start_location: route ? `(Route) Start of ${route.name}` : form.start_location,
                                            end_location: route ? `(Route) End of ${route.name}` : form.end_location,
                                            // Extract lat/long from route waypoints if available
                                            start_lat: route?.waypoints?.[0]?.[0] || form.start_lat,
                                            start_long: route?.waypoints?.[0]?.[1] || form.start_long,
                                            end_lat: route?.waypoints?.at(-1)?.[0] || form.end_lat,
                                            end_long: route?.waypoints?.at(-1)?.[1] || form.end_long
                                        });
                                    }}
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                    style={{ color: 'white', fontSize: '16px' }}
                                >
                                    <option value="">-- Auto-Plan New Route --</option>
                                    {existingRoutes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} ({r.risk_level} RISK)</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ opacity: form.route_id ? 0.5 : 1, pointerEvents: form.route_id ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
                                <div style={{ fontSize: '14px', color: '#eab308', marginBottom: '15px' }}>
                                    {form.route_id ? '⚠ Manual entry disabled because an existing route is selected.' : 'Or manually specify start/end points:'}
                                </div>
                                {/* START POINT */}
                                <div style={{ marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Start Point</label>
                                        {transitCamps.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    const camp = transitCamps.find(c => c.name === e.target.value);
                                                    if (camp) {
                                                        setForm({ ...form, start_location: camp.name, start_lat: camp.lat, start_long: camp.long });
                                                    }
                                                }}
                                                style={{ background: '#0f172a', color: '#f97316', border: '1px solid #f97316', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}
                                            >
                                                <option value="">Quick Select: Transit Camp</option>
                                                {transitCamps.map(tc => <option key={tc.id} value={tc.name}>{tc.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <MapPin size={20} style={{ position: 'absolute', top: '16px', left: '16px', color: '#64748b' }} />
                                            <input
                                                type="text"
                                                value={form.start_location} onChange={e => setForm({ ...form, start_location: e.target.value })}
                                                placeholder="Search Start City..."
                                                className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 pl-12 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                                style={{ color: 'white', fontSize: '16px' }}
                                            />
                                        </div>
                                        <button type="button" onClick={() => handleSearch(form.start_location, 'start')} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', padding: '0 25px', cursor: 'pointer' }}>
                                            <Search size={22} />
                                        </button>
                                    </div>
                                    {startSearchResults.length > 0 && (
                                        <div style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: '12px', marginTop: '10px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                                            {startSearchResults.map((res, idx) => (
                                                <div key={idx} onClick={() => {
                                                    setForm({ ...form, start_location: res.display_name.split(',')[0], start_lat: parseFloat(res.lat), start_long: parseFloat(res.lon) });
                                                    setStartSearchResults([]);
                                                }} style={{ padding: '15px', fontSize: '14px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }} className="hover:bg-slate-800">
                                                    {res.display_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* DESTINATION */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Destination</label>
                                        {transitCamps.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    const camp = transitCamps.find(c => c.name === e.target.value);
                                                    if (camp) {
                                                        setForm({ ...form, end_location: camp.name, end_lat: camp.lat, end_long: camp.long });
                                                    }
                                                }}
                                                style={{ background: '#0f172a', color: '#f97316', border: '1px solid #f97316', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}
                                            >
                                                <option value="">Quick Select: Transit Camp</option>
                                                {transitCamps.map(tc => <option key={tc.id} value={tc.name}>{tc.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <div style={{ flex: 1, position: 'relative' }}>
                                            <MapPin size={20} style={{ position: 'absolute', top: '16px', left: '16px', color: '#64748b' }} />
                                            <input
                                                type="text"
                                                value={form.end_location} onChange={e => setForm({ ...form, end_location: e.target.value })}
                                                placeholder="Search Destination..."
                                                className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 pl-12 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                                style={{ color: 'white', fontSize: '16px' }}
                                            />
                                        </div>
                                        <button type="button" onClick={() => handleSearch(form.end_location, 'end')} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', padding: '0 25px', cursor: 'pointer' }}>
                                            <Search size={22} />
                                        </button>
                                    </div>
                                    {endSearchResults.length > 0 && (
                                        <div style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: '12px', marginTop: '10px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                                            {endSearchResults.map((res, idx) => (
                                                <div key={idx} onClick={() => {
                                                    setForm({ ...form, end_location: res.display_name.split(',')[0], end_lat: parseFloat(res.lat), end_long: parseFloat(res.lon) });
                                                    setEndSearchResults([]);
                                                }} style={{ padding: '15px', fontSize: '14px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }} className="hover:bg-slate-800">
                                                    {res.display_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - ASSETS & SUBMIT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <h2 style={{ fontSize: '20px', marginBottom: '25px', color: '#10b981' }}>Allocated Assets</h2>
                            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '15px' }}>Select vehicles to assign to this convoy.</p>

                            <div className="custom-scrollbar" style={{ flex: 1, maxHeight: '400px', overflowY: 'auto', background: '#0f172a', borderRadius: '12px', border: '1px solid #475569', padding: '15px' }}>
                                {assets.map(asset => (
                                    <div key={asset.id} onClick={() => toggleAsset(asset.id)} style={{
                                        display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', marginBottom: '8px',
                                        background: form.asset_ids.includes(asset.id) ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                        border: form.asset_ids.includes(asset.id) ? '1px solid #10b981' : '1px solid transparent',
                                        borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s'
                                    }}>
                                        <Truck size={20} color={form.asset_ids.includes(asset.id) ? '#10b981' : '#64748b'} />
                                        <div>
                                            <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{asset.name}</div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{asset.asset_type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="submit" style={{
                                marginTop: '30px', width: '100%', padding: '20px',
                                background: 'linear-gradient(to right, #eab308, #ca8a04)',
                                color: 'black', fontWeight: 'bold', fontSize: '18px', border: 'none', borderRadius: '12px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                boxShadow: '0 4px 6px -1px rgba(234, 179, 8, 0.3)'
                            }}>
                                <Save size={24} />
                                Generate Plan
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
