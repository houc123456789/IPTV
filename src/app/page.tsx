'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { M3UPlaylist, M3UChannel } from '@/types/iptv';
import VideoPlayer from '@/components/iptv/VideoPlayer';
import ChannelList from '@/components/iptv/ChannelList';
import PlaylistLoader from '@/components/iptv/PlaylistLoader';

// Clés localStorage
const STORAGE_KEYS = {
  PLAYLIST: 'iptv_playlist',
  FAVORITES: 'iptv_favorites',
  LAST_CHANNEL: 'iptv_last_channel',
};

export default function PlayerPage() {
  const [playlist, setPlaylist] = useState<M3UPlaylist | null>(null);
  const [activeChannel, setActiveChannel] = useState<M3UChannel | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showLoader, setShowLoader] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setIsHydrated(true);

    // Load favorites
    const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch {
        console.error('Failed to parse favorites');
      }
    }

    // Load playlist
    const savedPlaylist = localStorage.getItem(STORAGE_KEYS.PLAYLIST);
    if (savedPlaylist) {
      try {
        const parsed = JSON.parse(savedPlaylist);
        parsed.createdAt = new Date(parsed.createdAt);
        setPlaylist(parsed);

        // Load last channel
        const lastChannelId = localStorage.getItem(STORAGE_KEYS.LAST_CHANNEL);
        if (lastChannelId) {
          const channel = parsed.channels.find((ch: M3UChannel) => ch.id === lastChannelId);
          if (channel) {
            setActiveChannel(channel);
          }
        }
      } catch {
        console.error('Failed to parse playlist');
      }
    }
  }, []);

  // Save playlist to localStorage
  useEffect(() => {
    if (isHydrated && playlist) {
      localStorage.setItem(STORAGE_KEYS.PLAYLIST, JSON.stringify(playlist));
    }
  }, [playlist, isHydrated]);

  // Save favorites to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    }
  }, [favorites, isHydrated]);

  // Save last channel to localStorage
  useEffect(() => {
    if (isHydrated && activeChannel) {
      localStorage.setItem(STORAGE_KEYS.LAST_CHANNEL, activeChannel.id);
    }
  }, [activeChannel, isHydrated]);

  // Handle playlist loaded
  const handlePlaylistLoaded = useCallback((newPlaylist: M3UPlaylist) => {
    setPlaylist(newPlaylist);
    setShowLoader(false);

    // Auto-select first channel
    if (newPlaylist.channels.length > 0) {
      setActiveChannel(newPlaylist.channels[0]);
    }
  }, []);

  // Handle channel selection
  const handleChannelSelect = useCallback((channel: M3UChannel) => {
    setActiveChannel(channel);
  }, []);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback((channelId: string) => {
    setFavorites((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  }, []);

  // Clear playlist
  const handleClearPlaylist = useCallback(() => {
    setPlaylist(null);
    setActiveChannel(null);
    localStorage.removeItem(STORAGE_KEYS.PLAYLIST);
    localStorage.removeItem(STORAGE_KEYS.LAST_CHANNEL);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 glass border-b border-white/10 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors md:hidden"
          >
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">
            <span className="neon-text">IPTV</span>
            <span className="text-purple-400 neon-text-purple"> Player</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {playlist && (
            <>
              <span className="text-xs text-gray-400 hidden sm:block">
                {playlist.channels.length} chaînes
              </span>
              <button
                onClick={handleClearPlaylist}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                title="Supprimer la playlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => setShowLoader(true)}
            className="btn-futuristic text-xs py-2 px-4"
          >
            <span className="mr-2">📺</span>
            {playlist ? 'Changer' : 'Ajouter'} Playlist
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Channel List */}
        <aside
          className={`w-80 flex-shrink-0 border-r border-white/10 transition-all duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full absolute md:relative md:translate-x-0'
          } ${!sidebarOpen && 'md:w-0 md:opacity-0'} h-full z-20 md:z-0`}
        >
          {playlist ? (
            <ChannelList
              channels={playlist.channels}
              groups={playlist.groups}
              activeChannel={activeChannel}
              onChannelSelect={handleChannelSelect}
              onFavoriteToggle={handleFavoriteToggle}
              favorites={favorites}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center glass-dark">
              <div className="text-6xl mb-4 opacity-50">📡</div>
              <h3 className="text-lg font-medium text-white mb-2">Aucune Playlist</h3>
              <p className="text-gray-400 text-sm mb-4">
                Importez une playlist M3U ou connectez-vous à un serveur Xtream Code
              </p>
              <button onClick={() => setShowLoader(true)} className="btn-futuristic text-sm">
                Charger une Playlist
              </button>
            </div>
          )}
        </aside>

        {/* Toggle sidebar button (desktop) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-6 h-12 items-center justify-center bg-white/5 hover:bg-white/10 border-r border-y border-white/10 rounded-r-lg transition-all"
          style={{ left: sidebarOpen ? '320px' : '0' }}
        >
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Video Player */}
        <main className="flex-1 relative">
          <VideoPlayer
            channel={activeChannel}
            onError={(error) => console.error('Player error:', error)}
          />

          {/* Quick channel navigation */}
          {playlist && activeChannel && (
            <div className="absolute bottom-20 right-4 flex flex-col gap-2">
              <button
                onClick={() => {
                  const currentIndex = playlist.channels.findIndex(
                    (ch) => ch.id === activeChannel.id
                  );
                  if (currentIndex > 0) {
                    setActiveChannel(playlist.channels[currentIndex - 1]);
                  }
                }}
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Chaîne précédente"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const currentIndex = playlist.channels.findIndex(
                    (ch) => ch.id === activeChannel.id
                  );
                  if (currentIndex < playlist.channels.length - 1) {
                    setActiveChannel(playlist.channels[currentIndex + 1]);
                  }
                }}
                className="w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/20 transition-colors"
                title="Chaîne suivante"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Playlist Loader Modal */}
      {showLoader && (
        <PlaylistLoader
          onPlaylistLoaded={handlePlaylistLoaded}
          onClose={() => setShowLoader(false)}
        />
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
