import { M3UChannel, M3UPlaylist, M3UParserOptions, ContentType } from '@/types/iptv';

/**
 * Parser M3U avancé pour les playlists IPTV
 * Supporte les formats M3U standard et étendu (#EXTM3U)
 */

interface ExtInfData {
  duration: number;
  attributes: Record<string, string>;
  title: string;
}

/**
 * Parse une ligne #EXTINF pour extraire les métadonnées
 */
function parseExtInf(line: string): ExtInfData {
  const result: ExtInfData = {
    duration: -1,
    attributes: {},
    title: '',
  };

  // Enlever le préfixe #EXTINF:
  const content = line.replace(/^#EXTINF:\s*/, '');

  // Extraire la durée (premier nombre)
  const durationMatch = content.match(/^(-?\d+)/);
  if (durationMatch) {
    result.duration = parseInt(durationMatch[1], 10);
  }

  // Extraire les attributs (format: key="value")
  const attrRegex = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(content)) !== null) {
    result.attributes[match[1].toLowerCase()] = match[2];
  }

  // Extraire le titre (après la dernière virgule)
  const lastCommaIndex = content.lastIndexOf(',');
  if (lastCommaIndex !== -1) {
    result.title = content.substring(lastCommaIndex + 1).trim();
  }

  return result;
}

/**
 * Génère un ID unique pour une chaîne
 */
function generateChannelId(name: string, url: string): string {
  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      h = ((h << 5) - h) + char;
      h = h & h;
    }
    return Math.abs(h).toString(36);
  };
  return `ch_${hash(name + url)}`;
}

/**
 * Détecte le type de contenu basé sur l'URL et les métadonnées
 */
function detectContentType(url: string, group?: string): ContentType {
  const urlLower = url.toLowerCase();
  const groupLower = (group || '').toLowerCase();

  // VOD/Movies
  if (
    urlLower.includes('/movie/') ||
    urlLower.includes('/movies/') ||
    groupLower.includes('vod') ||
    groupLower.includes('movie') ||
    groupLower.includes('film')
  ) {
    return 'movie';
  }

  // Series
  if (
    urlLower.includes('/series/') ||
    groupLower.includes('series') ||
    groupLower.includes('série') ||
    groupLower.includes('episode')
  ) {
    return 'series';
  }

  // Live TV
  if (
    urlLower.includes('/live/') ||
    urlLower.endsWith('.m3u8') ||
    urlLower.endsWith('.ts') ||
    groupLower.includes('live') ||
    groupLower.includes('tv')
  ) {
    return 'live';
  }

  return 'unknown';
}

/**
 * Parse une playlist M3U et retourne les données structurées
 */
