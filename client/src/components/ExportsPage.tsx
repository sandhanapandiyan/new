import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Film, HardDrive, AlertTriangle } from 'lucide-react';

// Use same hostname logic as base app
const API_BASE = `http://${window.location.hostname}:3001/api`;

const ExportsPage: React.FC = () => {
    const [exports, setExports] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchExports = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/exports`);
            setExports(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch exports", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchExports();
    }, []);

    const handleDownload = (file: any) => {
        // Enforce Restriction: No downloading on Server (Pi) directly
        const hostname = window.location.hostname;
        // Check for localhost or typical Pi hostname (optional, but requested logic)
        // If accessed via localhost, 127.0.0.1, or ::1, we assume it's the device itself.
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
            alert("⚠️ STORAGE WARNING\n\nDo not download exported files directly to the server's SD card as it will fill up space.\n\nPlease access this dashboard from another device (Mobile/PC) to download.");
            return;
        }

        // Proceed with download
        const link = document.createElement('a');
        link.href = `http://${window.location.hostname}:3001${file.url}`;
        link.download = file.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-white">Exports & Clips</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage saved footage</p>
                </div>
                <button
                    onClick={fetchExports}
                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors"
                >
                    <HardDrive size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin pr-2">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin text-primary-500">
                            <HardDrive size={32} />
                        </div>
                    </div>
                ) : exports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
                        <Film size={64} className="text-slate-700" />
                        <p className="text-sm font-black uppercase tracking-widest text-slate-600">No exports found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {exports.map((file) => (
                            <div key={file.filename} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col group hover:bg-slate-900/80 transition-all">
                                <div className="aspect-video bg-black/50 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                                    {/* Preview could go here if we had thumbnails, usage generic icon for now */}
                                    <Film size={32} className="text-slate-600 group-hover:text-primary-500 transition-colors" />
                                    <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-[9px] font-mono text-white">
                                        MP4
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-white truncate" title={file.filename}>
                                            {file.filename}
                                        </h3>
                                        <div className="flex gap-4 mt-2">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-slate-500">Size</span>
                                                <span className="text-xs text-slate-300">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-slate-500">Created</span>
                                                <span className="text-xs text-slate-300">{new Date(file.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDownload(file)}
                                        className="mt-4 w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-900/20"
                                    >
                                        <Download size={14} />
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-500 shrink-0" />
                <div>
                    <h4 className="text-yellow-500 text-xs font-black uppercase tracking-widest">Storage Policy</h4>
                    <p className="text-yellow-200/60 text-[10px] mt-1 leading-relaxed">
                        Exports shown here are stored temporarily in the system. Files older than 3 hours are automatically deleted.
                        Please download essential clips to your personal device immediately.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExportsPage;
