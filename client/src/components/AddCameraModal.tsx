import React, { useState } from 'react';
import { X, Camera, Link, User, Shield, Keyboard } from 'lucide-react';

interface AddCameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (camera: any) => void;
}

const AddCameraModal: React.FC<AddCameraModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        name: '',
        rtspUrl: '',
        username: '',
        password: '',
        recordMode: 'continuous'
    });

    const triggerKeyboard = (e: React.MouseEvent) => {
        // Find the input sibling and focus it
        const container = e.currentTarget.parentElement;
        const input = container?.querySelector('input');
        input?.focus();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80" onClick={onClose} />

            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-br from-primary-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary-500 p-3 rounded-2xl">
                            <Camera className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">Add Security Node</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Register RTSP Asset</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Friendly Name</label>
                        <div className="relative group">
                            <input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                type="text"
                                placeholder="e.g. Front Gate HQ"
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 transition-all text-white"
                            />
                            <button
                                onClick={triggerKeyboard}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                            >
                                <Keyboard size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">RTSP Stream Path</label>
                        <div className="relative group">
                            <Link className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary-400" size={16} />
                            <input
                                value={formData.rtspUrl}
                                onChange={(e) => setFormData({ ...formData, rtspUrl: e.target.value })}
                                type="text"
                                placeholder="rtsp://192.168.1.10..."
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 transition-all text-white font-mono text-xs"
                            />
                            <button
                                onClick={triggerKeyboard}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                            >
                                <Keyboard size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Auth User</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary-400" size={16} />
                                <input
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    type="text"
                                    placeholder="admin"
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 transition-all text-white text-sm"
                                />
                                <button
                                    onClick={triggerKeyboard}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                                >
                                    <Keyboard size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Auth Secret</label>
                            <div className="relative group">
                                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-primary-400" size={16} />
                                <input
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 pl-12 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 transition-all text-white text-sm"
                                />
                                <button
                                    onClick={triggerKeyboard}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                                >
                                    <Keyboard size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-900/50 border-t border-white/5 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 px-6 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition-all border border-white/5"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onAdd(formData)}
                        className="flex-[2] py-4 px-6 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white font-black uppercase tracking-widest shadow-xl shadow-primary-900/20 transition-all active:scale-95"
                    >
                        Deploy Node
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddCameraModal;
