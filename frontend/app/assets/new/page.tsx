'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, MapPin, Search, Truck, User, Users, Anchor, Droplet } from 'lucide-react';

export default function NewAssetPage() {
    const router = useRouter();
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [form, setForm] = useState({
        name: '',
        asset_type: 'TRUCK',
        capacity_tons: 0,
        fuel_status: 100.0,
        driver_name: '',
        personnel_count: 0,
        current_lat: 0,
        current_long: 0,
        is_available: true
    });

    const handleSearchLocation = async (query: string) => {
        if (!query || query.length < 3) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await res.json();
            setSearchResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/v1/assets/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('Asset Created Successfully!');
                router.push('/');
            } else {
                alert('Failed to create asset');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating asset');
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <header style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <ArrowLeft size={24} />
                    </button>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Register New Asset</h1>
                </header>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>

                    {/* LEFT COLUMN - ASSET DETAILS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* BASIC IDENTITY */}
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Truck size={20} /> Vehicle Details
                            </h2>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Asset Name / Callsign</label>
                                <input
                                    type="text" required
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. ALS-Stallion-05"
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-lg text-white p-3 focus:outline-none focus:border-[#3b82f6]"
                                    style={{ color: 'white' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Type</label>
                                    <select
                                        value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })}
                                        className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-lg text-white p-3 focus:outline-none focus:border-[#3b82f6]"
                                        style={{ color: 'white' }}
                                    >
                                        <option value="TRUCK">Truck</option>
                                        <option value="JEEP">Jeep</option>
                                        <option value="TANKER">Fuel Tanker</option>
                                        <option value="APC">APC</option>
                                        <option value="BUS">Bus</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Capacity (Tons)</label>
                                    <input
                                        type="number" step="0.1" min="0"
                                        value={form.capacity_tons} onChange={e => setForm({ ...form, capacity_tons: parseFloat(e.target.value) })}
                                        className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-lg text-white p-3 focus:outline-none focus:border-[#3b82f6]"
                                        style={{ color: 'white' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* PERSONNEL & DRIVER */}
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Users size={20} /> Personnel & Logistics
                            </h2>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Driver Name (Optional)</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', top: '14px', left: '12px', color: '#64748b' }} />
                                    <input
                                        type="text"
                                        value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })}
                                        placeholder="Driver Name"
                                        className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-lg text-white p-3 pl-9 focus:outline-none focus:border-[#3b82f6]"
                                        style={{ color: 'white' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Personnel Count</label>
                                    <input
                                        type="number" min="0"
                                        value={form.personnel_count} onChange={e => setForm({ ...form, personnel_count: parseInt(e.target.value) })}
                                        className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-lg text-white p-3 focus:outline-none focus:border-[#3b82f6]"
                                        style={{ color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Fuel Status (%)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Droplet size={16} style={{ position: 'absolute', top: '14px', left: '12px', color: '#64748b' }} />
                                        <input
                                            type="number" min="0" max="100"
                                            value={form.fuel_status} onChange={e => setForm({ ...form, fuel_status: parseFloat(e.target.value) })}
                                            className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-lg text-white p-3 pl-9 focus:outline-none focus:border-[#3b82f6]"
                                            style={{ color: 'white' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* RIGHT COLUMN - LOCATION & SUBMIT */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '15px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <MapPin size={20} /> Current Location
                            </h2>

                            {/* SEARCH */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Search Location</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Enter city or place..."
                                        className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-lg text-white p-3 focus:outline-none focus:border-[#3b82f6]"
                                        style={{ color: 'white' }}
                                    />
                                    <button type="button" onClick={() => handleSearchLocation(searchQuery)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0 15px', cursor: 'pointer' }}>
                                        <Search size={18} />
                                    </button>
                                </div>
                                {searchResults.length > 0 && (
                                    <div style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                                        {searchResults.map((res, idx) => (
                                            <div key={idx} onClick={() => {
                                                setForm({ ...form, current_lat: parseFloat(res.lat), current_long: parseFloat(res.lon) });
                                                setSearchQuery(res.display_name.split(',')[0]);
                                                setSearchResults([]);
                                            }} style={{ padding: '10px', fontSize: '13px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }} className="hover:bg-slate-800">
                                                {res.display_name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* PRECISE COORDS */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Latitude</label>
                                    <input
                                        type="number" step="any"
                                        value={form.current_lat} onChange={e => setForm({ ...form, current_lat: parseFloat(e.target.value) })}
                                        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '5px' }}>Longitude</label>
                                    <input
                                        type="number" step="any"
                                        value={form.current_long} onChange={e => setForm({ ...form, current_long: parseFloat(e.target.value) })}
                                        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #475569', borderRadius: '8px', color: 'white' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto' }}>
                                <button type="submit" style={{
                                    width: '100%', padding: '15px',
                                    background: 'linear-gradient(to right, #10b981, #059669)',
                                    color: 'black', fontWeight: 'bold', fontSize: '16px', border: 'none', borderRadius: '8px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                }}>
                                    <Save size={20} />
                                    Register Asset
                                </button>
                            </div>

                        </div>
                    </div>

                </form>
            </div>
        </div>
    );
}
