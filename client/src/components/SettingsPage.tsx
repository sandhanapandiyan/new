import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
    HardDrive,
    Shield,
    Clock,
    Settings as SettingsIcon,
    Save,
    Keyboard,
    Info,
    Server,
    Database,
    Cpu,
    Activity,
    ShieldCheck
} from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

interface SettingsPageProps {
    systemStats: any;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ systemStats }) => {
    const queryClient = useQueryClient();

    const { data: serverSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await axios.get(`${API_BASE}/settings`);
            return data;
        },
        staleTime: Infinity
    });

    // Default values if server response is delayed or empty
    const defaults = { cleanThreshold: 80, retentionGb: 200, nodeName: 'RPI-NODE-01' };

    const [localSettings, setLocalSettings] = React.useState(defaults);
    const [hasChanges, setHasChanges] = React.useState(false);

    // Sync local state when server settings are loaded (only if no unsaved changes)
    React.useEffect(() => {
        if (serverSettings && !hasChanges) {
            setLocalSettings(serverSettings);
        }
    }, [serverSettings, hasChanges]);

    const handleChange = (key: string, value: number | string) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true); // Simplified dirty checking
    };

    const handleDiscard = () => {
        if (serverSettings) {
            setLocalSettings(serverSettings);
        } else {
            setLocalSettings(defaults);
        }
        setHasChanges(false);
    };

    const saveMutation = useMutation({
        mutationFn: async (newSettings: any) => {
            await axios.post(`${API_BASE}/settings`, newSettings);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            setHasChanges(false);
            toast.success("System configuration saved successfully");
        },
        onError: () => {
            toast.error("Failed to save settings");
        }
    });

    const triggerKeyboard = (e: React.MouseEvent) => {
        const container = e.currentTarget.parentElement;
        const input = container?.querySelector('input');
        input?.focus();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* System Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    icon={<Cpu size={18} />}
                    label="System Load"
                    value={systemStats.cpu}
                    trend="CPU"
                    color="primary"
                />
                <StatCard
                    icon={<Activity size={18} />}
                    label="Core Temp"
                    value={systemStats.temp}
                    trend="Thermal"
                    color="emerald"
                />
                <StatCard
                    icon={<HardDrive size={18} />}
                    label="Disk Usage"
                    value={systemStats.storage}
                    trend="Storage"
                    color="blue"
                />
                <StatCard
                    icon={<ShieldCheck size={18} />}
                    label="Encrypted"
                    value="Optimal"
                    trend="Security"
                    color="violet"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Storage Configuration */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-400">
                            <HardDrive size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">Storage Management</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 text-xs">Configure Data Retention</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Cleanup Threshold (%)</label>
                            <input
                                type="range"
                                min="50"
                                max="95"
                                value={localSettings.cleanThreshold}
                                onChange={(e) => handleChange('cleanThreshold', parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                            />
                            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500 px-1">
                                <span>50%</span>
                                <span className="text-primary-400">Selected: {localSettings.cleanThreshold}%</span>
                                <span>95%</span>
                            </div>
                        </div>



                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Node Identifier (Name)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={localSettings.nodeName}
                                    onChange={(e) => handleChange('nodeName', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-white font-mono"
                                    placeholder="RPI-NODE-01"
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
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Max Storage Buffer (GB)</label>
                            <input
                                type="number"
                                value={localSettings.retentionGb}
                                onChange={(e) => handleChange('retentionGb', parseInt(e.target.value))}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-white text-sm"
                            />
                        </div>


                    </div>
                </div>

                {/* System Information */}
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-[2.5rem] p-8 space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-400">
                            <Info size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">Node Intelligence</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 text-xs">Hardware Specifications</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <InfoRow label="Node Hostname" value={systemStats.hostname} icon={<SettingsIcon size={14} />} />
                        <InfoRow label="IP Address" value={systemStats.ip} icon={<Server size={14} />} />
                        <InfoRow label="System Database" value="SQLite 3.5 (WAL)" icon={<Database size={14} />} />
                        <InfoRow label="Uptime" value={systemStats.uptime} icon={<Clock size={14} />} />
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between p-4 bg-primary-500/5 rounded-2xl border border-primary-500/10">
                            <div className="flex items-center gap-3">
                                <Shield className="text-primary-400" size={18} />
                                <span className="text-xs font-bold">Node Security Status</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary-400 bg-primary-400/10 px-2 py-1 rounded-md">Optimal</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={handleDiscard}
                    disabled={!hasChanges}
                    className="px-8 py-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all border border-white/5"
                >
                    Discard Changes
                </button>
                <button
                    onClick={() => saveMutation.mutate(localSettings)}
                    disabled={!hasChanges || saveMutation.isPending}
                    className="px-10 py-4 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-xl shadow-primary-900/20 flex items-center gap-2"
                >
                    <Save size={16} />
                    {saveMutation.isPending ? 'Saving...' : 'Save Protocol'}
                </button>
            </div>
        </div >
    );
};

const InfoRow = ({ label, value, icon }: any) => (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-colors border border-transparent hover:border-white/5">
        <div className="flex items-center gap-3 text-slate-400">
            {icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-sm font-mono font-bold text-white">{value}</span>
    </div>
);

const StatCard = ({ icon, label, value, trend, color }: any) => {
    const colors: any = {
        primary: 'text-primary-400 bg-primary-400/10',
        emerald: 'text-emerald-400 bg-emerald-400/10',
        blue: 'text-blue-400 bg-blue-400/10',
        violet: 'text-violet-400 bg-violet-400/10',
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 p-4 rounded-3xl flex items-center justify-between hover:bg-slate-900/60 transition-colors group">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform duration-300`}>
                    {icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                    <span className="text-lg font-black text-white">{value}</span>
                </div>
            </div>
            <div className="text-right">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[color]}`}>{trend}</span>
            </div>
        </div>
    );
};

export default SettingsPage;
