const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.join(__dirname, 'public');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split('?')[0]);
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const filePath = path.resolve(publicDirectory, relativePath);

  if (!filePath.startsWith(publicDirectory + path.sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    const extension = path.extname(filePath);
    response.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    response.end(content);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`DH Tetris listening on port ${port}`);
});