import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios with optimized defaults
const api = axios.create({
  withCredentials: true,
  timeout: 10000, // 10s for normal requests
  maxRedirects: 0,
  maxContentLength: 500 * 1024 * 1024, // 500MB
  headers: {
    'Cache-Control': 'no-cache',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Memoize API base URL
const getApiBase = () => (
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://vidsuka.onrender.com'
    : 'http://localhost:5000')
);

function App() {
  const [state, setState] = useState({
    url: '',
    message: '',
    error: '',
    isLoading: false,
    downloadLink: '',
    videoInfo: null,
    selectedFormat: 'best',
    whatsappLinks: {
      channel: 'https://whatsapp.com/channel/0029VayK4ty7DAWr0jeCZx0i',
      group: 'https://chat.whatsapp.com/FAJjIZY3a09Ck73ydqMs4E'
    }
  });

  const abortControllerRef = useRef(new AbortController());
  const downloadIframeRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Single state update function for performance
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Efficient download trigger
  const triggerDownload = useCallback((downloadUrl) => {
    // Method 1: Reuse hidden iframe
    if (!downloadIframeRef.current) {
      downloadIframeRef.current = document.createElement('iframe');
      downloadIframeRef.current.style.display = 'none';
      document.body.appendChild(downloadIframeRef.current);
    }
    downloadIframeRef.current.src = downloadUrl;

    // Method 2: Fallback after delay
    const fallbackTimer = setTimeout(() => {
      updateState({
        downloadLink: downloadUrl,
        message: 'Click below if download didn\'t start'
      });
    }, 1500); // Reduced fallback delay

    return () => clearTimeout(fallbackTimer);
  }, [updateState]);

  // Optimized download handler
  const handleDownload = useCallback(async () => {
    if (!state.url) {
      updateState({ error: 'Please enter a URL' });
      return;
    }

    try {
      updateState({
        isLoading: true,
        error: '',
        message: 'Preparing download...',
        downloadLink: ''
      });

      // Check for cached download first
      if (state.videoInfo?.cached) {
        triggerDownload(`${getApiBase()}${state.videoInfo.download_url}`);
        return;
      }

      // Initiate download
      const { data } = await api.post(`${getApiBase()}/api/download`, {
        url: state.url,
        format_id: state.selectedFormat
      }, {
        timeout: 120000, // 2 minutes for download
        signal: abortControllerRef.current.signal
      });

      if (data?.success) {
        triggerDownload(`${getApiBase()}${data.download_url}`);
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        updateState({
          error: err.response?.data?.error || err.message || 'Failed to download video'
        });
      }
    } finally {
      updateState({ isLoading: false });
    }
  }, [state.url, state.selectedFormat, state.videoInfo, updateState, triggerDownload]);

  // Fetch WhatsApp links on mount (low priority)
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchWhatsappLinks = async () => {
      try {
        const { data } = await api.get(`${getApiBase()}/api/whatsapp`, {
          signal: controller.signal,
          priority: 'low'
        });

        if (data?.success) {
          updateState({
            whatsappLinks: {
              channel: data.channel,
              group: data.group
            }
          });
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error('WhatsApp links fetch error:', err);
        }
      }
    };

    fetchWhatsappLinks();

    return () => {
      controller.abort();
    };
  }, [updateState]);

  // Optimized video info fetcher
  const fetchVideoInfo = useCallback(async (url) => {
    if (!url) return;

    try {
      updateState({ isLoading: true, error: '' });

      const { data } = await api.get(`${getApiBase()}/api/info`, {
        params: { url },
        signal: abortControllerRef.current.signal,
        timeout: 8000 // Faster timeout for info
      });

      if (data?.success) {
        // Normalize platform formats
        const normalizedInfo = data.data.extractor === 'instagram' || data.data.extractor === 'facebook'
          ? {
            ...data.data,
            formats: data.data.formats || [{
              format_id: 'best',
              ext: 'mp4',
              height: 1080,
              format_note: 'MP4'
            }]
          }
          : data.data;

        updateState({
          videoInfo: normalizedInfo,
          selectedFormat: 'best'
        });
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        updateState({
          error: err.response?.data?.error || err.message || 'Failed to fetch video info',
          videoInfo: null
        });
      }
    } finally {
      updateState({ isLoading: false });
    }
  }, [updateState]);

  // Debounced URL info fetch with cleanup
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (state.url) {
      debounceTimerRef.current = setTimeout(() => {
        fetchVideoInfo(state.url);
      }, 800); // Optimized debounce time
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.url, fetchVideoInfo]);

  // Memoized duration formatter
  const formatDuration = useCallback((seconds) => {
    if (!seconds) return '00:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    return [h, m > 9 ? m : h ? '0' + m : m || '0', s > 9 ? s : '0' + s]
      .filter(Boolean)
      .join(':');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const iframe = downloadIframeRef.current;

    return () => {
      controller.abort();
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    };
  }, []);

  return (
    <div className="app">
      <div className="container">
        <header>
          <h1>Pracky Downloader</h1>
          <p className="subtitle">By Ernest Tech House</p>
        </header>

        <div className="input-group">
          <input
            type="text"
            value={state.url}
            onChange={(e) => updateState({ url: e.target.value })}
            placeholder="Paste video URL (YouTube, Facebook, TikTok, Instagram, etc.)"
            disabled={state.isLoading}
            aria-label="Video URL input"
          />
          <button
            onClick={handleDownload}
            disabled={state.isLoading || !state.videoInfo}
            aria-label="Download button"
          >
            {state.isLoading ? (
              <>
                <span className="spinner" aria-hidden="true"></span>
                Processing...
              </>
            ) : 'Download'}
          </button>
        </div>

        {state.error && (
          <div className="alert error" role="alert">
            {state.error}
          </div>
        )}
        {state.message && (
          <div className="alert success" role="status">
            {state.message}
          </div>
        )}

        {state.videoInfo && (
          <div className="video-preview">
            {state.videoInfo.thumbnail && (
              <div className="video-thumbnail">
                <img
                  src={state.videoInfo.thumbnail}
                  alt={`Thumbnail for ${state.videoInfo.title}`}
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = 'placeholder-thumbnail.jpg';
                  }}
                />
              </div>
            )}

            <div className="video-details">
              <h3>{state.videoInfo.title || 'Untitled Video'}</h3>

              <div className="video-meta">
                {state.videoInfo.duration && (
                  <p>Duration: {formatDuration(state.videoInfo.duration)}</p>
                )}
                <p>Source: {state.videoInfo.extractor || 'Unknown Platform'}</p>
              </div>

              <div className="format-selector">
                <label htmlFor="format-select">Quality:</label>
                <select
                  id="format-select"
                  value={state.selectedFormat}
                  onChange={(e) => updateState({ selectedFormat: e.target.value })}
                  disabled={state.isLoading}
                >
                  {state.videoInfo.formats?.map(format => (
                    <option
                      key={format.format_id}
                      value={format.format_id}
                    >
                      {format.height ? `${format.height}p` : format.format_note} - {format.ext}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {state.downloadLink && (
          <div className="download-ready">
            <button
              onClick={() => {
                const link = document.createElement('a');
                link.href = state.downloadLink;
                link.download = state.downloadLink.split('/').pop();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="download-button"
              aria-label="Download video link"
            >
              ⬇️ Click to Download
            </button>
            <p className="download-hint">
              If download doesn't start, right-click → "Save link as"
            </p>
          </div>
        )}

        <div className="whatsapp-links">
          <h4>Join Our Community:</h4>
          <div className="whatsapp-buttons">
            <a
              href={state.whatsappLinks.channel}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-button channel"
              aria-label="WhatsApp Channel"
              prefetch="none"
            >
              WhatsApp Channel
            </a>
            <a
              href={state.whatsappLinks.group}
              target="_blank"
              rel="noopener noreferrer"
              className="whatsapp-button group"
              aria-label="WhatsApp Group"
              prefetch="none"
            >
              WhatsApp Group
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(App);