
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Droplet, Users, CheckCircle, ArrowLeft, Fuel } from 'lucide-react';

export default function TcpDashboard() {
    const router = useRouter();
    const [indents, setIndents] = useState<any[]>([]);

    useEffect(() => {
        // Fetch pending indents
        fetch('http://localhost:8000/api/v1/logistics/pending')
            .then(res => res.json())
            .then(data => setIndents(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div style={{ height: '100vh', background: '#020617', color: 'white', display: 'flex' }}>
            {/* Sidebar Stub */}
            <div style={{ width: '250px', borderRight: '1px solid #1e293b', padding: '20px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '40px', color: '#3b82f6', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Package /> TCP LOGISTICS
                </div>
                <button onClick={() => router.push('/login')} style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ArrowLeft size={16} /> Logout
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <header style={{ marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Incoming Logistics Requirements</h1>
                    <p style={{ color: '#94a3b8' }}>Real-time FOL and Accommodation requests from incoming convoys.</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                    {indents.map((indent) => (
                        <div key={indent.id} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '20px', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#f59e0b', color: 'black', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' }}>
                                {indent.status}
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>Convoy #{indent.convoy_id}</h3>
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>ETA: {new Date().toLocaleDateString()}</div>

                            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                                <div style={{ flex: 1, background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '5px', alignItems: 'center' }}><Fuel size={12} /> Diesel Needed</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#eab308' }}>{indent.fuel_diesel_liters} L</div>
                                </div>
                                <div style={{ flex: 1, background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '5px', alignItems: 'center' }}><Users size={12} /> Night Stay</div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>{indent.accommodation_personnel} Pax</div>
                                </div>
                            </div>

                            <button style={{ width: '100%', padding: '12px', background: '#10b981', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle size={16} /> Mark Fulfilled
                            </button>
                        </div>
                    ))}

                    {indents.length === 0 && (
                        <div style={{ color: '#64748b', fontStyle: 'italic' }}>No pending logistics requests.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
