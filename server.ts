import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API to fetch link content
  app.post("/api/fetch-link", async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      const $ = cheerio.load(response.data);
      
      // Basic extraction
      const title = $("title").text() || $("h1").first().text();
      const description = $("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content");
      
      // Extract main content summary (first few paragraphs)
      let text = "";
      $("p").each((i, el) => {
        if (i < 5) text += $(el).text() + "\n";
      });

      res.json({ title, description, content: text.trim().slice(0, 5000), url });
    } catch (error: any) {
      console.error("Error fetching link:", error.message);
      res.status(500).json({ error: "Failed to fetch link content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
