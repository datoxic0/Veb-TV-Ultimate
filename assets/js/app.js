import { createApp } from 'vue';

// Ultimate IPTV Player Application
// Simplified version for immediate functionality

// Category icons mapping
const CATEGORY_ICONS = {
  news: 'fas fa-newspaper',
  entertainment: 'fas fa-film',
  sports: 'fas fa-futbol',
  lifestyle: 'fas fa-home',
  documentary: 'fas fa-book',
  music: 'fas fa-music',
  kids: 'fas fa-child',
 general: 'fas fa-tv',
  movies: 'fas fa-video',
  series: 'fas fa-tv',
  religion: 'fas fa-place-of-worship',
  business: 'fas fa-briefcase',
  weather: 'fas fa-cloud-sun',
  shopping: 'fas fa-shopping-cart'
};

// Default icon for unknown categories
const DEFAULT_CATEGORY_ICON = 'fas fa-tv';

// Default configuration
const CONFIG = {
  /** @tweakable Player settings */
  player: {
    /** @tweakable Whether to automatically play video on channel selection */
    autoplay: true,
    /** @tweakable Maximum number of retries on stream error */
    maxRetries: 5,
    /** @tweakable Delay in milliseconds before retrying a failed stream */
    retryDelay: 2000, // Increased delay
    /** @tweakable HLS.js low latency mode. Set to false for better stability. */
    lowLatencyMode: false,
    /** @tweakable HLS.js back buffer length in seconds. Helps with seeking in VOD. */
    backBufferLength: 90,
    /** @tweakable HLS.js max buffer length in seconds. A larger buffer reduces stalling. */
    maxBufferLength: 60, // Increased buffer
    /** @tweakable HLS.js max max buffer length in seconds. The absolute maximum buffer. */
    maxMaxBufferLength: 120, // Increased buffer
    /** @tweakable Timeout for manifest loading in milliseconds */
    manifestLoadingTimeOut: 10000,
    /** @tweakable Max retries for manifest loading */
    manifestLoadingMaxRetry: 4,
    /** @tweakable Timeout for fragment loading in milliseconds */
    fragLoadingTimeOut: 20000,
    /** @tweakable Max retries for fragment loading */
    fragLoadingMaxRetry: 6,
    /** @tweakable Delay before retrying after a fatal error */
    fatalErrorRecoveryRetryDelay: 3000,
    /** @tweakable Initial bandwidth estimate in bits/second. Higher values may load higher quality segments faster. */
    abrEwmaDefaultEstimate: 1000000,
    /** @tweakable Max seconds HLS.js will wait for the buffer to fill before triggering a stall error. */
    maxStarvationDelay: 8 // Increased from 4
  },
  /** @tweakable Caching settings */
  cache: {
    /** @tweakable Enable or disable playlist caching */
    enabled: true,
    /** @tweakable Cache expiry time in hours */
    expiryHours: 24,
    /** @tweakable Maximum number of channels to load from a playlist. Prevents performance issues with very large playlists. */
    maxPlaylistSize: 1000
  },
  /** @tweakable Enable or disable debug console logs */
  debug: true,
  /** @tweakable UI settings */
  ui: {
    /** @tweakable If true, treats 'Action;Adventure' as 'Action'. If false, it's a separate category. */
    useMainCategoryOnly: true,
  },
  /** @tweakable Connection settings for fetching playlists */
  connection: {
    /** @tweakable Timeout for network requests in milliseconds */
    timeout: 10000,
    /** @tweakable Number of retries for failed network requests */
    retries: 3
  }
};

