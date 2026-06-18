const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

let serverProcess;

function getPort() {
  return String(3100 + Math.floor(Math.random() * 1000));
}

function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("The local server did not start in time."));
          return;
        }

        setTimeout(check, 500);
      });

      req.setTimeout(1000, () => req.destroy());
    };

    check();
  });
}

function startNextServer(port) {
  const appPath = app.getAppPath();
  const standaloneDir = path.join(appPath, ".next", "standalone");
  const serverPath = path.join(standaloneDir, "server.js");

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      HOSTNAME: "127.0.0.1",
      PORT: port,
    },
    stdio: "ignore",
    windowsHide: true,
  });

  serverProcess.on("exit", () => {
    serverProcess = undefined;
  });
}

async function createWindow() {
  const port = getPort();
  const url = `http://127.0.0.1:${port}`;

  startNextServer(port);

  try {
    await waitForServer(url);
  } catch (error) {
    dialog.showErrorBox("Ebook Creator", error.message);
    app.quit();
    return;
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: "Ebook Creator",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadURL(url);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
