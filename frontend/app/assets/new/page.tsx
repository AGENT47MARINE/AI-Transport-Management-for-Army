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
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>

                {/* LEFT COLUMN - ASSET DETAILS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* BASIC IDENTITY */}
                    <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ fontSize: '20px', marginBottom: '25px', color: '#eab308', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Truck size={24} /> Vehicle Details
                        </h2>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Asset Name / Callsign</label>
                            <input
                                type="text" required
                                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. ALS-Stallion-05"
                                className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                style={{ color: 'white', fontSize: '16px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Type</label>
                                <select
                                    value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })}
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                    style={{ color: 'white', fontSize: '16px' }}
                                >
                                    <option value="TRUCK">Truck</option>
                                    <option value="JEEP">Jeep</option>
                                    <option value="TANKER">Fuel Tanker</option>
                                    <option value="APC">APC</option>
                                    <option value="BUS">Bus</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Capacity (Tons)</label>
                                <input
                                    type="number" step="0.1" min="0"
                                    value={form.capacity_tons} onChange={e => setForm({ ...form, capacity_tons: parseFloat(e.target.value) })}
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                    style={{ color: 'white', fontSize: '16px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* PERSONNEL & DRIVER */}
                    <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ fontSize: '20px', marginBottom: '25px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Users size={24} /> Personnel & Logistics
                        </h2>

                        <div style={{ marginBottom: '25px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Driver Name (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <User size={20} style={{ position: 'absolute', top: '16px', left: '16px', color: '#64748b' }} />
                                <input
                                    type="text"
                                    value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })}
                                    placeholder="Driver Name"
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 pl-12 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                    style={{ color: 'white', fontSize: '16px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Personnel Count</label>
                                <input
                                    type="number" min="0"
                                    value={form.personnel_count} onChange={e => setForm({ ...form, personnel_count: parseInt(e.target.value) })}
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                    style={{ color: 'white', fontSize: '16px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Fuel Status (%)</label>
                                <div style={{ position: 'relative' }}>
                                    <Droplet size={20} style={{ position: 'absolute', top: '16px', left: '16px', color: '#64748b' }} />
                                    <input
                                        type="number" min="0" max="100"
                                        value={form.fuel_status} onChange={e => setForm({ ...form, fuel_status: parseFloat(e.target.value) })}
                                        className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 pl-12 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                        style={{ color: 'white', fontSize: '16px' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN - LOCATION & SUBMIT */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155', flex: 1, display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ fontSize: '20px', marginBottom: '25px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <MapPin size={24} /> Current Location
                        </h2>

                        {/* SEARCH */}
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Search Location</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Enter city or place..."
                                    className="w-full box-border bg-[#0f172a] border border-[#475569] rounded-xl text-white p-4 focus:outline-none focus:border-[#3b82f6] transition-colors"
                                    style={{ color: 'white', fontSize: '16px' }}
                                />
                                <button type="button" onClick={() => handleSearchLocation(searchQuery)} style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', padding: '0 20px', cursor: 'pointer' }}>
                                    <Search size={22} />
                                </button>
                            </div>
                            {searchResults.length > 0 && (
                                <div style={{ background: '#0f172a', border: '1px solid #475569', borderRadius: '12px', marginTop: '10px', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                                    {searchResults.map((res, idx) => (
                                        <div key={idx} onClick={() => {
                                            setForm({ ...form, current_lat: parseFloat(res.lat), current_long: parseFloat(res.lon) });
                                            setSearchQuery(res.display_name.split(',')[0]);
                                            setSearchResults([]);
                                        }} style={{ padding: '15px', fontSize: '14px', borderBottom: '1px solid #1e293b', cursor: 'pointer' }} className="hover:bg-slate-800">
                                            {res.display_name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* PRECISE COORDS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Latitude</label>
                                <input
                                    type="number" step="any"
                                    value={form.current_lat} onChange={e => setForm({ ...form, current_lat: parseFloat(e.target.value) })}
                                    style={{ width: '100%', padding: '15px', background: '#0f172a', border: '1px solid #475569', borderRadius: '12px', color: 'white', fontSize: '16px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', color: '#94a3b8', marginBottom: '8px', fontWeight: '500' }}>Longitude</label>
                                <input
                                    type="number" step="any"
                                    value={form.current_long} onChange={e => setForm({ ...form, current_long: parseFloat(e.target.value) })}
                                    style={{ width: '100%', padding: '15px', background: '#0f172a', border: '1px solid #475569', borderRadius: '12px', color: 'white', fontSize: '16px' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <button type="submit" style={{
                                width: '100%', padding: '20px',
                                background: 'linear-gradient(to right, #10b981, #059669)',
                                color: 'black', fontWeight: 'bold', fontSize: '18px', border: 'none', borderRadius: '12px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                            }}>
                                <Save size={24} />
                                Register Asset
                            </button>
                        </div>

                    </div>
                </div>

            </form>
        </div>
    );
}