// Utility functions
const Utils = {
  // Enhanced caching mechanism with localStorage persistence
  cache: {
    data: new Map(),
    get(key) {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) {
        return null;
      }
      try {
        const item = JSON.parse(itemStr);
        const now = new Date();
        if (now.getTime() > item.expiry) {
          localStorage.removeItem(key);
          return null;
        }
        return item.value;
      } catch (e) {
        console.error("Error reading from localStorage", e);
        localStorage.removeItem(key);
        return null;
      }
    },
    set(key, value, ttl = CONFIG.cache.expiryHours * 60 * 60 * 1000) {
      const now = new Date();
      const item = {
        value: value,
        expiry: now.getTime() + ttl,
      };
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch (e) {
        console.error("Error writing to localStorage", e);
        // Clean up if storage is full
        if (e.name === 'QuotaExceededError') {
            this.cleanup();
            // Retry setting item
            try {
                localStorage.setItem(key, JSON.stringify(item));
            } catch (e2) {
                console.error("Failed to save to localStorage even after cleanup", e2);
            }
        }
      }
    },
    cleanup() {
      console.log("Cleaning up expired localStorage cache...");
      const now = new Date().getTime();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try {
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            const item = JSON.parse(itemStr);
            if (item.expiry && now > item.expiry) {
              localStorage.removeItem(key);
              console.log(`Removed expired item: ${key}`);
            }
          }
        } catch (e) {
            // Invalid item, remove it
            localStorage.removeItem(key);
        }
      }
    }
  },

  // Parse M3U playlist with caching
  async parseM3U(url, content = null) {
    // Check cache first
    if (CONFIG.cache.enabled) {
      const cached = this.cache.get(url);
      if (cached) {
        if (CONFIG.debug) console.log(`Using cached playlist for ${url}`);
        return cached;
      }
    }
    
    // If content wasn't provided, fetch it
    if (!content) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch playlist: ${response.status}`);
        }
        content = await response.text();
      } catch (error) {
        console.error(`Error fetching playlist from ${url}:`, error);
        throw error;
      }
    }
    
    const channels = [];
    const lines = content.split('\n');
    let currentChannel = {};
    
    // Validate M3U format
    if (lines.length === 0 || !lines[0].trim().startsWith('#EXTM3U')) {
      console.warn(`Warning: File from ${url} may not be a valid M3U file`);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('#EXTINF:')) {
        try {
          currentChannel = {};
          
          // Extract channel name
          const nameMatch = line.match(/,(.+)$/);
          currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
          
          // Extract tvg-logo if available
          const logoMatch = line.match(/tvg-logo="([^"]+)"/);
          if (logoMatch) {
            currentChannel.logo = logoMatch[1];
          }
          
          // Extract group-title if available
          const groupMatch = line.match(/group-title="([^"]+)"/);
          if (groupMatch) {
            currentChannel.category = groupMatch[1].toLowerCase().trim();
          }
          
          // Extract tvg-country if available
          const countryMatch = line.match(/tvg-country="([^"]+)"/);
          if (countryMatch) {
            currentChannel.country = countryMatch[1];
          }
          
          // Extract tvg-language if available
          const languageMatch = line.match(/tvg-language="([^"]+)"/);
          if (languageMatch) {
            currentChannel.language = languageMatch[1];
          }
          
          // Extract tvg-id if available
          const idMatch = line.match(/tvg-id="([^"]+)"/);
          if (idMatch) {
            currentChannel.id = idMatch[1];
          }

        } catch (e) {
          currentChannel.name = 'Unknown Channel';
          console.error('Error parsing channel name:', e);
        }
      } else if (line && !line.startsWith('#')) {
        // This is a URL line
        if (currentChannel.name) {
          currentChannel.url = line;
          
          // Validate URL
          try {
            new URL(line);
            channels.push({...currentChannel});
          } catch (e) {
            console.warn(`Invalid URL for channel ${currentChannel.name}: ${line}`);
          }
          
          currentChannel = {};
        }
      }
    }
    
    // Cache the result
    if (CONFIG.cache.enabled) {
      this.cache.set(url, channels);
    }
    
    return channels;
  },

  // Get icon for category
  getCategoryIcon(category) {
    if (!category) return DEFAULT_CATEGORY_ICON;
    return CATEGORY_ICONS[category.toLowerCase()] || DEFAULT_CATEGORY_ICON;
  },
  
  // Validate channel URL
  async validateChannelUrl(url) {
    try {
      const response = await fetch(url, { 
        method: 'HEAD', 
      });
      return response.ok;
    } catch (error) {
      console.warn(`Channel URL validation failed for ${url}:`, error);
      return false;
    }
  }
};

// Main application
const app = createApp({
  data() {
    return {
      // State
      allChannels: [],
      currentChannel: null,
      searchQuery: '',
      newPlaylistUrl: '',
      loadingPlaylist: false,
      statusMessage: 'Ultimate IPTV Player Ready',
      isVpnActive: false,
      isDarkMode: false,
      showSuggestions: false,
      selectedSuggestionIndex: -1,
      hlsPlayer: null,
      retryAttempts: 0,
      scheduleData: [],
      scheduleLoading: false,
      streamStatus: {
        class: 'loading',
        icon: 'fas fa-spinner fa-spin',
        message: 'Ready'
      },
      
      // Filters
      activeCategoryFilters: {},
      
      // Default playlists
      defaultPlaylists: [
        "https://iptv-org.github.io/iptv/countries/za.m3u",
        "https://iptv-org.github.io/iptv/languages/eng.m3u"
      ],
      
      // Performance metrics
      performanceMetrics: {
        totalChannels: 0,
        loadedPlaylists: 0,
        failedStreams: 0,
        successfulStreams: 0
      }
    };
  },
  
  computed: {
    // Filtered channels based on search and category filters
    filteredChannels() {
      let filtered = [...this.allChannels];
      
      // Apply category filters
      const activeCategories = Object.keys(this.activeCategoryFilters)
        .filter(cat => this.activeCategoryFilters[cat]);
      
      if (activeCategories.length > 0) {
        filtered = filtered.filter(channel => {
          const channelCategory = this.getCleanCategoryName(channel.category || 'general');
          return activeCategories.includes(channelCategory);
        });
      }
      
      // Apply search filter
      if (this.searchQuery.trim()) {
        const query = this.searchQuery.toLowerCase();
        filtered = filtered.filter(channel => 
          channel.name.toLowerCase().includes(query) ||
          (channel.category && channel.category.toLowerCase().includes(query)) ||
          (channel.country && channel.country.toLowerCase().includes(query))
        );
      }
      
      // Sort alphabetically
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      
      return filtered;
    },
    
    // Available categories
    availableCategories() {
      const categories = new Set();
      this.allChannels.forEach(channel => {
        const category = channel.category || 'general';
        categories.add(this.getCleanCategoryName(category));
      });
      return Array.from(categories).sort();
    }
  },
  
  methods: {
    // Initialize the application
    async init() {
      this.updateStatus('Loading default playlists...');
      
      // Load default playlists in parallel for faster startup
      const playlistPromises = this.defaultPlaylists.map(url => this.loadPlaylist(url));
      await Promise.allSettled(playlistPromises);
      
      this.updateStatus('Ready to play channels');

      // Clean expired cache on startup
      Utils.cache.cleanup();
    },
    
    // Toggle VPN
    toggleVPN() {
      this.isVpnActive = !this.isVpnActive;
      this.updateStatus(`VPN ${this.isVpnActive ? 'enabled' : 'disabled'}`);
    },
    
    // Toggle dark mode
    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark-theme', this.isDarkMode);
        this.updateStatus(`Theme changed to ${this.isDarkMode ? 'dark' : 'light'}`);
    },
    
    // Add playlist
    async addPlaylist() {
      const url = this.newPlaylistUrl.trim();
      if (!url) {
        this.updateStatus('Please enter a valid URL');
        return;
      }
      
      await this.loadPlaylist(url);
      this.newPlaylistUrl = '';
    },
    
    // Load playlist from URL with enhanced error handling and caching
    async loadPlaylist(url) {
      if (this.loadingPlaylist) {
        this.updateStatus('Already loading a playlist, please wait...');
        return;
      }
      
      this.loadingPlaylist = true;
      this.updateStatus(`Loading playlist from ${url}...`);
      
      try {
        const channels = await Utils.parseM3U(url);
        
        if (channels.length === 0) {
          throw new Error('No valid channels found in the playlist file.');
        }
        
        // Limit playlist size if configured
        if (CONFIG.cache.maxPlaylistSize && channels.length > CONFIG.cache.maxPlaylistSize) {
          this.updateStatus(`Warning: Playlist truncated to ${CONFIG.cache.maxPlaylistSize} channels`);
          channels.splice(CONFIG.cache.maxPlaylistSize);
        }
        
        this.addChannels(channels);
        this.performanceMetrics.loadedPlaylists++;
        this.updateStatus(`Loaded ${channels.length} channels from ${url}`);
      } catch (error) {
        this.updateStatus(`Error: ${error.message}`);
        console.error('Playlist loading error:', error);
      } finally {
        this.loadingPlaylist = false;
      }
    },
    
    // Add channels to the main list
    addChannels(channels) {
      // Add channels to the main list
      this.allChannels = [...this.allChannels, ...channels];
      this.performanceMetrics.totalChannels = this.allChannels.length;
      
      // Update category filters
      this.initializeCategoryFilters();
    },
    
    // Initialize category filters
    initializeCategoryFilters() {
      this.availableCategories.forEach(category => {
        // If this is a new category, default it to active
        if (this.activeCategoryFilters[category] === undefined) {
          this.activeCategoryFilters[category] = true;
        }
      });
    },
    
    // Select a channel to play
    selectChannel(channel) {
      this.currentChannel = channel;
      this.retryAttempts = 0;
      this.updateStreamStatus('loading', 'Loading stream...');
      
      this.$nextTick(() => {
        this.playVideo(channel.url);
      });
    },
    
    // Play video using HLS.js with enhanced error handling
    playVideo(url) {
      const videoPlayer = document.getElementById('videoPlayer');
      
      // Clean up existing player
      if (this.hlsPlayer) {
        this.hlsPlayer.destroy();
        this.hlsPlayer = null;
      }
      
      // Reset video element
      videoPlayer.removeAttribute('src');
      videoPlayer.load();
      
      try {
        if (Hls.isSupported() && url.toLowerCase().includes('.m3u8')) {
          // More robust HLS config for stability
          const hlsConfig = {
            debug: false,
            enableWorker: true,
            lowLatencyMode: CONFIG.player.lowLatencyMode,
            backBufferLength: CONFIG.player.backBufferLength,
            maxBufferLength: CONFIG.player.maxBufferLength,
            maxMaxBufferLength: CONFIG.player.maxMaxBufferLength,
            
            // Timeouts and Retries
            manifestLoadingTimeOut: CONFIG.player.manifestLoadingTimeOut,
            manifestLoadingMaxRetry: CONFIG.player.manifestLoadingMaxRetry,
            manifestLoadingRetryDelay: 1000,
            
            fragLoadingTimeOut: CONFIG.player.fragLoadingTimeOut,
            fragLoadingMaxRetry: CONFIG.player.fragLoadingMaxRetry,
            fragLoadingRetryDelay: 1000,
            
            // Buffering & Playback Strategy
            maxStarvationDelay: CONFIG.player.maxStarvationDelay,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            progressive: true, // Speeds up starting playback of VODs

            // ABR (Adaptive Bitrate) Control
            abrEwmaDefaultEstimate: CONFIG.player.abrEwmaDefaultEstimate,
            abrBandWidthFactor: 0.9, // Be less aggressive when switching up
            abrBandWidthUpFactor: 0.7, // Be more conservative when switching up
          };

          this.hlsPlayer = new Hls(hlsConfig);
          
          this.hlsPlayer.loadSource(url);
          this.hlsPlayer.attachMedia(videoPlayer);
          
          this.hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
            this.updateStreamStatus('playing', 'Playing');
            this.performanceMetrics.successfulStreams++;
            if (CONFIG.player.autoplay) {
              videoPlayer.play().catch(err => {
                console.warn('Autoplay prevented:', err);
                this.updateStatus('Autoplay blocked. Click play to start.');
              });
            }
          });
          
          this.hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data.type, data.details, data.fatal);
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  this.updateStatus('Network error. Retrying load...');
                  this.hlsPlayer.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  this.updateStatus('Media error. Attempting to recover...');
                  this.hlsPlayer.recoverMediaError();
                  break;
                default:
                  // For other fatal errors, trigger the full retry mechanism
                  this.handleVideoError(`Fatal HLS error: ${data.details}`);
                  break;
              }
            } else {
               if (CONFIG.debug) console.warn(`Non-fatal HLS warning: ${data.details}`);
            }
          });

          // Handle buffer stalls, which can happen on live streams
          this.hlsPlayer.on(Hls.Events.BUFFER_STALLED, () => {
              console.warn("Buffer stalled. Attempting to kickstart playback.");
              this.updateStatus('Stream stalled, attempting recovery...');
              const video = document.getElementById('videoPlayer');
              if (video) {
                  // A small seek can sometimes kickstart the buffer
                  if (video.currentTime > 0.1) {
                      video.currentTime -= 0.1; 
                  }
                  video.play().catch(e => console.warn("Failed to replay after stall:", e));
              }
          });
          
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          videoPlayer.src = url;
          videoPlayer.addEventListener('loadedmetadata', () => {
            this.updateStreamStatus('playing', 'Playing');
            this.performanceMetrics.successfulStreams++;
            if (CONFIG.player.autoplay) {
              videoPlayer.play();
            }
          });
          videoPlayer.onerror = () => this.handleVideoError('Native player error');
        } else {
          // Direct playback for non-HLS streams
          videoPlayer.src = url;
          if (CONFIG.player.autoplay) {
            videoPlayer.play().catch(err => {
              console.error('Direct playback auto-play failed:', err);
              this.updateStatus('Auto-play failed. Click play to start video.');
            });
          }
          videoPlayer.onerror = () => this.handleVideoError('Direct playback error');
          this.updateStreamStatus('playing', 'Playing');
          this.performanceMetrics.successfulStreams++;
        }
      } catch (error) {
        console.error('Video playback error:', error);
        this.handleVideoError('Playback initialization error: ' + error.message);
      }
    },
    
    // Handle video errors
    handleVideoError(errorDetails = 'Unknown stream error') {
      console.error('Video Error:', errorDetails);
      this.retryAttempts++;
      this.performanceMetrics.failedStreams++;
      
      if (this.retryAttempts <= CONFIG.player.maxRetries) {
        this.updateStatus(`Stream error. Retrying (${this.retryAttempts}/${CONFIG.player.maxRetries})...`);
        this.updateStreamStatus('loading', `Retrying... (${this.retryAttempts}/${CONFIG.player.maxRetries})`);
        
        // Wait for retryDelay before attempting to play again
        setTimeout(() => {
          if (this.currentChannel) {
            if (CONFIG.debug) console.log(`Retrying channel: ${this.currentChannel.name}`);
            this.playVideo(this.currentChannel.url);
          }
        }, CONFIG.player.retryDelay * Math.pow(2, this.retryAttempts - 1)); // Exponential backoff
      } else {
        this.updateStatus(`Failed to play ${this.currentChannel.name}. Max retries reached.`);
        this.updateStreamStatus('error', 'Playback failed');
        // Destroy HLS instance to clean up
        if (this.hlsPlayer) {
            this.hlsPlayer.destroy();
            this.hlsPlayer = null;
        }
      }
    },
    
    // Update stream status
    updateStreamStatus(status, message) {
      const statusMap = {
        loading: { class: 'loading', icon: 'fas fa-spinner fa-spin', message },
        playing: { class: 'playing', icon: 'fas fa-play-circle', message },
        error: { class: 'error', icon: 'fas fa-exclamation-triangle', message }
      };
      
      this.streamStatus = statusMap[status] || statusMap.loading;
    },
    
    // Recommend channel to others
    recommendChannel() {
      if (!this.currentChannel) return;
      this.updateStatus(`Recommended ${this.currentChannel.name}`);
    },
    
    // Get viewer count for a channel (simulated)
    getViewerCount(channelUrl) {
      return Math.floor(Math.random() * 5);
    },
    
    // Toggle category filter
    toggleCategoryFilter(category) {
      this.activeCategoryFilters[category] = !this.activeCategoryFilters[category];
    },
    
    // Toggle all categories
    toggleAllCategories(state) {
      Object.keys(this.activeCategoryFilters).forEach(category => {
        this.activeCategoryFilters[category] = state;
      });
    },
    
    // Get category icon
    getCategoryIcon(category) {
      // Extract the first category if there are multiple (separated by semicolons)
      const mainCategory = this.getCleanCategoryName(category);
      return Utils.getCategoryIcon(mainCategory);
    },
    
    // Handle icon loading errors
    handleIconError(event) {
      // Replace with default icon on error
      event.target.className = DEFAULT_CATEGORY_ICON;
    },
    
    // Get channel count for a category
    getCategoryChannelCount(category) {
      return this.allChannels.filter(channel => {
        const channelCategory = channel.category || 'general';
        return this.getCleanCategoryName(channelCategory) === category;
      }).length;
    },
    
    // Get clean category name (first part before semicolon)
    getCleanCategoryName(category) {
      if (CONFIG.ui.useMainCategoryOnly) {
        return category.split(';')[0].trim();
      }
      return category.trim();
    },
    
    // Update status message
    updateStatus(message) {
      this.statusMessage = message;
      if (CONFIG.debug) {
        console.log(`[STATUS] ${message}`);
      }
    },
    
    // Get performance metrics summary
    getPerformanceSummary() {
      return `Channels: ${this.performanceMetrics.totalChannels} | ` +
             `Playlists: ${this.performanceMetrics.loadedPlaylists} | ` +
             `Success: ${this.performanceMetrics.successfulStreams} | ` +
             `Failed: ${this.performanceMetrics.failedStreams}`;
    }
  },
  
  // Lifecycle hooks
  mounted() {
    this.init();
  },
  
  beforeUnmount() {
    // Clean up HLS player
    if (this.hlsPlayer) {
      this.hlsPlayer.destroy();
    }
  }
});

// Mount the application
app.mount('#app');