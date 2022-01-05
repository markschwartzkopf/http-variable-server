import http from 'http';
import path from 'path';
import fs from 'fs/promises';
import parse from 'node-html-parser';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm',
};

export function startHttpServer(
  staticPath: string,
  port: number,
  wsPort: number
) {
  return http
    .createServer((req, res) => {
      let filePath = '.' + req.url;
      if (filePath == './') {
        filePath = './index.html';
      }
      let fileExtention = String(path.extname(filePath)).toLowerCase();
      let contentType = 'text/html';
      if (fileExtention in mimeTypes)
        contentType = mimeTypes[fileExtention as keyof typeof mimeTypes];
      let localPath = staticPath + filePath;
      if (path.basename(filePath) == 'hvs-browser.js') {
        let dirname = __dirname;
        console.log(dirname);
        console.log(dirname.slice(-3));
        console.log(dirname.slice(0, -3) + 'dist');
        if (dirname.slice(-3) == 'src') dirname = dirname.slice(0, -3) + 'dist';
        localPath = dirname + '/browser/hvs-browser.js';
        console.log(localPath);
      }
      fs.readFile(localPath)
        .then((buf) => {
          if (fileExtention == '.html') {
            const root = parse(buf.toString());
            const head = root.querySelector('head');
            if (head) {
              head.innerHTML +=
                '<script>let exports = {}; const __wsPort = ' +
                wsPort +
                ';</script><script src="hvs-browser.js"></script>';
            }
            buf = Buffer.from(root.toString());
          }
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(buf, 'utf-8');
        })
        .catch((err) => {
          if (err.code && err.code == 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('File not found', 'utf-8');
          } else {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('Unknown error: ' + JSON.stringify(err), 'utf-8');
          }
        });
    })
    .listen(port);
}
