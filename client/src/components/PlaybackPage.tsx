import React, { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Calendar as CalendarIcon,
    Search,
    Download,
    Share2,
    Film,
    RefreshCw,
    HardDrive
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Timeline from './Timeline';
import Calendar from './Calendar';

const API_BASE = 'http://localhost:3001/api';

const PlaybackPage = () => {
    const queryClient = useQueryClient();
    // Use local time for today's date, not UTC
    const [selectedDate, setSelectedDate] = React.useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [selectedCamera, setSelectedCamera] = React.useState(''); // Default to empty to force selection
    const [playingRec, setPlayingRec] = React.useState<any>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    const [volume, setVolume] = React.useState(1);
    const [currentGlobalTime, setCurrentGlobalTime] = React.useState(0); // Seconds from midnight
    const [zoomLevel, setZoomLevel] = React.useState(1);

    const videoRef = useRef<HTMLVideoElement>(null);
    const lastSeekRef = useRef<number>(0);

    const { data: cameras = [] } = useQuery({
        queryKey: ['cameras'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_BASE}/cameras`);
            return data;
        }
    });

    const { data: markedDates = [] } = useQuery({
        queryKey: ['recordingDates'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_BASE}/recordings/dates`);
            return data;
        }
    });

    const { data: recordings = [], isLoading } = useQuery({
        queryKey: ['recordings', selectedDate, selectedCamera],
        queryFn: async () => {
            if (!selectedCamera) return []; // Should be blocked by enabled check anyway
            const params = new URLSearchParams();
            if (selectedDate) params.append('date', selectedDate);
            if (selectedCamera !== 'all') params.append('cameraId', selectedCamera);
            const { data } = await axios.get(`${API_BASE}/recordings?${params.toString()}`);
            // Sort ASCENDING (oldest to newest) for proper timeline playback
            return data.sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        },
        enabled: selectedCamera !== '', // Only fetch when a camera (or 'all') is explicitly selected
        refetchInterval: 5000 // Poll every 5s for new segments
    });

    const syncMutation = useMutation({
        mutationFn: async () => {
            await axios.post(`${API_BASE}/recordings/sync`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recordings'] });
            queryClient.invalidateQueries({ queryKey: ['recordingDates'] });
        }
    });

    // Sync global time when video plays
    const handleVideoTimeUpdate = () => {
        if (videoRef.current && playingRec) {
            const videoTime = videoRef.current.currentTime;
            const startTime = new Date(playingRec.startTime);
            const startOfDay = new Date(startTime);
            startOfDay.setHours(0, 0, 0, 0);

            const relativeStartSeconds = (startTime.getTime() - startOfDay.getTime()) / 1000;
            setCurrentGlobalTime(relativeStartSeconds + videoTime);
        }
    };

    const togglePlay = async () => {
        if (videoRef.current) {
            try {
                if (videoRef.current.paused) {
                    await videoRef.current.play();
                    // isPlaying set via onPlay
                } else {
                    videoRef.current.pause();
                    // isPlaying set via onPause
                }
            } catch (error) {
                console.error("Playback error:", error);
                // Force sync state
                setIsPlaying(!videoRef.current.paused);
            }
        }
    };

    const handleSeek = (timeInSeconds: number, isFinal: boolean = true) => {
        // ALWAYS update the visual scrubber immediately
        setCurrentGlobalTime(timeInSeconds);
        lastSeekRef.current = Date.now();

        const timeDate = new Date(`${selectedDate}T00:00:00`);
        timeDate.setSeconds(timeInSeconds);
        const seekTime = timeDate.getTime();

        // 1. Strict match first (inside actual range) this prevents jumping to neighbors
        let targetRec = recordings.find((rec: any) => {
            const start = new Date(rec.startTime).getTime();
            // Fallback end for active recordings
            let end = rec.endTime ? new Date(rec.endTime).getTime() : start + 10000;
            return seekTime >= start && seekTime <= end;
        });

        // 2. Loose match second (1s buffer) for clicking gaps
        if (!targetRec) {
            targetRec = recordings.find((rec: any) => {
                const start = new Date(rec.startTime).getTime();
                let end = rec.endTime ? new Date(rec.endTime).getTime() : start + 10000;
                return seekTime >= start - 1000 && seekTime <= end + 1000;
            });
        }

        if (targetRec) {
            const startTime = new Date(targetRec.startTime).getTime();
            const offset = (seekTime - startTime) / 1000;

            // Scenario A: Just scrubbing within the already playing video
            if (playingRec?.id === targetRec.id) {
                if (videoRef.current && Number.isFinite(offset)) {
                    // Immediate scrub for responsiveness within same file
                    videoRef.current.currentTime = Math.max(0, offset);
                }
            }
            // Scenario B: Switching to a DIFFERENT recording
            else {
                // ONLY switch if the user has released the mouse (isFinal)
                if (isFinal) {
                    setPlayingRec(targetRec);

                    // Delay slightly to wait for DOM update
                    setTimeout(() => {
                        if (videoRef.current && Number.isFinite(offset)) {
                            videoRef.current.currentTime = Math.max(0, offset);
                            videoRef.current.play().catch(e => console.error("Auto-play failed:", e));
                            setIsPlaying(true);
                        }
                    }, 100);
                }
            }
        }
        // Else: clicked a gap, do nothing (just scrubber moves)
    };


    const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
    const [pendingExport, setPendingExport] = React.useState<{ start: number, end: number } | null>(null);
    const [exportPath, setExportPath] = React.useState('');
    const [availableDrives, setAvailableDrives] = React.useState<string[]>([]);
    const [isExporting, setIsExporting] = React.useState(false);

    const handleVolumeChange = (vol: number) => {
        setVolume(vol);
        if (videoRef.current) videoRef.current.volume = vol;
    };

    // Called by Timeline
    // Unified Export Logic
    const executeExport = async (reqConfig: any, targetPath: string) => {
        const toastId = toast.loading("Processing export...");
        try {
            setIsExporting(true);
            const { start, end } = reqConfig;

            // Robustly resolve Camera ID
            let cameraId = playingRec?.camera?.id || (selectedCamera !== 'all' ? selectedCamera : '');
            if (!cameraId && recordings.length > 0) {
                cameraId = recordings[0].cameraId;
            }

            if (!cameraId) {
                throw new Error("No camera selected for export");
            }

            const payload: any = {
                cameraId: cameraId,
                // FIXED: Convert Seconds-of-Day to ISO Timestamps based on selectedDate
                date: selectedDate,
                startSeconds: start,
                duration: end - start,
                targetPath: undefined
            };

            if (targetPath && targetPath.trim()) {
                payload.targetPath = targetPath.trim();
            }

            console.log("Sending Export Payload:", payload);

            const response = await axios.post(`${API_BASE}/recordings/export`, payload);

            if (response.data.success) {
                if (response.data.isInternal) {
                    toast.success("Clip Saved! The download is available in the 'Video Exports' page.", { id: toastId, duration: 5000 });
                } else {
                    toast.success(`Saved to Drive: ${response.data.path}`, { id: toastId, duration: 4000 });
                }
            } else {
                throw new Error("Export reported failure");
            }

            setIsExportModalOpen(false);
            setPendingExport(null);
            setExportPath('');

        } catch (error) {
            console.error("Export failed", error);
            toast.error("Export failed. Try refreshing.", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    // Called by Timeline
    const handleExportRequest = async (startSeconds: number, endSeconds: number) => {
        console.log("Export Requested:", startSeconds, endSeconds);
        setPendingExport({ start: startSeconds, end: endSeconds });

        // Check for drives first
        try {
            const res = await axios.get(`${API_BASE}/system/drives`);
            const drives = Array.isArray(res.data) ? res.data : [];
            setAvailableDrives(drives);

            if (drives.length > 0) {
                // Drives exist -> Show Modal to let user choose
                setIsExportModalOpen(true);
            } else {
                // No drives -> Direct Export (Skip Modal)
                executeExport({ start: startSeconds, end: endSeconds }, '');
            }
        } catch (e) {
            // Error -> Default to Direct Export
            setAvailableDrives([]);
            executeExport({ start: startSeconds, end: endSeconds }, '');
        }
    };

    // Wrapper for Modal Button
    const confirmExport = () => {
        if (pendingExport) {
            executeExport(pendingExport, exportPath);
        } else {
            console.error("State Error: No pending export found when confirming.");
            toast.error("Please re-select the clip.");
            setIsExportModalOpen(false);
        }
    };

    // Auto-select first recording if none selected and recordings exist
    React.useEffect(() => {
        if (!playingRec && recordings.length > 0) {
            // Don't auto-play, just set ready state or allow user to pick
        }
    }, [recordings]);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-1 gap-6 min-h-0 mb-4">
                {/* Sidebar Controls */}
                <div className="w-80 shrink-0 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-6 flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 flex items-center justify-between gap-4 mb-4 pr-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-violet-500/10 p-3 rounded-2xl text-violet-400">
                                <CalendarIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black">Archive</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Search Footage</p>
                            </div>
                        </div>

                        {/* USB Indicator */}
                        {availableDrives.length > 0 && (
                            <div className="group relative flex items-center justify-center">
                                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 animate-pulse">
                                    <HardDrive size={18} />
                                </div>
                                {/* Tooltip */}
                                <div className="absolute right-0 top-12 w-48 p-3 bg-slate-900 border border-white/10 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">External Storage</p>
                                    <p className="text-xs text-white font-mono break-all">{availableDrives[0]}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0 space-y-4">
                        <Calendar
                            markedDates={markedDates}
                            selectedDate={selectedDate}
                            onDateSelect={setSelectedDate}
                        />

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Asset Filter</label>
                            <select
                                value={selectedCamera}
                                onChange={(e) => setSelectedCamera(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-white text-xs"
                            >
                                <option value="" disabled>Select Security Node</option>
                                <option value="all">All Security Nodes</option>
                                {cameras.map((cam: any) => (
                                    <option key={cam.id} value={cam.id}>{cam.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={() => syncMutation.mutate()}
                            disabled={syncMutation.isPending}
                            className="w-full py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-lg shadow-primary-900/20 flex items-center justify-center gap-2 mt-2"
                        >
                            {syncMutation.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                            {syncMutation.isPending ? 'Indexing...' : 'Index Archives'}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 mt-6 scrollbar-thin pr-1">
                        <div className="space-y-1.5">
                            {recordings.map((rec: any) => (
                                <div
                                    key={rec.id}
                                    onClick={() => setPlayingRec(rec)}
                                    className={`p-2.5 border rounded-lg cursor-pointer transition-all ${playingRec?.id === rec.id
                                        ? 'bg-primary-500/20 border-primary-500/30'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-mono font-bold text-white">
                                            {new Date(rec.startTime).toLocaleTimeString()}
                                        </span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-primary-400">{rec.camera.name}</span>
                                    </div>
                                </div>
                            ))}
                            {selectedCamera === '' ? (
                                <p className="text-[9px] text-center text-slate-600 uppercase font-black tracking-widest py-10">Select a security node</p>
                            ) : (
                                recordings.length === 0 && !isLoading && (
                                    <p className="text-[9px] text-center text-slate-600 uppercase font-black tracking-widest py-10">No records found</p>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* Video Player Section */}
                <div className="flex-1 flex flex-col gap-4 min-w-0">
                    <div className="flex-1 bg-black rounded-[2rem] border border-white/5 overflow-hidden relative group shadow-2xl flex items-center justify-center">
                        {playingRec ? (
                            <video
                                ref={videoRef}
                                src={`http://${window.location.hostname}:3001/recordings/${playingRec.filename.includes('/') ? playingRec.filename : `${playingRec.cameraId}/${playingRec.filename}`}`}
                                controls={false} // Custom controls now
                                autoPlay
                                onTimeUpdate={handleVideoTimeUpdate}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => {
                                    // Prevent auto-skip if we JUST seeked (fixes "click -> skip" loop for short/truncated files)
                                    if (Date.now() - lastSeekRef.current < 2000) {
                                        console.log("Ignored auto-advance (recent seek)");
                                        setIsPlaying(false);
                                        return;
                                    }

                                    // List is sorted ASC (Time A -> Time Z)
                                    const currentIndex = recordings.findIndex((r: any) => r.id === playingRec.id);

                                    if (currentIndex >= 0 && currentIndex < recordings.length - 1) {
                                        const nextRec = recordings[currentIndex + 1]; // Next video in sequence
                                        console.log("Auto-playing next segment:", nextRec.filename);
                                        setPlayingRec(nextRec);
                                    } else {
                                        setIsPlaying(false);
                                    }
                                }}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-6 opacity-40">
                                <Film size={64} className="text-slate-800 animate-pulse" />
                                <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-700">Select footage to play</p>
                            </div>
                        )}

                        {/* Overlay Controls if paused? Or just rely on timeline */}
                    </div>

                    {/* Stats bar */}
                    {playingRec && (
                        <div className="shrink-0 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex justify-between items-center">
                            <div className="flex gap-8">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Source Node</span>
                                    <span className="text-[10px] font-bold text-white">{playingRec.camera.name}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Recorded At</span>
                                    <span className="text-[10px] font-bold text-white">{new Date(playingRec.startTime).toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">File Size</span>
                                    <span className="text-[10px] font-bold text-white">{(Number(playingRec.size) / 1024 / 1024).toFixed(2)} MB</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {/* Removed Download button as per user request */}
                                <button className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white transition-all">
                                    <Share2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Component */}
            <div className="shrink-0">
                <Timeline
                    recordings={recordings}
                    selectedDate={selectedDate}
                    currentTime={currentGlobalTime}
                    isPlaying={isPlaying}
                    volume={volume}
                    zoomLevel={zoomLevel}
                    onSeek={handleSeek}
                    onTogglePlay={togglePlay}
                    onVolumeChange={handleVolumeChange}
                    onZoomChange={setZoomLevel}
                    onExport={handleExportRequest}
                />
            </div>

            {/* Export Modal */}
            {isExportModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6">
                        <div>
                            <h3 className="text-2xl font-black text-white">Export Footage</h3>
                            <p className="text-slate-400 text-sm mt-1">Choose where to save the exported clip.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Drive Selection - Only if drives exist */}
                            {availableDrives.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Detected Drives</label>
                                    <div className="grid gap-2">
                                        {availableDrives.map(drive => (
                                            <button
                                                key={drive}
                                                onClick={() => setExportPath(drive)}
                                                className={`p-3 rounded-xl border text-left text-xs font-mono transition-all ${exportPath === drive
                                                    ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                                                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                                                    }`}
                                            >
                                                {drive}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {availableDrives.length > 0 ? "Or Save Internally" : "Destination"}
                                </label>
                                <button
                                    onClick={() => setExportPath('')}
                                    className={`w-full p-4 rounded-xl border text-left text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-between ${exportPath === ''
                                        ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${exportPath === '' ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                                            <Film size={18} className={exportPath === '' ? 'text-blue-400' : 'text-slate-500'} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span>Save to Exports Page</span>
                                            <span className="text-[9px] text-slate-500 font-normal normal-case tracking-normal">Clip will be available for download in the "Video Exports" tab.</span>
                                        </div>
                                    </span>
                                    {exportPath === '' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                            <button
                                onClick={() => setIsExportModalOpen(false)}
                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-xs font-bold uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmExport}
                                disabled={isExporting}
                                className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary-900/20 flex items-center justify-center gap-2"
                            >
                                {isExporting ? (
                                    <>
                                        <RefreshCw size={14} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Download size={14} />
                                        {exportPath ? 'Save to Drive' : 'Save Clip'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default PlaybackPage;
