const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const url = 'https://github.com/dreamxstore/Supermarket-Simulator/releases/latest/download/Supermarket.Simulator.zip';
const targetDir = path.join(process.env.USERPROFILE || 'C:/Users/Administrator', 'Downloads', 'DrekoGames');
fs.mkdirSync(targetDir, { recursive: true });
const targetPath = path.join(targetDir, 'Supermarket.Simulator.debug.zip');

const downloadFromUrl = (downloadUrl, redirectCount = 0) => new Promise((resolve, reject) => {
  const parsedUrl = new URL(downloadUrl);
  const transport = parsedUrl.protocol === 'http:' ? http : https;

  console.log('requesting', downloadUrl, 'redirectCount=', redirectCount);

  const request = transport.get(downloadUrl, (response) => {
    const statusCode = response.statusCode || 0;
    console.log('statusCode=', statusCode, 'location=', response.headers.location || 'none');

    if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
      if (redirectCount > 5) {
        reject(new Error('Too many redirects while downloading the game.'));
        response.resume();
        return;
      }

      const nextUrl = new URL(response.headers.location, downloadUrl).toString();
      response.resume();
      resolve(downloadFromUrl(nextUrl, redirectCount + 1));
      return;
    }

    if (statusCode >= 400) {
      reject(new Error('This game is not available right now.'));
      response.resume();
      return;
    }

    const file = fs.createWriteStream(targetPath);
    response.on('data', (chunk) => {
      console.log('chunk', chunk.length);
    });
    response.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        console.log('saved to', targetPath, 'size=', fs.statSync(targetPath).size);
        resolve(targetPath);
      });
    });

    file.on('error', (error) => {
      console.error('file error', error.message);
      reject(error);
    });
  });

  request.on('error', (error) => {
    console.error('request error', error.message);
    reject(new Error('This game is not available right now.'));
  });
});

downloadFromUrl(url)
  .then((result) => {
    console.log('RESULT', result);
  })
  .catch((error) => {
    console.error('FAILED', error.message);
    process.exit(1);
  });
