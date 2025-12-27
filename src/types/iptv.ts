// Types pour l'application IPTV - M3U et Xtream Code

// ====== TYPES M3U ======

export interface M3UChannel {
  id: string;
  name: string;
  logo?: string;
  group?: string;
  url: string;
  tvgId?: string;
  tvgName?: string;
  tvgLogo?: string;
  tvgCountry?: string;
  tvgLanguage?: string;
  tvgUrl?: string;
  catchup?: string;
  catchupSource?: string;
  catchupDays?: number;
  userAgent?: string;
  referrer?: string;
  contentType?: ContentType;
}

export type ContentType = 'live' | 'movie' | 'series' | 'unknown';

export interface M3UPlaylist {
  name: string;
  channels: M3UChannel[];
  groups: string[];
  epgUrl?: string;
  createdAt: Date;
  source: 'file' | 'url' | 'xtream';
}

export interface M3UParserOptions {
  defaultGroup?: string;
  extractLogos?: boolean;
  detectContentType?: boolean;
}

// ====== TYPES XTREAM CODE ======

export interface XtreamCredentials {
  server: string;
  username: string;
  password: string;
}

export interface XtreamAuthResponse {
  user_info: {
    username: string;
    password: string;
    message: string;
    auth: number;
    status: string;
    exp_date: string;
    is_trial: string;
    active_cons: string;
    created_at: string;
    max_connections: string;
    allowed_output_formats: string[];
  };
  server_info: {
    url: string;
    port: string;
    https_port: string;
    server_protocol: string;
    rtmp_port: string;
    timezone: string;
    timestamp_now: number;
    time_now: string;
    process: boolean;
  };
}

export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id: number;
}

export interface XtreamLiveStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  added: string;
  is_adult: string;
  category_id: string;
  custom_sid: string;
  tv_archive: number;
  direct_source: string;
  tv_archive_duration: number;
}

export interface XtreamVodStream {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  rating_5based: number;
  added: string;
  is_adult: string;
  category_id: string;
  container_extension: string;
  custom_sid: string | null;
  direct_source: string;
}

export interface XtreamSeriesInfo {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export interface XtreamSeriesDetails {
  seasons: XtreamSeason[];
  info: {
    name: string;
    cover: string;
    plot: string;
    cast: string;
    director: string;
    genre: string;
    releaseDate: string;
    last_modified: string;
    rating: string;
    rating_5based: number;
    backdrop_path: string[];
    youtube_trailer: string;
    episode_run_time: string;
    category_id: string;
  };
  episodes: Record<string, XtreamEpisode[]>;
}

export interface XtreamSeason {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  season_number: number;
  cover: string;
  cover_big: string;
}

export interface XtreamEpisode {
  id: string;
  episode_num: number;
  title: string;
  container_extension: string;
  info: {
    movie_image: string;
    plot: string;
    releasedate: string;
    rating: number;
    duration_secs: number;
    duration: string;
    bitrate: number;
  };
  custom_sid: string;
  added: string;
  season: number;
  direct_source: string;
}

// ====== HELPERS ======

export function xtreamToM3UChannel(
  stream: XtreamLiveStream,
  credentials: XtreamCredentials,
  category?: XtreamCategory
): M3UChannel {
  const { server, username, password } = credentials;
  const baseUrl = server.replace(/\/$/, '');

  return {
    id: `xtream_live_${stream.stream_id}`,
    name: stream.name,
    logo: stream.stream_icon || undefined,
    group: category?.category_name || 'Live TV',
    url: `${baseUrl}/live/${username}/${password}/${stream.stream_id}.m3u8`,
    tvgId: stream.epg_channel_id || undefined,
    contentType: 'live',
  };
}

export function xtreamVodToM3UChannel(
  stream: XtreamVodStream,
  credentials: XtreamCredentials,
  category?: XtreamCategory
): M3UChannel {
  const { server, username, password } = credentials;
  const baseUrl = server.replace(/\/$/, '');

  return {
    id: `xtream_vod_${stream.stream_id}`,
    name: stream.name,
    logo: stream.stream_icon || undefined,
    group: category?.category_name || 'Movies',
    url: `${baseUrl}/movie/${username}/${password}/${stream.stream_id}.${stream.container_extension}`,
    contentType: 'movie',
  };
}
