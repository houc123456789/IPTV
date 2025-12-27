import {
  XtreamCredentials,
  XtreamAuthResponse,
  XtreamCategory,
  XtreamLiveStream,
  XtreamVodStream,
  XtreamSeriesInfo,
  XtreamSeriesDetails,
  M3UChannel,
  M3UPlaylist,
  xtreamToM3UChannel,
  xtreamVodToM3UChannel,
} from '@/types/iptv';

/**
 * Service pour l'API Xtream Code
 * Gère l'authentification et la récupération des contenus
 */

export class XtreamService {
  private credentials: XtreamCredentials;
  private baseUrl: string;
  private authData: XtreamAuthResponse | null = null;

  constructor(credentials: XtreamCredentials) {
    this.credentials = credentials;
    this.baseUrl = credentials.server.replace(/\/$/, '');
  }

  /**
   * Construit l'URL de l'API
   */
  private buildApiUrl(action: string, params: Record<string, string> = {}): string {
    const url = new URL(`${this.baseUrl}/player_api.php`);
    url.searchParams.set('username', this.credentials.username);
    url.searchParams.set('password', this.credentials.password);
    url.searchParams.set('action', action);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  /**
   * Effectue une requête API
   */
  private async apiRequest<T>(action: string, params: Record<string, string> = {}): Promise<T> {
    const url = this.buildApiUrl(action, params);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Authentification et récupération des infos serveur
   */
  async authenticate(): Promise<XtreamAuthResponse> {
    const url = `${this.baseUrl}/player_api.php?username=${this.credentials.username}&password=${this.credentials.password}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.user_info || data.user_info.auth === 0) {
      throw new Error('Invalid credentials');
    }

    this.authData = data;
    return data;
  }

  /**
   * Vérifie si authentifié
   */
  isAuthenticated(): boolean {
    return this.authData !== null;
  }

  /**
   * Récupère les catégories de chaînes live
   */
  async getLiveCategories(): Promise<XtreamCategory[]> {
    return this.apiRequest<XtreamCategory[]>('get_live_categories');
  }

  /**
   * Récupère les catégories VOD
   */
  async getVodCategories(): Promise<XtreamCategory[]> {
    return this.apiRequest<XtreamCategory[]>('get_vod_categories');
  }

  /**
   * Récupère les catégories de séries
   */
  async getSeriesCategories(): Promise<XtreamCategory[]> {
    return this.apiRequest<XtreamCategory[]>('get_series_categories');
  }

  /**
   * Récupère les chaînes live
   */
  async getLiveStreams(categoryId?: string): Promise<XtreamLiveStream[]> {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    return this.apiRequest<XtreamLiveStream[]>('get_live_streams', params);
  }

  /**
   * Récupère les films VOD
   */
  async getVodStreams(categoryId?: string): Promise<XtreamVodStream[]> {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    return this.apiRequest<XtreamVodStream[]>('get_vod_streams', params);
  }

  /**
   * Récupère les séries
   */
  async getSeries(categoryId?: string): Promise<XtreamSeriesInfo[]> {
    const params: Record<string, string> = {};
    if (categoryId) params.category_id = categoryId;
    return this.apiRequest<XtreamSeriesInfo[]>('get_series', params);
  }

  /**
   * Récupère les détails d'une série
   */
  async getSeriesInfo(seriesId: number): Promise<XtreamSeriesDetails> {
    return this.apiRequest<XtreamSeriesDetails>('get_series_info', {
      series_id: seriesId.toString(),
    });
  }

  /**
   * Génère l'URL de stream live
   */
  getLiveStreamUrl(streamId: number, format: 'm3u8' | 'ts' = 'm3u8'): string {
    return `${this.baseUrl}/live/${this.credentials.username}/${this.credentials.password}/${streamId}.${format}`;
  }

  /**
   * Génère l'URL de stream VOD
   */
  getVodStreamUrl(streamId: number, extension: string = 'mp4'): string {
    return `${this.baseUrl}/movie/${this.credentials.username}/${this.credentials.password}/${streamId}.${extension}`;
  }

  /**
   * Génère l'URL d'épisode de série
   */
  getSeriesEpisodeUrl(episodeId: string, extension: string = 'mp4'): string {
    return `${this.baseUrl}/series/${this.credentials.username}/${this.credentials.password}/${episodeId}.${extension}`;
  }

  /**
   * Convertit toutes les chaînes live en playlist M3U
   */
  async getAllLiveAsPlaylist(): Promise<M3UPlaylist> {
    const categories = await this.getLiveCategories();
    const streams = await this.getLiveStreams();

    const categoryMap = new Map(categories.map((c) => [c.category_id, c]));
    const channels: M3UChannel[] = streams.map((stream) => {
      const category = categoryMap.get(stream.category_id);
      return xtreamToM3UChannel(stream, this.credentials, category);
    });

    const groups = categories.map((c) => c.category_name).sort();

    return {
      name: 'Xtream Live TV',
      channels,
      groups,
      createdAt: new Date(),
      source: 'xtream',
    };
  }

  /**
   * Convertit tous les VOD en playlist M3U
   */
  async getAllVodAsPlaylist(): Promise<M3UPlaylist> {
    const categories = await this.getVodCategories();
    const streams = await this.getVodStreams();

    const categoryMap = new Map(categories.map((c) => [c.category_id, c]));
    const channels: M3UChannel[] = streams.map((stream) => {
      const category = categoryMap.get(stream.category_id);
      return xtreamVodToM3UChannel(stream, this.credentials, category);
    });

    const groups = categories.map((c) => c.category_name).sort();

    return {
      name: 'Xtream VOD',
      channels,
      groups,
      createdAt: new Date(),
      source: 'xtream',
    };
  }

  /**
   * Récupère tout le contenu (live + VOD) en une seule playlist
   */
  async getAllContentAsPlaylist(): Promise<M3UPlaylist> {
    const [livePlaylist, vodPlaylist] = await Promise.all([
      this.getAllLiveAsPlaylist(),
      this.getAllVodAsPlaylist(),
    ]);

    const allChannels = [...livePlaylist.channels, ...vodPlaylist.channels];
    const allGroups = [...new Set([...livePlaylist.groups, ...vodPlaylist.groups])].sort();

    return {
      name: 'Xtream Full Content',
      channels: allChannels,
      groups: allGroups,
      createdAt: new Date(),
      source: 'xtream',
    };
  }
}

/**
 * Factory function pour créer un service Xtream
 */
export function createXtreamService(credentials: XtreamCredentials): XtreamService {
  return new XtreamService(credentials);
}

/**
 * Parse une URL Xtream pour extraire les credentials
 * Formats supportés:
 * - http://server:port/get.php?username=xxx&password=xxx&type=m3u_plus
 * - http://server:port/player_api.php?username=xxx&password=xxx
 */
export function parseXtreamUrl(url: string): XtreamCredentials | null {
  try {
    const parsedUrl = new URL(url);
    const username = parsedUrl.searchParams.get('username');
    const password = parsedUrl.searchParams.get('password');

    if (!username || !password) {
      return null;
    }

    // Reconstruire l'URL du serveur sans le path
    const server = `${parsedUrl.protocol}//${parsedUrl.host}`;

    return {
      server,
      username,
      password,
    };
  } catch {
    return null;
  }
}
