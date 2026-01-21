'use client';

import { useState } from 'react';
import { Box, Truck, Cpu, RefreshCw, Trash2, ArrowRight } from 'lucide-react';

interface CargoItem {
    id: string;
    name: string;
    weight: number; // kg
    volume: number; // m3
}

interface VehicleSpec {
    id: string;
    name: string;
    capacity_weight: number;
    capacity_volume: number;
}

const DEFAULT_FLEET: VehicleSpec[] = [
    { id: 'als-stallion', name: 'ALS Stallion', capacity_weight: 5000, capacity_volume: 15 },
    { id: 'tata-407', name: 'Tata 407', capacity_weight: 2500, capacity_volume: 8 },
    { id: 'gypsy', name: 'Maruti Gypsy', capacity_weight: 500, capacity_volume: 2 },
];

const OptimizationTool = () => {
    const [cargoList, setCargoList] = useState<CargoItem[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Preset cargo types for quick addition
    const addCargo = (type: 'AMMO' | 'FUEL' | 'RATIONS' | 'ENGINE') => {
        const newItem: CargoItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: type,
            weight: type === 'AMMO' ? 50 : type === 'FUEL' ? 200 : type === 'ENGINE' ? 800 : 30,
            volume: type === 'AMMO' ? 0.2 : type === 'FUEL' ? 0.5 : type === 'ENGINE' ? 2.0 : 0.1,
        };
        setCargoList([...cargoList, newItem]);
        setResult(null); // Reset result on change
    };

    const runOptimization = async () => {
        setLoading(true);
        try {
            // We assume infinite supply of these trucks for the solver to choose from
            // So we generate a "pool" of potential vehicles
            const potentialFleet = [];
            for (let i = 0; i < 50; i++) {
                potentialFleet.push({ ...DEFAULT_FLEET[0], id: `stallion-${i}` });
                potentialFleet.push({ ...DEFAULT_FLEET[1], id: `tata-${i}` });
                potentialFleet.push({ ...DEFAULT_FLEET[2], id: `gypsy-${i}` });
            }

            const res = await fetch('http://localhost:8000/api/v1/optimization/optimize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cargo: cargoList,
                    fleet: potentialFleet
                })
            });

            if (res.ok) {
                setResult(await res.json());
            } else {
                alert("Optimization failed. Check backend.");
            }
        } catch (err) {
            console.error(err);
            alert("Error connecting to AI service.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full h-full bg-slate-950 flex flex-col text-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                            <Cpu className="h-6 w-6 text-white" />
                        </div>
                        Mission Planner
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">AI-Assisted Load & Fleet Optimization</p>
                </div>

                <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-white">{cargoList.length}</div>
                    <div className="text-xs text-slate-500 uppercase tracking-widest">ITEMS TO PACK</div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* INPUT PANEL */}
                <div className="w-1/2 border-r border-slate-800 p-6 overflow-y-auto">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">1. Manifest Requirements</h3>

                    {/* Quick Add Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-8">
                        <button onClick={() => addCargo('AMMO')} className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-indigo-500 transition-all flex items-center gap-3 group">
                            <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20">
                                <Box className="h-5 w-5 text-orange-500" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white">Ammo Box</div>
                                <div className="text-xs text-slate-500">50kg / 0.2m³</div>
                            </div>
                        </button>

                        <button onClick={() => addCargo('FUEL')} className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-indigo-500 transition-all flex items-center gap-3 group">
                            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20">
                                <Box className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white">Fuel Barrel</div>
                                <div className="text-xs text-slate-500">200kg / 0.5m³</div>
                            </div>
                        </button>

                        <button onClick={() => addCargo('RATIONS')} className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-indigo-500 transition-all flex items-center gap-3 group">
                            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20">
                                <Box className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white">Rations</div>
                                <div className="text-xs text-slate-500">30kg / 0.1m³</div>
                            </div>
                        </button>

                        <button onClick={() => addCargo('ENGINE')} className="p-4 rounded-xl border border-slate-700 bg-slate-900/50 hover:bg-slate-800 hover:border-indigo-500 transition-all flex items-center gap-3 group">
                            <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20">
                                <Box className="h-5 w-5 text-purple-500" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white">Spare Engine</div>
                                <div className="text-xs text-slate-500">800kg / 2.0m³</div>
                            </div>
                        </button>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-500">CURRENT MANIFEST</span>
                        <button onClick={() => setCargoList([])} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
                            <Trash2 className="h-3 w-3" /> Clear
                        </button>
                    </div>

                    {/* List of items */}
                    <div className="space-y-2 mb-6">
                        {cargoList.length === 0 && <div className="text-center py-10 text-slate-600 text-sm">Manifest is empty. Add cargo above.</div>}
                        {cargoList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-slate-900 border border-slate-800">
                                <span className="text-sm text-slate-300">{item.name}</span>
                                <span className="text-xs font-mono text-slate-500">{item.weight}kg</span>
                            </div>
                        ))}
                    </div>

                    {/* ACTION */}
                    <button
                        onClick={runOptimization}
                        disabled={cargoList.length === 0 || loading}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all
                        ${cargoList.length === 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20'}
                    `}
                    >
                        {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Cpu className="h-5 w-5" />}
                        {loading ? 'AI CALCULATING...' : 'GENERATE FLEET PLAN'}
                    </button>
                </div>

                {/* RESULTS PANEL */}
                <div className="w-1/2 p-6 bg-slate-900/50 overflow-y-auto">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">2. AI Optimization Results</h3>

                    {!result && (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl">
                            <Cpu className="h-10 w-10 mb-3 opacity-20" />
                            <p>No plan generated</p>
                        </div>
                    )}

                    {result && result.status === 'OPTIMAL' && (
                        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-6">
                                <div className="text-xs text-emerald-400 uppercase font-bold tracking-wider mb-1">OPTIMAL SOLUTION FOUND</div>
                                <div className="text-2xl font-bold text-white flex items-center gap-2">
                                    {result.total_vehicles_used} Vehicles Required
                                </div>
                            </div>

                            <div className="space-y-4">
                                {result.assignments && Object.entries(result.assignments).map(([vehicleId, items]: [string, any]) => (
                                    <div key={vehicleId} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-800">
                                            <Truck className="h-5 w-5 text-indigo-400" />
                                            <div className="font-bold text-white uppercase">{vehicleId.split('-')[0]} <span className="text-slate-500 text-xs">#{vehicleId.split('-')[1]}</span></div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2">
                                            {items.map((item: any, i: number) => (
                                                <div key={i} className="p-1.5 bg-slate-950 rounded border border-slate-800 text-center">
                                                    <div className="text-[10px] font-bold text-slate-400">{item.name}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {result && result.status !== 'OPTIMAL' && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <div className="bg-red-500/20 p-2 rounded-full">
                                <Cpu className="h-5 w-5 text-red-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-red-400">Optimization Failed</h4>
                                <p className="text-xs text-slate-400 mt-1">{result.details || 'Could not find a valid fleet plan.'}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OptimizationTool;