export function parseM3U(
  content: string,
  options: M3UParserOptions = {}
): M3UPlaylist {
  const {
    defaultGroup = 'Uncategorized',
    extractLogos = true,
    detectContentType: shouldDetectType = true,
  } = options;

  const lines = content.split(/\r?\n/);
  const channels: M3UChannel[] = [];
  const groupsSet = new Set<string>();
  let epgUrl: string | undefined;

  let currentExtInf: ExtInfData | null = null;
  let currentExtras: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // Header M3U avec URL EPG
    if (line.startsWith('#EXTM3U')) {
      const urlEpgMatch = line.match(/url-tvg="([^"]*)"/);
      if (urlEpgMatch) {
        epgUrl = urlEpgMatch[1];
      }
      continue;
    }

    // Ligne EXTINF
    if (line.startsWith('#EXTINF:')) {
      currentExtInf = parseExtInf(line);
      continue;
    }

    // Directives supplémentaires
    if (line.startsWith('#EXTVLCOPT:')) {
      const optMatch = line.match(/^#EXTVLCOPT:(.+?)=(.+)$/);
      if (optMatch) {
        currentExtras[optMatch[1].toLowerCase()] = optMatch[2];
      }
      continue;
    }

    if (line.startsWith('#EXTGRP:')) {
      currentExtras['group'] = line.replace('#EXTGRP:', '').trim();
      continue;
    }

    // Ignorer les autres directives
    if (line.startsWith('#')) continue;

    // C'est une URL de stream
    if (currentExtInf && (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('rtmp://'))) {
      const attrs = currentExtInf.attributes;
      const group = attrs['group-title'] || currentExtras['group'] || defaultGroup;

      groupsSet.add(group);

      const channel: M3UChannel = {
        id: generateChannelId(currentExtInf.title, line),
        name: currentExtInf.title || attrs['tvg-name'] || 'Unknown',
        url: line,
        group,
      };

      // Attributs optionnels
      if (extractLogos) {
        channel.logo = attrs['tvg-logo'] || attrs['logo'] || undefined;
        channel.tvgLogo = attrs['tvg-logo'];
      }

      if (attrs['tvg-id']) channel.tvgId = attrs['tvg-id'];
      if (attrs['tvg-name']) channel.tvgName = attrs['tvg-name'];
      if (attrs['tvg-country']) channel.tvgCountry = attrs['tvg-country'];
      if (attrs['tvg-language']) channel.tvgLanguage = attrs['tvg-language'];
      if (attrs['tvg-url']) channel.tvgUrl = attrs['tvg-url'];
      if (attrs['catchup']) channel.catchup = attrs['catchup'];
      if (attrs['catchup-source']) channel.catchupSource = attrs['catchup-source'];
      if (attrs['catchup-days']) channel.catchupDays = parseInt(attrs['catchup-days'], 10);

      // Extras VLC
      if (currentExtras['http-user-agent']) channel.userAgent = currentExtras['http-user-agent'];
      if (currentExtras['http-referrer']) channel.referrer = currentExtras['http-referrer'];

      // Détection du type de contenu
      if (shouldDetectType) {
        channel.contentType = detectContentType(line, group);
      }

      channels.push(channel);

      // Reset pour la prochaine chaîne
      currentExtInf = null;
      currentExtras = {};
    }
  }

  // Trier les groupes alphabétiquement
  const groups = Array.from(groupsSet).sort((a, b) => a.localeCompare(b));

  return {
    name: 'Imported Playlist',
    channels,
    groups,
    epgUrl,
    createdAt: new Date(),
    source: 'file',
  };
}

/**
 * Charge et parse une playlist M3U depuis une URL
 */
export async function loadM3UFromUrl(
  url: string,
  options: M3UParserOptions = {}
): Promise<M3UPlaylist> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  const playlist = parseM3U(content, options);
  playlist.source = 'url';

  return playlist;
}

/**
 * Vérifie si un contenu est une playlist M3U valide
 */
export function isValidM3U(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith('#EXTM3U') || trimmed.startsWith('#EXTINF:');
}

/**
 * Filtre les chaînes par groupe
 */
export function filterChannelsByGroup(
  channels: M3UChannel[],
  group: string | null
): M3UChannel[] {
  if (!group) return channels;
  return channels.filter((ch) => ch.group === group);
}

/**
 * Recherche dans les chaînes
 */
export function searchChannels(
  channels: M3UChannel[],
  query: string
): M3UChannel[] {
  if (!query.trim()) return channels;

  const lowerQuery = query.toLowerCase();
  return channels.filter(
    (ch) =>
      ch.name.toLowerCase().includes(lowerQuery) ||
      (ch.group && ch.group.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Trie les chaînes
 */
export function sortChannels(
  channels: M3UChannel[],
  by: 'name' | 'group' = 'name',
  direction: 'asc' | 'desc' = 'asc'
): M3UChannel[] {
  return [...channels].sort((a, b) => {
    const aVal = by === 'name' ? a.name : (a.group || '');
    const bVal = by === 'name' ? b.name : (b.group || '');
    const result = aVal.localeCompare(bVal);
    return direction === 'asc' ? result : -result;
  });
}
