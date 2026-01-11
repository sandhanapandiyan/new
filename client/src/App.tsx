import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import CameraGrid from './components/CameraGrid.tsx';
import AddCameraModal from './components/AddCameraModal.tsx';
import SettingsPage from './components/SettingsPage.tsx';
import VirtualKeyboard from './components/VirtualKeyboard.tsx';
import PlaybackPage from './components/PlaybackPage.tsx';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();
const API_BASE = 'http://localhost:3001/api';

import LoginModal from './components/LoginModal.tsx';
import ExportsPage from './components/ExportsPage.tsx';

const DashboardContent = () => {
  // Initialize from localStorage or default
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'live');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const client = useQueryClient();

  // Persist activeTab changes
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  // Persist isLoggedIn changes
  useEffect(() => {
    localStorage.setItem('isLoggedIn', String(isLoggedIn));
  }, [isLoggedIn]);

  // Add Camera Mutation
  const addCameraMutation = useMutation({
    mutationFn: async (newCam: any) => {
      await axios.post(`${API_BASE}/cameras`, newCam);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['cameras'] });
      setIsAddModalOpen(false);
    }
  });

  // Fetch Cameras
  const { data: cameras = [] } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/cameras`);
      return data;
    },
    refetchInterval: 10000
  });

  // Fetch Settings (for Node Name)
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/settings`);
      return data;
    }
  });

  // Fetch System Stats
  const { data: systemStatsRaw = { cpu: '...', temp: '...', memory: '...', uptime: '...', ip: '...', hostname: '...' } } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/stats`);
      return data;
    },
    refetchInterval: 5000
  });

  // Override hostname if configured
  const systemStats = {
    ...systemStatsRaw,
    hostname: settings?.nodeName || systemStatsRaw.hostname
  };

  const deleteCameraMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_BASE}/cameras/${id}`);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['cameras'] });
    }
  });

  const getPageTitle = () => {
    switch (activeTab) {
      case 'live': return 'Live Monitoring';
      case 'playback': return 'Historical Playback';
      case 'exports': return 'Video Exports';
      case 'settings': return 'System Configuration';
      default: return 'Dashboard';
    }
  };

  const renderContent = () => {
    const LiveView = () => (
      <CameraGrid
        cameras={cameras}
        isLoggedIn={isLoggedIn}
        onAddClick={() => setIsAddModalOpen(true)}
        onCameraDelete={(id: string) => {
          if (confirm('Are you sure you want to delete this camera?')) {
            deleteCameraMutation.mutate(id);
          }
        }}
      />
    );

    switch (activeTab) {
      case 'live':
        return <LiveView />;
      case 'playback':
        return <PlaybackPage />;
      case 'exports':
        return <ExportsPage />;
      case 'settings':
        return <SettingsPage systemStats={systemStats} />;
      default:
        return <LiveView />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100">
      {isLoggedIn && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isLoggedIn={isLoggedIn}
          onLoginClick={() => setIsLoginModalOpen(true)}
          onLogoutClick={() => {
            setIsLoggedIn(false);
            setActiveTab('live');
          }}
        />
      )}

      <main className={`flex-1 ${isLoggedIn ? 'ml-64' : ''} p-8 min-h-screen premium-gradient`}>
        <Header
          title={getPageTitle()}
          systemStats={systemStats}
          onLoginClick={!isLoggedIn ? () => setIsLoginModalOpen(true) : undefined}
        />

        {renderContent()}

        <AddCameraModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={(data) => addCameraMutation.mutate(data)}
        />

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLogin={() => setIsLoggedIn(true)}
        />

        <VirtualKeyboard />
      </main>
    </div>
  );
};

import { Toaster } from 'react-hot-toast';

import { KeyboardProvider } from './context/KeyboardContext';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <KeyboardProvider>
      <DashboardContent />
      <Toaster
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          },
        }}
      />
    </KeyboardProvider>
  </QueryClientProvider>
);

export default App;
