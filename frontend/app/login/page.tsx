
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, UserCog, Truck } from 'lucide-react';

export default function LoginPage() {
    const router = useRouter();

    const handleLogin = (role: string) => {
        // Simple client-side auth for MVP
        localStorage.setItem('user_role', role);
        if (role === 'COMMANDER') {
            router.push('/');
        } else {
            router.push('/tcp-dashboard');
        }
    };

    return (
        <div style={{ height: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <div style={{ textAlign: 'center', maxWidth: '400px', width: '100%', padding: '40px', background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b' }}>
                <Shield size={64} color="#10b981" style={{ marginBottom: '20px' }} />
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>AI Transport System</h1>
                <p style={{ color: '#94a3b8', marginBottom: '40px' }}>Identify your Role to proceed</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <button
                        onClick={() => handleLogin('COMMANDER')}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px',
                            padding: '20px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        className="hover:border-emerald-500 hover:bg-slate-800"
                    >
                        <UserCog size={24} color="#10b981" />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>Commander / Planner</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Plan Convoys & Allocate Assets</div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleLogin('TCP_INCHARGE')}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px',
                            padding: '20px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155',
                            cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        className="hover:border-blue-500 hover:bg-slate-800"
                    >
                        <Truck size={24} color="#3b82f6" />
                        <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>TCP In-Charge</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>View Logistics Indents & Traffic</div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}
