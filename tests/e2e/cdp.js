// Minimal CDP driver for headless Brave: one page per openPage, console-error
// collection, real mouse/keyboard input, and a reload helper. Every protocol
// request has a deadline, a browser disconnect rejects anything still pending,
// and a failed page start closes its own target.
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const BRAVE = "/usr/bin/brave-browser-stable";
const LAUNCH_TIMEOUT_MS = 15000;
const LAUNCH_POLL_MS = 250;
const LOAD_TIMEOUT_MS = 30000;
const REQUEST_TIMEOUT_MS = 30000;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`${options?.method ?? "GET"} ${url} -> ${response.status}`);
  return response.json();
};

const consoleText = (args) =>
  args.map((arg) => arg.value ?? arg.description ?? "").join(" ");

// Signal the whole browser process group; ESRCH just means it is gone.
const killGroup = (pid, signal = "SIGTERM") => {
  try {
    process.kill(-pid, signal);
  } catch {
    // Already dead: nothing to signal.
  }
};

async function openSocket(url) {
  const socket = new WebSocket(url);
  await new Promise((done, fail) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", () => fail(new Error(`WebSocket failed: ${url}`)), { once: true });
  });
  return socket;
}

async function createPage(port, url, { width = 1280, height = 720 } = {}) {
  const target = await fetchJson(`http://localhost:${port}/json/new?about:blank`, { method: "PUT" });
  let socket;
  try {
    socket = await openSocket(target.webSocketDebuggerUrl);
    return await wirePage(socket, port, target.id, url, { width, height });
  } catch (error) {
    // Never leak a target the caller cannot see or close.
    socket?.close();
    await fetch(`http://localhost:${port}/json/close/${target.id}`).catch(() => {});
    throw error;
  }
}

async function wirePage(socket, port, targetId, url, { width, height }) {
  const pending = new Map(); // id -> { resolve, reject, timer }
  const listeners = new Map();
  const errors = [];
  let nextId = 0;

  const failAll = (reason) => {
    for (const { reject, timer } of pending.values()) {
      clearTimeout(timer);
      reject(new Error(reason));
    }
    pending.clear();
  };
  socket.addEventListener("close", () => failAll("browser connection closed"));
  socket.addEventListener("error", () => failAll("browser connection failed"));

  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== undefined) {
      const { resolve, reject, timer } = pending.get(message.id) ?? {};
      if (!pending.delete(message.id)) return;
      clearTimeout(timer);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolve(message.result);
      return;
    }
    for (const listener of listeners.get(message.method) ?? []) listener(message.params);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${REQUEST_TIMEOUT_MS} ms`));
      }, REQUEST_TIMEOUT_MS);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const on = (method, listener) => {
    listeners.set(method, [...(listeners.get(method) ?? []), listener]);
  };
  const off = (method, listener) => {
    listeners.set(method, (listeners.get(method) ?? []).filter((l) => l !== listener));
  };

  on("Runtime.exceptionThrown", ({ exceptionDetails }) => {
    errors.push(`exception: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ""}`.trim());
  });
  on("Runtime.consoleAPICalled", ({ type, args }) => {
    if (type === "error" || type === "assert") errors.push(`console.${type}: ${consoleText(args)}`);
  });
  on("Log.entryAdded", ({ entry }) => {
    if (entry.level === "error") errors.push(`log: ${entry.text} ${entry.url ?? ""}`.trim());
  });

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (exceptionDetails) {
      throw new Error(`evaluate failed: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`);
    }
    return result.value;
  };

  const waitFor = async (expression, timeoutMs = 10000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      let ok = false;
      try {
        ok = await evaluate(expression);
      } catch {
        // The context can vanish mid-navigation; keep polling until the deadline.
      }
      if (ok) return;
      if (Date.now() >= deadline) {
        throw new Error(`waitFor timed out after ${timeoutMs} ms: ${expression}`);
      }
      await sleep(100);
    }
  };

  const click = async (selector) => {
    const { x, y, diag } = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) {
        const app = document.getElementById("app");
        return { diag: JSON.stringify({
          ready: document.readyState,
          url: location.href,
          appLen: app ? app.innerHTML.length : -1,
          hook: typeof window.__landfall,
          head: document.body.innerHTML.slice(0, 120),
        }) };
      }
      el.scrollIntoView({ block: "center" });
      const box = el.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    })()`);
    if (diag) throw new Error(`click: no element matches ${selector} — ${diag}`);
    const mouse = { x, y, button: "left", clickCount: 1 };
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...mouse });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...mouse });
  };

  const key = (type, code, keyName, windowsVirtualKeyCode) =>
    send("Input.dispatchKeyEvent", { type, code, key: keyName, windowsVirtualKeyCode });

  const reload = async () => {
    // readyState alone can observe the OLD document's "complete"; wait for the
    // new main-frame navigation first, then for that document to settle.
    let navigated = false;
    const onNavigated = ({ frame }) => {
      if (!frame.parentId) navigated = true;
    };
    on("Page.frameNavigated", onNavigated);
    try {
      await send("Page.reload");
      const deadline = Date.now() + 10000;
      while (!navigated && Date.now() < deadline) await sleep(100);
      if (!navigated) throw new Error("reload: the main frame did not navigate");
      await waitFor("document.readyState === 'complete'", 30000);
    } finally {
      off("Page.frameNavigated", onNavigated);
    }
  };

  const screenshot = async (file) => {
    const { data } = await send("Page.captureScreenshot", { format: "png" });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(data, "base64"));
  };

  const close = async () => {
    socket.close();
    await fetch(`http://localhost:${port}/json/close/${targetId}`).catch(() => {});
  };

  await send("Runtime.enable");
  await send("Log.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

  // Event-based load detection races the initial about:blank navigation;
  // poll the document instead so the page is really ready.
  await send("Page.navigate", { url });
  await waitFor(`document.readyState === "complete" && location.href === ${JSON.stringify(url)}`, LOAD_TIMEOUT_MS);

  const page = { errors, send, on, evaluate, waitFor, click, key, reload, screenshot, close };
  return page;
}

export async function connectBrowser(port = 9222) {
  const versionUrl = `http://localhost:${port}/json/version`;
  let child = null;
  let userDataDir = null;
  try {
    await fetchJson(versionUrl);
  } catch {
    userDataDir = mkdtempSync(join(tmpdir(), "landfall-brave-"));
    // detached: true puts the wrapper and the real browser it launches into
    // their own process group, so close() can kill both (bash does not
    // forward signals to the binary it runs).
    child = spawn(BRAVE, [
      `--remote-debugging-port=${port}`,
      "--headless=new",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ], { detached: true, stdio: "ignore" });
    const deadline = Date.now() + LAUNCH_TIMEOUT_MS;
    for (;;) {
      try {
        await fetchJson(versionUrl);
        break;
      } catch (error) {
        if (Date.now() >= deadline) {
          killGroup(child.pid);
          rmSync(userDataDir, { recursive: true, force: true });
          throw new Error(`Brave did not start within ${LAUNCH_TIMEOUT_MS / 1000} s`, { cause: error });
        }
        await sleep(LAUNCH_POLL_MS);
      }
    }
  }

  return {
    openPage: (url, opts = {}) => createPage(port, url, opts),
    close: async () => {
      if (child) {
        const exited = new Promise((done) => child.once("exit", done));
        killGroup(child.pid); // SIGTERM lets the browser shut its tree down.
        const force = setTimeout(() => killGroup(child.pid, "SIGKILL"), 2000);
        await Promise.race([exited, new Promise((done) => setTimeout(done, 5000))]);
        clearTimeout(force);
      }
      if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
    },
  };
}
