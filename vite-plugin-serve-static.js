import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom Vite plugin to serve large static files
export function serveStaticLargeFiles() {
  return {
    name: 'serve-static-large-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Handle large static files from /libs directory
        if (req.url && req.url.startsWith('/libs/')) {
          const filePath = path.join(__dirname, 'public', req.url);
          
          // Check if file exists
          fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
              return next();
            }
            
            // Set proper headers for large files
            res.setHeader('Content-Type', getContentType(filePath));
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            
            // Stream the file instead of loading it all at once
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
            
            stream.on('error', (streamErr) => {
              console.error('Error streaming file:', streamErr);
              res.statusCode = 500;
              res.end('Internal Server Error');
            });
          });
        } else {
          next();
        }
      });
    }
  };
}

function getContentType(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();
  const types = {
    'js': 'application/javascript',
    'wasm': 'application/wasm',
    'traineddata': 'application/octet-stream',
    'gz': 'application/gzip'
  };
  return types[ext] || 'application/octet-stream';
}