import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState('best');
  const [whatsappLinks, setWhatsappLinks] = useState({ channel: '', group: '' });

  // Set API base URL
  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://vidsuka.onrender.com' :
    // : 'http://localhost:5000';

  // Fetch WhatsApp links on component mount
  useEffect(() => {
    axios.get(`${API_BASE}/api/whatsapp`)
      .then(response => {
        setWhatsappLinks(response.data);
      })
      .catch(error => {
        console.error('Error fetching WhatsApp links:', error);
      });
  }, [API_BASE]);

  const fetchVideoInfo = async () => {
    if (!url) return;
    
    try {
      setIsLoading(true);
      setError('');
      const response = await axios.get(`${API_BASE}/api/info?url=${encodeURIComponent(url)}`);
      setVideoInfo(response.data);
      setSelectedFormat('best');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch video info');
      setVideoInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setMessage('Downloading...');

      const response = await axios.post(`${API_BASE}/api/download`, {
        url,
        format_id: selectedFormat
      });
      
      setMessage('Download complete!');
      setDownloadLink(`${API_BASE}${response.data.download_url}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download video');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (url) fetchVideoInfo();
    }, 1000);

    return () => clearTimeout(timer);
  }, [url]);

  const formatDuration = (seconds) => {
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
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste video URL (YouTube, Facebook, TikTok, etc.)"
            disabled={isLoading}
          />
          <button
            onClick={handleDownload}
            disabled={isLoading || !videoInfo}
          >
            {isLoading ? 'Processing...' : 'Download'}
          </button>
        </div>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        {videoInfo && (
          <div className="video-preview">
            {videoInfo.thumbnail && (
              <div className="video-thumbnail">
                <img src={videoInfo.thumbnail} alt="Video thumbnail" />
              </div>
            )}
            
            <div className="video-details">
              <h3>{videoInfo.title}</h3>
              {videoInfo.duration && (
                <p>Duration: {formatDuration(videoInfo.duration)}</p>
              )}
              <p>Source: {videoInfo.extractor || 'Unknown'}</p>
              
              <div className="format-selector">
                <label>Quality:</label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
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
              download
              className="download-button"
            >
              ⬇️ Download Your Video
            </a>
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
            >
              WhatsApp Channel
            </a>
            <a 
              href={whatsappLinks.group} 
              target="_blank" 
              rel="noopener noreferrer"
              className="whatsapp-button group"
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