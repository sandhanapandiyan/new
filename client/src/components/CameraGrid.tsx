import React, { useState } from 'react';
import {
    Maximize2,
    Volume2,
    VolumeX,
    Activity,
    Settings,
    Trash2,
    Wifi,
    WifiOff,
    Clock
} from 'lucide-react';

interface Camera {
    id: string;
    name: string;
    status: string;
    liveStats?: {
        bitrate: string;
        codec: string;
        profile: string;
        lastMotion: string | null;
        active: boolean;
        recording?: {
            active: boolean;
            startTime: number;
        };
    };
}

const CameraGrid: React.FC<{
    cameras: Camera[],
    onAddClick: () => void,
    onCameraDelete: (id: string) => void,
    isLoggedIn: boolean
}> = ({ cameras, onAddClick, onCameraDelete, isLoggedIn }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {cameras.map(camera => (
                <CameraCard key={camera.id} camera={camera} onDelete={() => onCameraDelete(camera.id)} isLoggedIn={isLoggedIn} />
            ))}

            {/* Add Slot - Only for logged in users */}
            {isLoggedIn && (
                <button
                    onClick={onAddClick}
                    className="aspect-video rounded-3xl border-2 border-dashed border-slate-800/50 flex flex-col items-center justify-center gap-4 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all group overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 to-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center border border-white/5 group-hover:scale-110 group-hover:bg-primary-600 transition-all duration-300">
                        <Settings className="w-6 h-6 text-slate-500 group-hover:text-white" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-slate-400 group-hover:text-primary-400">Manage Systems</p>
                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">Configure Hardware</p>
                    </div>
                </button>
            )}
        </div>
    );
};

const CameraCard: React.FC<{ camera: Camera, onDelete: () => void, isLoggedIn: boolean }> = ({ camera, onDelete, isLoggedIn }) => {
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [timeStats, setTimeStats] = useState({ elapsed: '00:00', remaining: '05:00' });
    const cardRef = React.useRef<HTMLDivElement>(null);

    // Recording Progress Logic
    React.useEffect(() => {
        if (!camera.liveStats?.recording?.active) return;

        const updateProgress = () => {
            const now = Date.now();
            const start = camera.liveStats!.recording!.startTime;
            const segmentDuration = 5 * 60 * 1000; // 5 mins in ms

            // Calculate progress of current segment
            const elapsed = now - start;
            const currentSegmentElapsed = elapsed % segmentDuration;
            const currentSegmentRemaining = segmentDuration - currentSegmentElapsed;

            // Progress Percentage
            const currentSegmentProgress = (currentSegmentElapsed / segmentDuration) * 100;
            setProgress(currentSegmentProgress);

            // Format Time HH:MM
            const format = (ms: number) => {
                const totalSec = Math.floor(ms / 1000);
                const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
                const s = (totalSec % 60).toString().padStart(2, '0');
                return `${m}:${s}`;
            };

            setTimeStats({
                elapsed: format(currentSegmentElapsed),
                remaining: format(currentSegmentRemaining)
            });
        };

        // Update immediately and then every second
        updateProgress();
        const interval = setInterval(updateProgress, 1000);
        return () => clearInterval(interval);
    }, [camera.liveStats?.recording]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            cardRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div ref={cardRef} className="bg-[#0f172a]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 overflow-hidden group relative flex flex-col shadow-2xl ring-1 ring-white/5">
            {/* Header Info */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-30 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500 w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                    <span className="text-xs font-black uppercase tracking-tighter text-white drop-shadow-md">{camera.name}</span>
                </div>
                <div className="flex gap-2">
                    {/* REC Indicator */}
                    {camera.liveStats?.recording?.active && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/20 border border-red-500/30 text-red-500 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest">REC</span>
                        </div>
                    )}

                    <div className={`px-2 py-1 rounded-md border flex items-center gap-1.5 transition-colors ${camera.liveStats?.active
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                        {camera.liveStats?.active ? <Wifi size={10} /> : <WifiOff size={10} />}
                        <span className="text-[9px] font-bold">
                            {camera.liveStats?.active ? 'Signal OK' : 'No Signal'}
                        </span>
                    </div>
                    {isLoggedIn && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="p-1.5 bg-black/40 backdrop-blur-md rounded-md border border-white/10 text-slate-400 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all pointer-events-auto outline-none"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Video Viewport */}
            <div className="aspect-video bg-[#020617] relative flex items-center justify-center overflow-hidden">
                <video
                    src={`http://${window.location.hostname}:1984/api/stream.mp4?src=${camera.id}&mode=mse`}
                    autoPlay
                    muted={isMuted}
                    playsInline
                    disablePictureInPicture
                    className="w-full h-full object-cover z-10"
                />

                {/* Progress Bar Overlay */}
                {camera.liveStats?.recording?.active && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20 group-hover:h-5 transition-all duration-300 flex items-center px-2 justify-between">
                        {/* Bar Background (Expands on hover) */}
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-0 opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Progress Fill */}
                        <div
                            className="absolute left-0 bottom-0 h-1 group-hover:h-0.5 bg-red-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(239,68,68,0.6)] z-10"
                            style={{ width: `${progress}%` }}
                        />

                        {/* Time Text (Visible on hover) */}
                        <span className="relative z-20 text-[9px] font-mono font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                            {timeStats.elapsed}
                        </span>
                        <span className="relative z-20 text-[9px] font-mono font-bold text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            -{timeStats.remaining}
                        </span>
                    </div>
                )}

                {/* Stream Overlay UI (Only shows if video fails or loading) */}
                <div className="absolute z-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none opacity-40">
                    <Activity className="w-12 h-12 text-slate-900 mx-auto mb-4 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Initializing Flow</p>
                </div>

                {/* Dynamic Controls Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-between items-end z-30 opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 duration-300 pointer-events-none">
                    <div className="flex gap-2 pointer-events-auto">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 text-white hover:bg-white/20 transition-all shadow-lg active:scale-95"
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="p-3 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 text-white hover:bg-white/20 transition-all shadow-lg active:scale-95"
                        >
                            <Maximize2 size={18} />
                        </button>
                    </div>

                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-right pointer-events-auto">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                {camera.liveStats?.codec || 'AUTO'}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-bold text-white/90">
                                {camera.liveStats?.active ? 'STREAMING' : 'IDLE'}
                            </span>
                        </div>
                        <p className="text-[11px] font-mono font-bold text-slate-400">
                            {camera.liveStats?.bitrate || '0.00'} Mbps
                        </p>
                    </div>
                </div>

                {/* Vignette */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>

            {/* Footer Info */}
            <div className="p-5 flex justify-between items-center bg-slate-900/40 border-t border-white/5">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Last Motion</span>
                        <div className="flex items-center gap-1 text-slate-300">
                            <Clock size={12} className="text-primary-500" />
                            <span className="text-xs font-bold font-mono">
                                {camera.liveStats?.lastMotion
                                    ? new Date(camera.liveStats.lastMotion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                    : 'Never'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border ${camera.liveStats?.active
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    : 'bg-slate-500/10 border-slate-500/20 text-slate-500'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${camera.liveStats?.active ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                        {camera.liveStats?.active ? 'Active' : 'Standby'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CameraGrid;
