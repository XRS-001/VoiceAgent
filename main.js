const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const server = spawn('npm', ['run', 'dev'], { shell: true });

let nextPort;

server.stdout.on('data', (data) => {
  const str = data.toString();
  const match = str.match(/Local:\s*(http:\/\/localhost:(\d+))/);
  if (match) {
    nextPort = parseInt(match[2], 10);
    console.log('Next.js running on port', nextPort);
  }
});

server.stderr.on('data', (data) => {
  console.error(data.toString());
});

// Function to check if Next.js is ready
function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      http.get(url, () => resolve())
        .on('error', () => {
          if (Date.now() - start > timeout) return reject(new Error('Server timeout'));
          setTimeout(check, 500); // retry every 500ms
        });
    }

    check();
  });
}

// IPC to stop server manually
ipcMain.on('stop-server', () => {
  console.log('Stopping Next.js server...');
  server.kill('SIGINT');
});

let win;

async function createWindow() {
  try {
    // Wait until Next.js stdout gives us the port
    while (!nextPort) await new Promise(r => setTimeout(r, 100));

    await waitForServer(`http://127.0.0.1:${nextPort}`);

    win = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 450,
      minHeight: 350,
      frame: false,
      alwaysOnTop: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js')
      }
    });

    win.loadURL(`http://127.0.0.1:${nextPort}`);

    win.on('closed', () => { win = null; });

  } catch (err) {
    console.error('Failed to load Next.js server:', err);
    app.quit();
  }
}

// Electron app lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  server.kill('SIGINT'); // make sure Next.js stops
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  server.kill('SIGINT'); // ensure server killed on quit
});
