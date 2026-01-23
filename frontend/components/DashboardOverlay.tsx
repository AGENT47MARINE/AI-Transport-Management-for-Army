"use client";

import React, { useState } from 'react';
import { Plus, Truck, MapPin, X, Save, Navigation } from 'lucide-react';

export default function DashboardOverlay() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<'none' | 'asset' | 'convoy' | 'route'>('none');

    // Asset Form State
    const [assetForm, setAssetForm] = useState({
        name: '',
        asset_type: 'Truck 4x4',
        capacity_tons: 2.5,
        lat: 32.7,
        long: 74.8,
        search_query: ''
    });

    // Convoy Form State
    const [convoyForm, setConvoyForm] = useState({
        name: '',
        start_location: 'Jammu',
        end_location: '',
        start_lat: 32.7266, // Default Jammu
        start_long: 74.8570,
        end_lat: 0,
        end_long: 0,
        asset_ids: [] as number[]
    });

    const [assets, setAssets] = useState<any[]>([]);
    const [startSearchResults, setStartSearchResults] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]); // end location results
    const [isSearching, setIsSearching] = useState(false);

    // Fetch assets when modal opens
    React.useEffect(() => {
        if (activeModal === 'convoy') {
            fetch('http://localhost:8000/api/v1/assets/')
                .then(res => res.json())
                .then(data => setAssets(data))
                .catch(err => console.error("Failed to load assets", err));
        }
    }, [activeModal]);

    const handleSearchLocation = async (query: string, type: 'start' | 'end') => {
        if (!query || query.length < 3) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await res.json();
            if (type === 'start') setStartSearchResults(data);
            else setSearchResults(data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleAssetSelection = (id: number) => {
        const current = convoyForm.asset_ids;
        if (current.includes(id)) {
            setConvoyForm({ ...convoyForm, asset_ids: current.filter(x => x !== id) });
        } else {
            setConvoyForm({ ...convoyForm, asset_ids: [...current, id] });
        }
    };

    // Route Form State
    const [routeForm, setRouteForm] = useState({
        name: '',
        start_lat: 32.6896,
        start_long: 74.8376,
        end_lat: 33.9872,
        end_long: 74.7736
    });

    const handleCreateAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/v1/assets/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: assetForm.name,
                    asset_type: assetForm.asset_type,
                    capacity_tons: assetForm.capacity_tons,
                    current_lat: assetForm.lat,
                    current_long: assetForm.long,
                    is_available: true
                })
            });
            if (res.ok) {
                alert('Asset Created!');
                setActiveModal('none');
                window.location.reload();
            } else {
                alert('Failed to create asset');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating asset');
        }
    };

    const handleCreateConvoy = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/v1/convoys/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(convoyForm)
            });
            if (res.ok) {
                alert('Convoy Plan Created!');
                setActiveModal('none');
                window.location.reload();
            } else {
                alert('Failed to create convoy');
            }
        } catch (err) {
            console.error(err);
            alert('Error creating convoy');
        }
    };

    const handleCreateRoute = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8000/api/v1/routes/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(routeForm)
            });
            if (res.ok) {
                alert('Route Planned with OSRM High-Fidelity!');
                setActiveModal('none');
                window.location.reload();
            } else {
                alert('Failed to plan route');
            }
        } catch (err) {
            console.error(err);
            alert('Error planning route');
        }
    };

    return (
        <>
            {/* FAB (Floating Action Button) */}
            <div style={{
                position: 'fixed',
                top: '80px',
                right: '30px',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'end',
                gap: '10px'
            }}>
                {isOpen && (
                    <>
                        <button
                            onClick={() => setActiveModal('route')}
                            style={{
                                backgroundColor: '#1e293b',
                                color: 'white',
                                border: '1px solid #334155',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                cursor: 'pointer',
                                marginBottom: '5px'
                            }}
                        >
                            <Navigation size={18} color="#ef4444" />
                            <span>Plan Route</span>
                        </button>
                        <button
                            onClick={() => window.location.href = '/convoys/new'}
                            style={{
                                backgroundColor: '#1e293b',
                                color: 'white',
                                border: '1px solid #334155',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                cursor: 'pointer',
                                marginBottom: '5px'
                            }}
                        >
                            <MapPin size={18} color="#f59e0b" />
                            <span>New Convoy</span>
                        </button>
                        <button
                            onClick={() => setActiveModal('asset')}
                            style={{
                                backgroundColor: '#1e293b',
                                color: 'white',
                                border: '1px solid #334155',
                                padding: '12px 20px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                cursor: 'pointer',
                                marginBottom: '10px'
                            }}
                        >
                            <Truck size={18} color="#10b981" />
                            <span>New Asset</span>
                        </button>
                    </>
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: '#eab308', // Yellow accent
                        color: 'black',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                >
                    {isOpen ? <X size={24} /> : <Plus size={24} />}
                </button>
            </div>

            {/* MODAL OVERLAY */}
            {activeModal !== 'none' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 3000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        width: '400px',
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '24px',
                        color: 'white',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                                {activeModal === 'asset' ? 'Add New Asset' :
                                    activeModal === 'convoy' ? 'Plan New Convoy' : 'Plan High-Fidelity Route'}
                            </h2>
                            <button onClick={() => setActiveModal('none')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {activeModal === 'asset' ? (
                            <form onSubmit={handleCreateAsset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Asset Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={assetForm.name}
                                        onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                                        placeholder="e.g. IXJ-Heavy-04"
                                        style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Type</label>
                                    <select
                                        value={assetForm.asset_type}
                                        onChange={e => setAssetForm({ ...assetForm, asset_type: e.target.value })}
                                        style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    >
                                        <option>Truck 4x4</option>
                                        <option>Tatra 8x8</option>
                                        <option>ALS Stallion</option>
                                        <option>Light Vehicle</option>
                                        <option>Fuel Tanker</option>
                                    </select>
                                </div>

                                {/* Asset Location Search */}
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Search Location</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            placeholder="Type area name..."
                                            value={assetForm.search_query || ''}
                                            onChange={e => setAssetForm({ ...assetForm, search_query: e.target.value })}
                                            style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!assetForm.search_query || assetForm.search_query.length < 3) return;
                                                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${assetForm.search_query}`);
                                                const data = await res.json();
                                                setStartSearchResults(data); // Reusing startSearchResults for asset search to save state
                                            }}
                                            style={{ padding: '0 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            Search
                                        </button>
                                    </div>
                                    {/* Reuse Start Results for Asset Search (using same state for simplicity) */}
                                    {activeModal === 'asset' && startSearchResults.length > 0 && (
                                        <div style={{ marginTop: '5px', maxHeight: '100px', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px' }}>
                                            {startSearchResults.map((res, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setAssetForm({
                                                            ...assetForm,
                                                            lat: parseFloat(res.lat),
                                                            long: parseFloat(res.lon),
                                                            search_query: res.display_name.split(',')[0]
                                                        });
                                                        setStartSearchResults([]);
                                                    }}
                                                    style={{ padding: '8px', borderBottom: '1px solid #1e293b', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1' }}
                                                    className="hover:bg-slate-800"
                                                >
                                                    {res.display_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Lat</label>
                                        <input type="number" step="0.0001" value={assetForm.lat} onChange={e => setAssetForm({ ...assetForm, lat: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Long</label>
                                        <input type="number" step="0.0001" value={assetForm.long} onChange={e => setAssetForm({ ...assetForm, long: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                </div>

                                <button type="submit" style={{ marginTop: '10px', backgroundColor: '#eab308', color: 'black', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Save size={18} />
                                    Create Asset
                                </button>
                            </form>
                        ) : activeModal === 'convoy' ? (
                            <form onSubmit={handleCreateConvoy} style={{ display: 'flex', flexDirection: 'column', gap: '15px', height: '100%', overflowY: 'auto' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Convoy ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={convoyForm.name}
                                        onChange={e => setConvoyForm({ ...convoyForm, name: e.target.value })}
                                        placeholder="e.g. CVY-Alpha-02"
                                        style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>

                                {/* Start Location Search */}
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Start Point (Search)</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={convoyForm.start_location}
                                            onChange={e => setConvoyForm({ ...convoyForm, start_location: e.target.value })}
                                            placeholder="Start City..."
                                            style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSearchLocation(convoyForm.start_location, 'start')}
                                            style={{ padding: '0 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            Search
                                        </button>
                                    </div>
                                    {/* Start Results */}
                                    {startSearchResults.length > 0 && (
                                        <div style={{ marginTop: '5px', maxHeight: '100px', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px' }}>
                                            {startSearchResults.map((res, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setConvoyForm({
                                                            ...convoyForm,
                                                            start_location: res.display_name.split(',')[0],
                                                            start_lat: parseFloat(res.lat),
                                                            start_long: parseFloat(res.lon)
                                                        });
                                                        setStartSearchResults([]);
                                                    }}
                                                    style={{ padding: '8px', borderBottom: '1px solid #1e293b', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1' }}
                                                    className="hover:bg-slate-800"
                                                >
                                                    {res.display_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {convoyForm.start_lat !== 0 && (
                                        <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                                            Start: {convoyForm.start_lat.toFixed(4)}, {convoyForm.start_long.toFixed(4)}
                                        </div>
                                    )}
                                </div>

                                {/* Destination Search */}
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Destination (Search)</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={convoyForm.end_location}
                                            onChange={e => setConvoyForm({ ...convoyForm, end_location: e.target.value })}
                                            placeholder="End City..."
                                            style={{ flex: 1, padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleSearchLocation(convoyForm.end_location, 'end')}
                                            style={{ padding: '0 15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                                        >
                                            Search
                                        </button>
                                    </div>

                                    {/* End Results */}
                                    {searchResults.length > 0 && (
                                        <div style={{ marginTop: '5px', maxHeight: '100px', overflowY: 'auto', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px' }}>
                                            {searchResults.map((res, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setConvoyForm({
                                                            ...convoyForm,
                                                            end_location: res.display_name.split(',')[0],
                                                            end_lat: parseFloat(res.lat),
                                                            end_long: parseFloat(res.lon)
                                                        });
                                                        setSearchResults([]);
                                                    }}
                                                    style={{ padding: '8px', borderBottom: '1px solid #1e293b', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1' }}
                                                    className="hover:bg-slate-800"
                                                >
                                                    {res.display_name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {convoyForm.end_lat !== 0 && (
                                        <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                                            End: {convoyForm.end_lat.toFixed(4)}, {convoyForm.end_long.toFixed(4)}
                                        </div>
                                    )}
                                </div>

                                {/* Asset Allocation with Scroll */}
                                <div style={{ flex: 1, minHeight: '150px', display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Allocate Available Assets ({convoyForm.asset_ids.length} selected)</label>
                                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #334155', borderRadius: '6px', padding: '8px', background: '#020617' }}>
                                        {assets.length === 0 ? <div style={{ color: '#64748b', fontSize: '12px' }}>No assets found</div> : null}
                                        {assets.map(asset => (
                                            <div
                                                key={asset.id}
                                                onClick={() => toggleAssetSelection(asset.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px',
                                                    background: convoyForm.asset_ids.includes(asset.id) ? '#3730a3' : 'transparent',
                                                    borderRadius: '4px', cursor: 'pointer', marginBottom: '4px'
                                                }}
                                            >
                                                <div style={{
                                                    width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #64748b',
                                                    background: convoyForm.asset_ids.includes(asset.id) ? '#4f46e5' : 'transparent'
                                                }} />
                                                <div>
                                                    <div style={{ fontSize: '13px', color: 'white' }}>{asset.name}</div>
                                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{asset.asset_type} • {asset.capacity_tons}T</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" style={{ marginTop: '10px', backgroundColor: '#eab308', color: 'black', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Save size={18} />
                                    Create & Plan Route
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleCreateRoute} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Route Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={routeForm.name}
                                        onChange={e => setRouteForm({ ...routeForm, name: e.target.value })}
                                        placeholder="e.g. Route-Charlie-Logistics"
                                        style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Start Lat</label>
                                        <input type="number" step="0.0001" value={routeForm.start_lat} onChange={e => setRouteForm({ ...routeForm, start_lat: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>Start Long</label>
                                        <input type="number" step="0.0001" value={routeForm.start_long} onChange={e => setRouteForm({ ...routeForm, start_long: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>End Lat</label>
                                        <input type="number" step="0.0001" value={routeForm.end_lat} onChange={e => setRouteForm({ ...routeForm, end_lat: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '5px' }}>End Long</label>
                                        <input type="number" step="0.0001" value={routeForm.end_long} onChange={e => setRouteForm({ ...routeForm, end_long: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: 'white' }} />
                                    </div>
                                </div>

                                <button type="submit" style={{ marginTop: '10px', backgroundColor: '#eab308', color: 'black', border: 'none', padding: '12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <Navigation size={18} />
                                    Plan Route
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
