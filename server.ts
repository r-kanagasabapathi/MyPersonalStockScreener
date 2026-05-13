import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for live quotes
  app.get('/api/quotes', async (req, res) => {
    try {
      const { symbols } = req.query;
      
      if (!symbols || typeof symbols !== 'string') {
        return res.status(400).json({ error: 'Symbols query parameter is required' });
      }

      // symbols should be like RELIANCE.NS,TCS.NS
      // We'll use Yahoo Finance API which is generally more stable.
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

      console.log(`Fetching quotes from Yahoo Finance for: ${symbols}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      const yahooData = response.data.quoteResponse?.result || [];
      
      // Normalize Yahoo Finance data to the format the frontend expects
      const normalizedData = yahooData.map((item: any) => ({
        symbol: item.symbol,
        price: item.regularMarketPrice,
        change: item.regularMarketChange,
        changePercent: item.regularMarketChangePercent,
        name: item.shortName,
        exchange: item.fullExchangeName
      }));

      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.json(normalizedData);
    } catch (error: any) {
      console.error('Error fetching quotes:', error.message);
      res.status(500).json({ 
        error: 'Failed to fetch live quotes',
        details: error.message 
      });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
