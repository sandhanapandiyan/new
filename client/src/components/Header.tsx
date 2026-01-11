import React from 'react';

interface HeaderProps {
    title: string;
    systemStats: any;
    onLoginClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ title, systemStats, onLoginClick }) => {
    const [time, setTime] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className="mb-10 flex flex-col gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white flex items-center gap-3">
                        {title}
                        <span className="px-2 py-0.5 bg-primary-500/10 border border-primary-500/20 rounded text-[10px] tracking-widest uppercase text-primary-400 mt-1 italic animate-pulse">Live</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Node: {systemStats.hostname || 'RPI-NODE-01'}</p>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <p className="text-primary-400/80 text-[10px] font-mono font-bold uppercase tracking-widest">
                            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                        </p>
                    </div>
                </div>

                {/* Login Button (Visible when sidebar hidden i.e. logged out, or just always accessible via header) */}
                {onLoginClick && (
                    <button
                        onClick={onLoginClick}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-700 transition-all"
                    >
                        Login
                    </button>
                )}
            </div>

        </header>
    );
};

export default Header;
