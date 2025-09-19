import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Serve uploaded files statically with proper MIME type handling
app.use('/uploads', express.static('uploads', {
  setHeaders: (res, path, stat) => {
    // Set proper MIME types for uploaded files
    if (path.includes('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.includes('.jpg') || path.includes('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.includes('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.includes('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    } else if (path.includes('/receipts/')) {
      // For receipt files without extensions, assume they are images
      res.setHeader('Content-Type', 'image/jpeg');
    }
  }
}));

// Serve attached assets statically with proper MIME type handling
app.use('/attached_assets', express.static('attached_assets', {
  setHeaders: (res, path, stat) => {
    // Set proper MIME types for attached assets
    if (path.includes('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.includes('.jpg') || path.includes('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.includes('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.includes('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

// Serve public assets (logo, etc.) statically with proper MIME type handling
app.use('/assets', express.static('public/assets', {
  setHeaders: (res, path, stat) => {
    // Set proper MIME types for public assets
    if (path.includes('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (path.includes('.jpg') || path.includes('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.includes('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (path.includes('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// Serve SVG files directly from public directory with explicit route
app.get('/furnili-system-flowchart.svg', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile('furnili-system-flowchart.svg', { root: 'public' });
});

// Fallback for other SVG files
app.get('/*.svg', express.static('public', {
  setHeaders: (res, path, stat) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      // Skip logging for frequent health check requests to reduce noise
      if (req.method === 'HEAD' && path === '/api') {
        return;
      }
      
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error for debugging but don't crash the server
    console.error('[ERROR]', {
      status,
      message,
      stack: err.stack,
      url: _req.url,
      method: _req.method
    });

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Don't throw in production - keep server alive
    if (process.env.NODE_ENV === 'development') {
      next(err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
  });
})();
