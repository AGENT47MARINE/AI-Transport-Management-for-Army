'use client';

import { Truck, Fuel, MapPin, Circle } from 'lucide-react';

interface Asset {
    id: number;
    name: string;
    asset_type: string;
    is_available: boolean;
    fuel_status: number;
    current_lat?: number;
    current_long?: number;
}

interface AssetListProps {
    assets: Asset[];
}

export default function AssetList({ assets }: AssetListProps) {
    return (
        <div className="flex flex-col gap-2 p-3">
            {assets.map((asset, idx) => (
                <div
                    key={asset.id}
                    className="group relative p-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 hover:border-yellow-500/30 hover:bg-black/60 transition-all duration-300 cursor-pointer"
                >
                    {/* Rank Badge */}
                    <div className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-yellow-400">{idx + 1}</span>
                    </div>

                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{asset.name}</h3>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">{asset.asset_type}</div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${asset.is_available
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                            <Circle className={`h-2 w-2 fill-current ${asset.is_available && 'animate-pulse'}`} />
                            {asset.is_available ? 'RDY' : 'BSY'}
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        {/* Fuel Status */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                                <Fuel className="h-3 w-3 text-slate-500" />
                                <span className="text-[10px] text-slate-500 uppercase">Fuel</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${asset.fuel_status < 30 ? 'bg-red-500' : asset.fuel_status < 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                                        }`}
                                    style={{ width: `${asset.fuel_status}%` }}
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-slate-500" />
                                <span className="text-[10px] text-slate-500 uppercase">Position</span>
                            </div>
                            <div className="text-[10px] font-mono text-white">
                                {asset.current_lat?.toFixed(2)}, {asset.current_long?.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {assets.length === 0 && (
                <div className="text-center p-12 text-slate-500 text-sm">
                    <Truck className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No assets in this sector
                </div>
            )}
        </div>
    );
}
