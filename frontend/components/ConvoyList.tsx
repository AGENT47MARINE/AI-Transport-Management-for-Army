'use client';

import { Map as MapIcon, ArrowRight, Clock, Shield, Circle } from 'lucide-react';

interface Convoy {
    id: number;
    name: string;
    start_location: string;
    end_location: string;
    status: string;
    start_time: string;
}

interface ConvoyListProps {
    convoys: Convoy[];
}

export default function ConvoyList({ convoys }: ConvoyListProps) {
    return (
        <div className="flex flex-col gap-2 p-3">
            {convoys.map((convoy) => (
                <div
                    key={convoy.id}
                    className="group p-3 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 hover:border-yellow-500/30 hover:bg-black/60 transition-all duration-300 cursor-pointer"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-slate-500 group-hover:text-yellow-500 transition-colors" />
                            <h3 className="text-sm font-bold text-white group-hover:text-yellow-400 transition-colors">{convoy.name}</h3>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${convoy.status === 'IN_TRANSIT'
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                            <Circle className={`h-2 w-2 fill-current ${convoy.status === 'IN_TRANSIT' && 'animate-pulse'}`} />
                            {convoy.status === 'IN_TRANSIT' ? 'LIVE' : 'PLAN'}
                        </div>
                    </div>

                    {/* Route Display */}
                    <div className="flex items-center gap-2 mb-3 p-2 bg-black/40 rounded-lg border border-white/5">
                        <div className="flex-1 text-xs font-bold text-slate-300 truncate text-right">
                            {convoy.start_location}
                        </div>
                        <ArrowRight className="h-3 w-3 text-yellow-500 shrink-0" />
                        <div className="flex-1 text-xs font-bold text-slate-300 truncate">
                            {convoy.end_location}
                        </div>
                    </div>

                    {/* Time Info */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">
                                START: {new Date(convoy.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="font-mono text-slate-500">
                            ETA: {new Date(new Date(convoy.start_time).getTime() + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            ))}

            {convoys.length === 0 && (
                <div className="text-center p-12 text-slate-500 text-sm">
                    <MapIcon className="h-10 w-10 mx-auto mb-2 opacity-20" />
                    No active convoys
                </div>
            )}
        </div>
    );
}
