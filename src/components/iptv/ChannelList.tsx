'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { M3UChannel, ContentType } from '@/types/iptv';
import { searchChannels, filterChannelsByGroup, sortChannels } from '@/lib/m3uParser';

interface ChannelListProps {
  channels: M3UChannel[];
  groups: string[];
  activeChannel: M3UChannel | null;
  onChannelSelect: (channel: M3UChannel) => void;
  onFavoriteToggle?: (channelId: string) => void;
  favorites?: string[];
}

export default function ChannelList({
  channels,
  groups,
  activeChannel,
  onChannelSelect,
  onFavoriteToggle,
  favorites = [],
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | 'all'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'group'>('name');

  // Filter and sort channels
  const filteredChannels = useMemo(() => {
    let result = channels;

    // Search filter
    if (searchQuery) {
      result = searchChannels(result, searchQuery);
    }

    // Group filter
    if (selectedGroup) {
      result = filterChannelsByGroup(result, selectedGroup);
    }

    // Content type filter
    if (contentTypeFilter !== 'all') {
      result = result.filter((ch) => ch.contentType === contentTypeFilter);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      result = result.filter((ch) => favorites.includes(ch.id));
    }

    // Sort
    result = sortChannels(result, sortBy);

    return result;
  }, [channels, searchQuery, selectedGroup, contentTypeFilter, showFavoritesOnly, sortBy, favorites]);

  // Get content type icon
  const getContentTypeIcon = (type?: ContentType) => {
    switch (type) {
      case 'live':
        return '📺';
      case 'movie':
        return '🎬';
      case 'series':
        return '📺';
      default:
        return '📡';
    }
  };

  // Handle channel click
  const handleChannelClick = useCallback(
    (channel: M3UChannel) => {
      onChannelSelect(channel);
    },
    [onChannelSelect]
  );

  return (
    <div className="h-full flex flex-col glass-dark">
      {/* Header with search and filters */}
      <div className="p-4 border-b border-white/10">
        {/* Search */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Rechercher une chaîne..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full input-futuristic rounded-lg pl-10 pr-4 py-2"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2">
          {/* Group filter */}
          <select
            value={selectedGroup || ''}
            onChange={(e) => setSelectedGroup(e.target.value || null)}
            className="input-futuristic rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]"
          >
            <option value="">Tous les groupes</option>
            {groups.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          {/* Content type filter */}
          <select
            value={contentTypeFilter}
            onChange={(e) => setContentTypeFilter(e.target.value as ContentType | 'all')}
            className="input-futuristic rounded px-3 py-1.5 text-sm"
          >
            <option value="all">Tout</option>
            <option value="live">📺 Live</option>
            <option value="movie">🎬 Films</option>
            <option value="series">📺 Séries</option>
          </select>

          {/* Favorites toggle */}
          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`px-3 py-1.5 rounded text-sm transition-all ${
              showFavoritesOnly
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/30'
            }`}
          >
            ⭐ Favoris
          </button>
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
          <span>Trier par:</span>
          <button
            onClick={() => setSortBy('name')}
            className={`px-2 py-1 rounded ${sortBy === 'name' ? 'bg-cyan-500/20 text-cyan-400' : 'hover:text-white'}`}
          >
            Nom
          </button>
          <button
            onClick={() => setSortBy('group')}
            className={`px-2 py-1 rounded ${sortBy === 'group' ? 'bg-cyan-500/20 text-cyan-400' : 'hover:text-white'}`}
          >
            Groupe
          </button>
          <span className="ml-auto">
            {filteredChannels.length} / {channels.length} chaînes
          </span>
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto">
        {filteredChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <span className="text-4xl mb-2">📭</span>
            <p>Aucune chaîne trouvée</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-cyan-400 hover:underline"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredChannels.map((channel) => {
              const isActive = activeChannel?.id === channel.id;
              const isFavorite = favorites.includes(channel.id);

              return (
                <div
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${
                    isActive
                      ? 'channel-active bg-cyan-500/10'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {/* Logo */}
                  <div className="w-10 h-10 rounded bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.parentNode as HTMLElement).innerHTML = getContentTypeIcon(channel.contentType);
                        }}
                      />
                    ) : (
                      <span>{getContentTypeIcon(channel.contentType)}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        isActive ? 'text-cyan-400 neon-text' : 'text-white'
                      }`}
                    >
                      {channel.name}
                    </p>
                    {channel.group && (
                      <p className="text-xs text-gray-500 truncate">{channel.group}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Favorite button */}
                    {onFavoriteToggle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFavoriteToggle(channel.id);
                        }}
                        className={`p-1 rounded transition-colors ${
                          isFavorite
                            ? 'text-yellow-400'
                            : 'text-gray-600 hover:text-yellow-400'
                        }`}
                      >
                        {isFavorite ? '★' : '☆'}
                      </button>
                    )}

                    {/* Playing indicator */}
                    {isActive && (
                      <div className="flex items-center gap-0.5">
                        <span className="w-1 h-3 bg-cyan-400 rounded-full animate-pulse" />
                        <span
                          className="w-1 h-4 bg-cyan-400 rounded-full animate-pulse"
                          style={{ animationDelay: '0.2s' }}
                        />
                        <span
                          className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse"
                          style={{ animationDelay: '0.4s' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
