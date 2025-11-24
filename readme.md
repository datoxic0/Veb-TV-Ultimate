# Ultimate IPTV Player

The Ultimate IPTV Player is a powerful, feature-rich web application that combines the best features from three existing IPTV projects. It provides a modern, responsive interface for watching IPTV channels with advanced functionality including VPN support, multi-user viewing, channel categorization, and more.

## Features

### Core Functionality
- **M3U Playlist Support**: Load and play channels from M3U playlist URLs
- **HLS Streaming**: Full support for HTTP Live Streaming (HLS) with adaptive bitrate
- **Channel Search**: Quick search functionality with autocomplete suggestions
- **Category Filtering**: Organize channels by categories (News, Sports, Entertainment, etc.)
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Advanced Features
- **VPN Integration**: Built-in VPN toggle for accessing geo-restricted content
- **Multi-user Viewing**: Watch together with friends using WebRTC technology
- **Channel Recommendations**: Recommend channels to other viewers in real-time
- **EPG Support**: Electronic Program Guide with schedule information
- **Caching System**: Intelligent caching of playlists for faster loading
- **Auto-retry Mechanism**: Automatic retry on stream failures
- **Channel Viewer Count**: See how many people are watching each channel

### User Interface
- **Modern Design**: Clean, intuitive interface with dark/light theme support
- **Real-time Status**: Stream status indicators (loading, playing, error)
- **Keyboard Navigation**: Full keyboard support for channel selection
- **Customizable Layout**: Adjustable grid layout for different screen sizes

## Key Improvements Over Previous Versions

1. **Unified Interface**: Combines the best UI elements from all three source projects
2. **Enhanced Performance**: Optimized loading and playback with better error handling
3. **Improved Search**: Advanced search with keyboard navigation and suggestions
4. **Better Organization**: Intuitive category system with channel counting
5. **Robust Streaming**: Enhanced HLS.js configuration for smoother playback
6. **Multi-user Features**: Real-time channel recommendations and viewer counts
7. **Responsive Design**: Fully responsive layout that works on all devices

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Framework**: Vue.js 3 (CDN version)
- **Streaming**: HLS.js for HTTP Live Streaming
- **UI Components**: Font Awesome for icons
- **Fonts**: Google Fonts (Inter and Roboto)
- **Networking**: Fetch API for HTTP requests

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection

### Installation
1. Clone or download this repository
2. Open `index.html` in a web browser
3. Start adding M3U playlist URLs or use the default playlists

### Usage
1. **Add Playlists**: Enter M3U playlist URLs in the input field and click "Add"
2. **Browse Channels**: Use category filters to find channels of interest
3. **Search Channels**: Type in the search box to quickly find specific channels
4. **Play Channels**: Click on any channel to start watching
5. **Enable VPN**: Toggle the VPN button to access geo-restricted content
6. **Recommend Channels**: Use the recommend button to share channels with others

## Configuration

The player can be configured by modifying the `CONFIG` object in `app.js`:

```javascript
const CONFIG = {
  player: {
    autoplay: true,
    maxRetries: 5,
    retryDelay: 1000,
    lowLatencyMode: true,
    backBufferLength: 90,
    maxBufferLength: 30,
    maxMaxBufferLength: 60
  },
  cache: {
    enabled: true,
    expiryHours: 24,
    maxPlaylistSize: 1000
  },
  debug: true,
  connection: {
    timeout: 10000,
    retries: 3
  }
};

