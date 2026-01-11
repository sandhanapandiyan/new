import React, { useState } from 'react';
import { X, Lock, Keyboard } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogin: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const triggerKeyboard = (e: React.MouseEvent) => {
        const container = e.currentTarget.parentElement;
        const input = container?.querySelector('input');
        input?.focus();
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Hardcoded for demo/simplicity as requested, no backend flow
        if (username === 'admin' && password === 'admin') {
            onLogin();
            onClose();
            toast.success('Successfully logged in');
        } else {
            toast.error('Invalid credentials');
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-sm relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-primary-500/10 rounded-2xl flex items-center justify-center mb-4 text-primary-400">
                        <Lock size={32} />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white">Admin Access</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Secure Authentication</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Username</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-white text-sm"
                                placeholder="Enter username"
                            />
                            <button
                                type="button"
                                onClick={triggerKeyboard}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                            >
                                <Keyboard size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-white text-sm"
                                placeholder="Enter password"
                            />
                            <button
                                type="button"
                                onClick={triggerKeyboard}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded-lg transition-all"
                            >
                                <Keyboard size={16} />
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-lg shadow-primary-900/20 mt-4"
                    >
                        Authenticate
                    </button>
                </form>

            </div>
        </div>
    );
};

export default LoginModal;
