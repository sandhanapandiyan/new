import React from 'react';
import {
    History,
    Settings,
    ShieldCheck,
    Power,
    ChevronRight,
    Monitor,
    Film
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isLoggedIn: boolean;
    onLoginClick: () => void;
    onLogoutClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isLoggedIn, onLoginClick, onLogoutClick }) => {
    const menuItems = [
        { id: 'live', icon: <Monitor size={20} />, label: 'Live View', restricted: false },
        { id: 'playback', icon: <History size={20} />, label: 'Playback', restricted: true },
        { id: 'exports', icon: <Film size={20} />, label: 'Video Exports', restricted: true },
        { id: 'settings', icon: <Settings size={20} />, label: 'System Settings', restricted: true },
    ];

    return (
        <aside className="w-64 bg-[#050b18] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-50">
            <div className="p-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-900/20">
                    <ShieldCheck className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-lg tracking-tight">PRO NVR</h2>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enterprise v1.0</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {menuItems.map((item) => {
                    const isDisabled = !isLoggedIn && item.restricted;
                    return (
                        <button
                            key={item.id}
                            onClick={() => !isDisabled && setActiveTab(item.id)}
                            disabled={isDisabled}
                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
                                ? 'bg-primary-500/10 text-primary-400 border-l-2 border-primary-500 pl-4'
                                : isDisabled
                                    ? 'text-slate-600 cursor-not-allowed opacity-50'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`${activeTab === item.id ? 'text-primary-400' : isDisabled ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                    {item.icon}
                                </span>
                                <span className="font-medium text-sm">{item.label}</span>
                            </div>
                            {activeTab === item.id && <ChevronRight size={14} className="text-primary-500" />}
                            {isDisabled && <Settings size={14} className="text-slate-700" />}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-white/10 uppercase font-bold text-xs ${isLoggedIn ? 'bg-slate-800' : 'bg-slate-800/50'}`}>
                            {isLoggedIn ? 'AD' : 'GS'}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold">{isLoggedIn ? 'Admin' : 'Guest User'}</span>
                            <span className={`text-[10px] font-bold uppercase ${isLoggedIn ? 'text-emerald-500' : 'text-slate-500'}`}>
                                {isLoggedIn ? 'Superuser' : 'View Only'}
                            </span>
                        </div>
                    </div>

                    {isLoggedIn ? (
                        <button
                            onClick={onLogoutClick}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-slate-400 text-xs font-bold transition-all border border-white/5"
                        >
                            <Power size={14} />
                            Logout
                        </button>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className="w-full flex items-center justify-center gap-2 p-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white text-xs font-bold transition-all shadow-lg shadow-primary-900/20"
                        >
                            <Power size={14} />
                            Login Access
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
