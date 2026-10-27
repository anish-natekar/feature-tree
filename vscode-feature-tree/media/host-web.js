// Browser host: no server. Reads/writes a chosen features/ folder via the File System Access API (Chromium).
(function () {
  let dir = null, cb = null, lastSig = "", timer = null;

  async function walk(d, prefix, out) {
    for await (const [name, h] of d.entries()) {
      if (h.kind === "directory") await walk(h, prefix + name + "/", out);
      else if (name.endsWith(".md")) out.push({ path: prefix + name, text: await (await h.getFile()).text() });
    }
  }

  async function scan(force) {
    if (!dir || !cb) return;
    const out = [];
    await walk(dir, "", out);
    out.sort((a, b) => (a.path < b.path ? -1 : 1));
    const sig = out.map((f) => f.path + "\0" + f.text).join("\1");
    if (force || sig !== lastSig) { lastSig = sig; cb(out); }
  }

  async function fileHandle(path) {
    const parts = path.split("/");
    if (parts.some((p) => !p || p === "." || p === "..") || !path.endsWith(".md")) throw new Error("bad path");
    let d = dir;
    for (const p of parts.slice(0, -1)) d = await d.getDirectoryHandle(p);
    return d.getFileHandle(parts[parts.length - 1]); // must already exist: viewer never creates files
  }

  window.FT_HOST = {
    kind: "web",
    rootName: "features",
    canPick: typeof window.showDirectoryPicker === "function",
    async pick() {
      dir = await window.showDirectoryPicker({ mode: "readwrite" });
      await scan(true);
      clearInterval(timer);
      timer = setInterval(() => { if (!document.hidden) scan(false); }, 1500);
    },
    onFiles(f) { cb = f; },
    async write(path, text) {
      const fh = await fileHandle(path);
      const w = await fh.createWritable();
      await w.write(text);
      await w.close();
    },
    external(url) { if (/^https?:\/\//.test(url)) window.open(url, "_blank", "noopener"); },
    async claude(prompt) {
      await navigator.clipboard.writeText(prompt);
      return "Prompt copied. Paste it into Claude Code.";
    },
  };
})();
