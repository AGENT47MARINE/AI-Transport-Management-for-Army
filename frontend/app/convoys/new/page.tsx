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
        asset_ids: [] as number[]
    });

    useEffect(() => {
        fetch('http://localhost:8000/api/v1/assets/')
            .then(res => res.json())
            .then(data => setAssets(data))
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/v1/convoys/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    // Ensure non-zero lat/longs or nulls if you prefer, backend handles it
                })
            });
            if (res.ok) {
                alert('Convoy Plan Created Successfully!');
                router.push('/');
            } else {
                alert('Failed to create convoy');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating convoy');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Plan New Convoy</h1>
                </header>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

                    {/* LEFT COLUMN - MAIN DETAILS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* BASIC INFO */}
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#eab308' }}>Mission Details</h2>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Convoy ID / Name</label>
                                <input
                                    type="text" required
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. CVY-Alpha-01"
                                    style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}
                                />
                            </div>

                            {/* TIMING */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Departure Time</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #475569' }}>
                                        <Calendar size={16} color="#94a3b8" />
                                        <input
                                            type="datetime-local"
                                            value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '14px', width: '100%' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Est. Arrival (End Point)</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0f172a', padding: '10px', borderRadius: '8px', border: '1px solid #475569' }}>
                                        <Clock size={16} color="#94a3b8" />
                                        <input
                                            type="datetime-local"
                                            value={form.estimated_arrival_time} onChange={e => setForm({ ...form, estimated_arrival_time: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '14px', width: '100%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ROUTING */}
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#3b82f6' }}>Route Planning</h2>

                            {/* START POINT */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Start Point</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <MapPin size={16} style={{ position: 'absolute', top: '14px', left: '12px', color: '#64748b' }} />
                                        <input
                                            type="text"
                                            value={form.start_location} onChange={e => setForm({ ...form, start_location: e.target.value })}
                                            placeholder="Search Start City..."
                                            style={{ width: '100%', padding: '12px 12px 12px 36px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}
                                        />
                                    </div>
                                    <button type="button" onClick={() => handleSearch(form.start_location, 'start')} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 20px', cursor: 'pointer' }}>
                                        <Search size={18} />
                                    </button>
                                </div>
                                {startSearchResults.length > 0 && (
                                    <div style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {startSearchResults.map((res, idx) => (
                                            <div key={idx} onClick={() => {
                                                setForm({ ...form, start_location: res.display_name.split(',')[0], start_lat: parseFloat(res.lat), start_long: parseFloat(res.lon) });
                                                setStartSearchResults([]);
                                            }} style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }} className="hover:bg-slate-800">
                                                {res.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* DESTINATION */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Destination</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1, position: 'relative' }}>
                                        <MapPin size={16} style={{ position: 'absolute', top: '14px', left: '12px', color: '#64748b' }} />
                                        <input
                                            type="text"
                                            value={form.end_location} onChange={e => setForm({ ...form, end_location: e.target.value })}
                                            placeholder="Search Destination..."
                                            style={{ width: '100%', padding: '12px 12px 12px 36px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}
                                        />
                                    </div>
                                    <button type="button" onClick={() => handleSearch(form.end_location, 'end')} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 20px', cursor: 'pointer' }}>
                                        <Search size={18} />
                                    </button>
                                </div>
                                {endSearchResults.length > 0 && (
                                    <div style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {endSearchResults.map((res, idx) => (
                                            <div key={idx} onClick={() => {
                                                setForm({ ...form, end_location: res.display_name.split(',')[0], end_lat: parseFloat(res.lat), end_long: parseFloat(res.lon) });
                                                setEndSearchResults([]);
                                            }} style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }} className="hover:bg-slate-800">
                                                {res.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - ASSETS & SUBMIT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#10b981' }}>Allocated Assets</h2>
                            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>Select vehicles to assign to this convoy.</p>

                            <div style={{ flex: 1, overflowY: 'auto', background: '#0f172a', borderRadius: '8px', border: '1px solid #475569', padding: '10px' }}>
                                {assets.map(asset => (
                                    <div key={asset.id} onClick={() => toggleAsset(asset.id)} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', marginBottom: '5px',
                                        background: form.asset_ids.includes(asset.id) ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                        border: form.asset_ids.includes(asset.id) ? '1px solid #10b981' : '1px solid transparent',
                                        borderRadius: '6px', cursor: 'pointer'
                                    }}>
                                        <Truck size={16} color={form.asset_ids.includes(asset.id) ? '#10b981' : '#64748b'} />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{asset.name}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{asset.asset_type}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button type="submit" style={{
                                marginTop: '20px', width: '100%', padding: '15px',
                                background: 'linear-gradient(to right, #eab308, #ca8a04)',
                                color: 'black', fontWeight: 'bold', fontSize: '16px', border: 'none', borderRadius: '8px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}>
                                <Save size={20} />
                                Initiate Convoy Plan
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
