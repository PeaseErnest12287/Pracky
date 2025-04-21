import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios
axios.defaults.withCredentials = true;
axios.defaults.timeout = 30000;

function App() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [whatsappLinks, setWhatsappLinks] = useState({ 
    channel: 'https://whatsapp.com/channel/0029VayK4ty7DAWr0jeCZx0i',
    group: 'https://chat.whatsapp.com/FAJjIZY3a09Ck73ydqMs4E'
  });

  const API_BASE = process.env.REACT_APP_API_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://vidsuka.onrender.com' 
      : 'http://localhost:5000');

  console.log('API_BASE URL:', API_BASE);

  useEffect(() => {
    const fetchWhatsappLinks = async () => {
      console.log('Fetching WhatsApp links...');
      try {
        const response = await axios.get(`${API_BASE}/api/whatsapp`);
        console.log('WhatsApp links fetched:', response.data);

        if (response.data?.success) {
          setWhatsappLinks({
            channel: response.data.channel,
            group: response.data.group
          });
        } else {
          console.warn('Using default WhatsApp links.');
        }
      } catch (err) {
        console.error('Failed to fetch WhatsApp links:', err);
      }
    };

    fetchWhatsappLinks();
  }, [API_BASE]);

  const fetchVideoInfo = async () => {
    if (!url) {
      console.warn('No URL provided for video info fetch.');
      return;
    }

    console.log('Fetching video info for URL:', url);

    try {
      setIsLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE}/api/info`, {
        params: { url },
        timeout: 10000
      });

      console.log('Video info response:', response.data);

      if (response.data?.success) {
        setVideoInfo(response.data.data);
        console.log('Video info set:', response.data.data);
        setSelectedFormat('best');
      } else {
        throw new Error(response.data?.error || 'Invalid response');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch video info';
      setError(errorMsg);
      console.error('Video info error:', errorMsg);
      setVideoInfo(null);
    } finally {
      setIsLoading(false);
      console.log('Finished fetching video info.');
    }
  };

  const handleDownload = async () => {
    if (!url) {
      console.warn('No URL entered for download.');
      setError('Please enter a URL');
      return;
    }

    console.log('Starting download for:', url);

    try {
      setIsLoading(true);
      setError('');
      setMessage('Preparing download...');
      setDownloadLink('');

      const response = await axios.post(`${API_BASE}/api/download`, {
        url,
        format_id: selectedFormat
      }, {
        timeout: 300000
      });

      console.log('Download response:', response.data);

      if (response.data?.success) {
        const filename = response.data.filename;
        const downloadUrl = `${API_BASE}/api/downloads/${encodeURIComponent(filename)}`;
        console.log('Download ready at:', downloadUrl);

        setMessage('Download starting...');

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          setDownloadLink(downloadUrl);
          setMessage('Click the button below if download didn\'t start');
          console.log('Fallback download link shown.');
        }, 2000);
      } else {
        throw new Error(response.data?.error || 'Download failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to download video';
      console.error('Download error:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
      console.log('Download process ended.');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (url) {
        console.log('URL changed, fetching info after debounce:', url);
        fetchVideoInfo();
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      console.log('Cleared debounce timer.');
    };
  }, [url]);

  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return [h, m > 9 ? m : h ? '0' + m : m || '0', s > 9 ? s : '0' + s]
      .filter(Boolean)
      .join(':');
  };

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
            value={url}
            onChange={(e) => {
              console.log('URL input changed:', e.target.value);
              setUrl(e.target.value);
            }}
            placeholder="Paste video URL (YouTube, Facebook, TikTok, etc.)"
            disabled={isLoading}
            aria-label="Video URL input"
          />
          <button
            onClick={handleDownload}
            disabled={isLoading || !videoInfo}
            aria-label="Download button"
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true"></span>
                Processing...
              </>
            ) : 'Download'}
          </button>
        </div>

        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="alert success" role="status">
            {message}
          </div>
        )}

        {videoInfo && (
          <div className="video-preview">
            {videoInfo.thumbnail && (
              <div className="video-thumbnail">
                <img 
                  src={videoInfo.thumbnail} 
                  alt={`Thumbnail for ${videoInfo.title}`} 
                  onError={(e) => {
                    e.target.src = 'placeholder-thumbnail.jpg';
                    console.warn('Thumbnail failed to load, fallback applied.');
                  }}
                />
              </div>
            )}
            
            <div className="video-details">
              <h3>{videoInfo.title || 'Untitled Video'}</h3>
              
              <div className="video-meta">
                {videoInfo.duration && (
                  <p>Duration: {formatDuration(videoInfo.duration)}</p>
                )}
                <p>Source: {videoInfo.extractor || 'Unknown Platform'}</p>
              </div>
              
              <div className="format-selector">
                <label htmlFor="format-select">Quality:</label>
                <select
                  id="format-select"
                  value={selectedFormat}
                  onChange={(e) => {
                    console.log('Selected format:', e.target.value);
                    setSelectedFormat(e.target.value);
                  }}
                  disabled={isLoading}
                >
                  <option value="best">Best Quality</option>
                  <option value="worst">Worst Quality</option>
                  <option value="bestvideo">Video Only</option>
                  <option value="bestaudio">Audio Only</option>
                  {videoInfo.formats
                    ?.filter(f => f.ext === 'mp4')
                    ?.sort((a, b) => (b.height || 0) - (a.height || 0))
                    ?.map(format => (
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

        {downloadLink && (
          <div className="download-ready">
            <a
              href={downloadLink}
              className="download-button"
              onClick={(e) => {
                e.preventDefault();
                console.log('Manual download clicked:', downloadLink);
                window.location.href = downloadLink;
              }}
              aria-label="Download video link"
            >
              ⬇️ Click to Download
            </a>
            <p className="download-hint">
              Right-click and "Save link as" if download doesn't start
            </p>
          </div>
        )}

        <div className="whatsapp-links">
          <h4>Join Our Community:</h4>
          <div className="whatsapp-buttons">
            <a 
              href={whatsappLinks.channel} 
              target="_blank" 
              rel="noopener noreferrer"
              className="whatsapp-button channel"
              aria-label="WhatsApp Channel"
            >
              WhatsApp Channel
            </a>
            <a 
              href={whatsappLinks.group} 
              target="_blank" 
              rel="noopener noreferrer"
              className="whatsapp-button group"
              aria-label="WhatsApp Group"
            >
              WhatsApp Group
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
