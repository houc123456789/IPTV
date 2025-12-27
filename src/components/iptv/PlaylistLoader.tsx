'use client';

import React, { useState, useRef, useCallback } from 'react';
import { M3UPlaylist, XtreamCredentials } from '@/types/iptv';
import { parseM3U, isValidM3U } from '@/lib/m3uParser';
import { createXtreamService, parseXtreamUrl } from '@/lib/xtreamService';

type LoaderTab = 'm3u-file' | 'm3u-url' | 'xtream';

interface PlaylistLoaderProps {
  onPlaylistLoaded: (playlist: M3UPlaylist) => void;
  onClose: () => void;
}

export default function PlaylistLoader({ onPlaylistLoaded, onClose }: PlaylistLoaderProps) {
  const [activeTab, setActiveTab] = useState<LoaderTab>('m3u-file');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // M3U URL state
  const [m3uUrl, setM3uUrl] = useState('');

  // Xtream state
  const [xtreamServer, setXtreamServer] = useState('');
  const [xtreamUsername, setXtreamUsername] = useState('');
  const [xtreamPassword, setXtreamPassword] = useState('');
  const [xtreamUrl, setXtreamUrl] = useState('');
  const [contentType, setContentType] = useState<'live' | 'vod' | 'all'>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);

      try {
        const content = await file.text();

        if (!isValidM3U(content)) {
          throw new Error('Ce fichier ne semble pas être une playlist M3U valide');
        }

        const playlist = parseM3U(content);
        playlist.name = file.name.replace(/\.(m3u8?|txt)$/i, '');
        playlist.source = 'file';

        onPlaylistLoaded(playlist);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement du fichier');
      } finally {
        setIsLoading(false);
      }
    },
    [onPlaylistLoaded]
  );

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  // Handle URL load - always fetch as M3U via proxy
  const handleUrlLoad = async () => {
    if (!m3uUrl.trim()) {
      setError('Veuillez entrer une URL');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Use proxy to fetch M3U content
      const response = await fetch('/api/m3u', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: m3uUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }

      const { content } = await response.json();

      if (!isValidM3U(content)) {
        throw new Error('Le contenu ne semble pas être une playlist M3U valide');
      }

      const playlist = parseM3U(content);
      playlist.source = 'url';
      onPlaylistLoaded(playlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la playlist');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Xtream connection
  const handleXtreamConnect = async () => {
    let credentials: XtreamCredentials;

    // Try to parse from URL first
    if (xtreamUrl.trim()) {
      const parsed = parseXtreamUrl(xtreamUrl);
      if (parsed) {
        credentials = parsed;
      } else {
        setError("Format d'URL Xtream invalide");
        return;
      }
    } else if (xtreamServer && xtreamUsername && xtreamPassword) {
      credentials = {
        server: xtreamServer,
        username: xtreamUsername,
        password: xtreamPassword,
      };
    } else {
      setError('Veuillez remplir tous les champs ou coller une URL Xtream');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const service = createXtreamService(credentials);
      await service.authenticate();

      let playlist: M3UPlaylist;
      switch (contentType) {
        case 'live':
          playlist = await service.getAllLiveAsPlaylist();
          break;
        case 'vod':
          playlist = await service.getAllVodAsPlaylist();
          break;
        default:
          playlist = await service.getAllContentAsPlaylist();
      }

      onPlaylistLoaded(playlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion au serveur Xtream');
    } finally {
      setIsLoading(false);
    }
  };

  // Tabs configuration
  const tabs: { id: LoaderTab; label: string; icon: string }[] = [
    { id: 'm3u-file', label: 'Fichier M3U', icon: '📁' },
    { id: 'm3u-url', label: 'URL M3U', icon: '🔗' },
    { id: 'xtream', label: 'Xtream Code', icon: '🌐' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass rounded-2xl neon-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold neon-text">Charger une Playlist</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError(null);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'tab-active text-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* M3U File Tab */}
          {activeTab === 'm3u-file' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-white/20 hover:border-white/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".m3u,.m3u8,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              <div className="text-5xl mb-4">📂</div>
              <p className="text-white font-medium mb-2">Glissez-déposez un fichier M3U</p>
              <p className="text-gray-400 text-sm mb-4">ou</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="btn-futuristic"
              >
                {isLoading ? 'Chargement...' : 'Parcourir'}
              </button>
              <p className="text-gray-500 text-xs mt-4">Formats supportés: .m3u, .m3u8, .txt</p>
            </div>
          )}

          {/* M3U URL Tab */}
          {activeTab === 'm3u-url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">URL de la playlist</label>
                <input
                  type="url"
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                  placeholder="https://example.com/playlist.m3u"
                  className="w-full input-futuristic rounded-lg"
                />
              </div>

              <p className="text-xs text-gray-500">
                Supporte les URLs M3U standard et les URLs Xtream avec paramètres
                (username/password)
              </p>

              <button
                onClick={handleUrlLoad}
                disabled={isLoading || !m3uUrl.trim()}
                className="w-full btn-futuristic disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    Chargement...
                  </span>
                ) : (
                  'Charger la Playlist'
                )}
              </button>
            </div>
          )}

          {/* Xtream Code Tab */}
          {activeTab === 'xtream' && (
            <div className="space-y-4">
              {/* URL paste option */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Coller une URL Xtream (optionnel)
                </label>
                <input
                  type="url"
                  value={xtreamUrl}
                  onChange={(e) => setXtreamUrl(e.target.value)}
                  placeholder="http://server.com:port/get.php?username=xxx&password=xxx"
                  className="w-full input-futuristic rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-500 text-xs">OU</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Manual entry */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Serveur</label>
                  <input
                    type="url"
                    value={xtreamServer}
                    onChange={(e) => setXtreamServer(e.target.value)}
                    placeholder="http://server.com:port"
                    className="w-full input-futuristic rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Utilisateur</label>
                    <input
                      type="text"
                      value={xtreamUsername}
                      onChange={(e) => setXtreamUsername(e.target.value)}
                      placeholder="username"
                      className="w-full input-futuristic rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Mot de passe</label>
                    <input
                      type="password"
                      value={xtreamPassword}
                      onChange={(e) => setXtreamPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full input-futuristic rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Content type selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type de contenu</label>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'Tout', icon: '🌐' },
                    { value: 'live', label: 'Live TV', icon: '📺' },
                    { value: 'vod', label: 'VOD', icon: '🎬' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setContentType(option.value as typeof contentType)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm transition-all ${
                        contentType === option.value
                          ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-400'
                          : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/30'
                      }`}
                    >
                      {option.icon} {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleXtreamConnect}
                disabled={isLoading}
                className="w-full btn-futuristic disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                    Connexion...
                  </span>
                ) : (
                  'Se Connecter'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
