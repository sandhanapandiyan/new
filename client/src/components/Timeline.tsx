import React, { useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut, Scissors, Save, Square, Volume2 } from 'lucide-react';
import { toast } from 'react-hot-toast';


interface TimelineProps {
    recordings: any[];
    selectedDate: string;
    currentTime: number; // Seconds from midnight
    isPlaying: boolean;
    volume: number;
    zoomLevel: number;
    onSeek: (timestamp: number, isFinal?: boolean) => void;
    onTogglePlay: () => void;
    onVolumeChange: (volume: number) => void;
    onZoomChange: (zoom: number) => void;
    onExport: (start: number, end: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
    recordings,

    currentTime,
    isPlaying,
    volume,
    zoomLevel,
    onSeek,
    onTogglePlay,
    onVolumeChange,
    onZoomChange,
    onExport
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Clipping State
    const [isClipping, setIsClipping] = useState(false);
    const [clipStart, setClipStart] = useState<number | null>(null);
    const [clipEnd, setClipEnd] = useState<number | null>(null);

    // Helper to format seconds into HH:MM:SS
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleInteraction = (clientX: number, type: 'down' | 'move' | 'up') => {
        if (!containerRef.current || !scrollContainerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        const totalWidth = rect.width;
        const percentage = Math.max(0, Math.min(relativeX / totalWidth, 1));
        const seconds = percentage * 86400; // 24 hours

        if (isClipping) {
            if (type === 'down') {
                if (clipStart !== null && clipEnd === null) {
                    // Second click of "Click-Click" pattern: Set End
                    setClipEnd(seconds);
                } else {
                    // New selection (drag or first click): Reset and set Start
                    setClipStart(seconds);
                    setClipEnd(null);
                }
            } else if (type === 'move' && isDragging) {
                // Dragging: Always update End
                setClipEnd(seconds);
            } else if (type === 'up') {
                // If we finished a drag or click sequence
                if (clipStart !== null && clipEnd !== null) {
                    // Ensure start < end for the final state
                    const finalStart = Math.min(clipStart, clipEnd);
                    const finalEnd = Math.max(clipStart, clipEnd);
                    setClipStart(finalStart);
                    setClipEnd(finalEnd);
                }
            }
        } else {
            // Normal Seeking
            if (type === 'down' || (type === 'move' && isDragging)) {
                onSeek(seconds, false);
            } else if (type === 'up') {
                onSeek(seconds, true);
            }
        }
    };

    const handleExport = () => {
        if (clipStart !== null && clipEnd !== null) {
            // Ensure correct order before exporting
            const start = Math.min(clipStart, clipEnd);
            const end = Math.max(clipStart, clipEnd);

            // Validate duration (e.g. at least 1 second)
            if (Math.abs(end - start) < 1) {
                toast.error("Selection too short (min 1s).");
                return;
            }

            onExport(start, end);
            // Exit clipping mode after export request
            setIsClipping(false);
            setClipStart(null);
            setClipEnd(null);
        } else {
            toast.error('Select a range to export first.');
        }
    };

    const toggleClippingMode = () => {
        if (isClipping && clipStart !== null && clipEnd !== null) {
            // If we have a selection and click simple, assume they want to Export?
            // Or maybe just cancel. Let's make it act as "Cut" if ready.
            handleExport();
        } else {
            setIsClipping(!isClipping);
            setClipStart(null);
            setClipEnd(null);
        }
    };

    // Skip +/- 10 seconds
    const skip = (seconds: number) => {
        const newTime = Math.max(0, Math.min(86400, currentTime + seconds));
        onSeek(newTime, true);
    };

    return (
        <div className="w-full bg-[#1e2025] border border-slate-700/50 rounded-lg select-none flex flex-col font-mono text-[10px]">
            {/* Toolbar / Controls */}
            <div className="flex items-center justify-between px-2 py-1 bg-[#25282e] border-b border-slate-700/50 text-slate-400">
                <div className="flex items-center gap-2">
                    <button onClick={() => skip(-10)} className="p-1 hover:text-white"><SkipBack size={14} /></button>
                    <button onClick={onTogglePlay} className="p-1 hover:text-white text-blue-400">
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => skip(10)} className="p-1 hover:text-white"><SkipForward size={14} /></button>

                    <div className="h-4 w-px bg-slate-700 mx-1" />

                    <div className="flex items-center gap-2 px-2 group">
                        <Volume2 size={14} />
                        <input
                            type="range"
                            min="0" max="1" step="0.1"
                            value={volume}
                            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                            className="w-20 h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleClippingMode}
                        className={`p-1 hover:text-white ${isClipping ? 'text-blue-500' : ''}`}
                        title={isClipping && clipStart ? "Confirm Cut" : "Enter Cut Mode"}
                    >
                        <Scissors size={14} />
                    </button>
                    <div className="px-2 py-0.5 bg-black rounded text-[#0ea5e9] min-w-[80px] text-center font-bold">
                        {formatTime(currentTime)}
                    </div>
                    {/* Only show Save button if we have a selection, redundant if Scissors does it but good for clarity */}
                    {(clipStart !== null && clipEnd !== null) && (
                        <button
                            onClick={handleExport}
                            className="p-1 hover:text-white text-green-500 animate-pulse"
                            title="Export Clip"
                        >
                            <Save size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Timeline Ruler & Tracks - Scrollable Area */}
            <div
                ref={scrollContainerRef}
                className={`relative h-32 bg-[#1a1c21] overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-700 ${isClipping ? 'cursor-crosshair' : ''}`}
            >
                <div
                    ref={containerRef}
                    className="relative h-full cursor-pointer"
                    style={{ width: `${100 * zoomLevel}%`, minWidth: '100%' }}
                    onMouseDown={(e) => { setIsDragging(true); handleInteraction(e.clientX, 'down'); }}
                    onMouseMove={(e) => isDragging && handleInteraction(e.clientX, 'move')}
                    onMouseUp={(e) => { setIsDragging(false); handleInteraction(e.clientX, 'up'); }}
                    onMouseLeave={() => setIsDragging(false)}
                >
                    {/* Time Ruler */}
                    <div className="h-6 border-b border-slate-700/50 flex relative text-slate-500 text-[9px]">
                        {Array.from({ length: 25 }).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-700/30 pl-1" style={{ left: `${(i / 24) * 100}%` }}>
                                {i}
                            </div>
                        ))}
                    </div>

                    {/* Tracks Area */}
                    <div className="relative flex-1 p-2 space-y-1">
                        {/* Grid Lines */}
                        {Array.from({ length: 25 }).map((_, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-700/10 pointer-events-none" style={{ left: `${(i / 24) * 100}%` }} />
                        ))}

                        {/* General Recording Track */}
                        <div className="relative h-6 w-full bg-[#1e2025] rounded-sm border border-slate-700/30 overflow-hidden">
                            {recordings.map(rec => {
                                const start = new Date(rec.startTime);
                                const end = rec.endTime ? new Date(rec.endTime) : new Date(start.getTime() + 900000);

                                // Calculate seconds from start of day
                                const startSeconds = start.getHours() * 3600 + start.getMinutes() * 60 + start.getSeconds();
                                const durationSeconds = (end.getTime() - start.getTime()) / 1000;

                                const left = (startSeconds / 86400) * 100;
                                const width = (durationSeconds / 86400) * 100;

                                return (
                                    <div
                                        key={rec.id}
                                        className="absolute top-0 bottom-0 bg-[#10b981] hover:bg-[#34d399] transition-colors cursor-pointer border-r border-[#10b981]/10"
                                        style={{ left: `${left}%`, width: `${Math.max(width, 0.005)}%` }}
                                        title={`Recording: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`}
                                    // Event bubbling handles interaction via parent container
                                    />
                                );
                            })}
                        </div>

                        {/* Clip Selection Overlay */}
                        {clipStart !== null && (
                            <div
                                className="absolute top-0 bottom-0 bg-blue-500/20 border-l border-r border-blue-400 pointer-events-none z-20 group"
                                style={{
                                    left: `${(Math.min(clipStart, clipEnd ?? clipStart) / 86400) * 100}%`,
                                    width: `${(Math.abs((clipEnd ?? clipStart) - clipStart) / 86400) * 100}%`
                                }}
                            >
                                <div className="absolute top-0 left-0 bg-blue-500 text-white text-[9px] px-1 rounded-bl">
                                    {formatTime(Math.min(clipStart, clipEnd ?? clipStart))}
                                </div>
                                {clipEnd !== null && (
                                    <>
                                        <div className="absolute bottom-0 right-0 bg-blue-500 text-white text-[9px] px-1 rounded-tl">
                                            {formatTime(Math.max(clipStart, clipEnd))}
                                        </div>
                                        {/* Action Button */}
                                        {/* Floating Action Button REMOVED */}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Mock Motion Track */}
                        <div className="relative h-6 w-full bg-[#1e2025] rounded-sm border border-slate-700/30 opacity-50">
                        </div>
                    </div>

                    {/* Scrubber Line */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-blue-500 z-10 pointer-events-none flex flex-col items-center transition-all duration-75"
                        style={{ left: `${(currentTime / 86400) * 100}%` }}
                    >
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-500" />
                        <div className="absolute top-6 px-1 py-0.5 bg-blue-500 text-white text-[9px] rounded-sm whitespace-nowrap transform -translate-x-1/2 shadow-lg">
                            {formatTime(currentTime)}
                        </div>
                        <div className="h-full w-px bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    </div>
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="flex items-center gap-4 px-3 py-2 bg-[#25282e] border-t border-slate-700/50 text-slate-400">
                <button
                    onClick={() => { if (isPlaying) onTogglePlay(); onSeek(0, true); }}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                >
                    <Square size={12} fill="currentColor" />
                    <span className="font-bold text-[9px] uppercase tracking-wider">Stop</span>
                </button>

                <div className="flex items-center gap-2">
                    <input type="checkbox" className="rounded border-slate-600 bg-slate-800" />
                    <span>Sync</span>
                </div>
                <div className="h-4 w-px bg-slate-700 mx-2" />

                {/* Legend / Filters */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-blue-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-blue-400 font-bold">All</span>
                    </div>

                    <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#10b981]">
                        <div className="w-2 h-2 bg-[#10b981] rounded-full" />
                        <span className="text-[#10b981] font-bold">General</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        <span>Alarm</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-50 cursor-not-allowed">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        <span>Motion</span>
                    </div>
                </div>

                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => onZoomChange(Math.max(1, zoomLevel - 5))}><ZoomOut size={14} /></button>
                        <input
                            type="range" min="1" max="96" step="1"
                            value={zoomLevel}
                            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
                            className="w-32 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            title={`Zoom Level: ${zoomLevel}x`}
                        />
                        <button onClick={() => onZoomChange(Math.min(96, zoomLevel + 5))}><ZoomIn size={14} /></button>
                        <span className="text-[9px] w-8 text-center">{zoomLevel}x</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
