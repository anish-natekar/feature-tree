import * as vscode from "vscode";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let panel: vscode.WebviewPanel | undefined;

function featuresRoot(): string | undefined {
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder ? path.join(folder.uri.fsPath, "features") : undefined;
}

function readFiles(root: string, rel = ""): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...readFiles(root, r));
    else if (e.name.endsWith(".md")) out.push({ path: r, text: fs.readFileSync(path.join(root, r), "utf8") });
  }
  return out;
}

/** Resolve a webview-supplied relative path to an existing .md under features/, else undefined. */
function safePath(root: string, rel: unknown): string | undefined {
  if (typeof rel !== "string" || !rel.endsWith(".md")) return undefined;
  const abs = path.resolve(root, rel);
  return abs.startsWith(root + path.sep) && fs.existsSync(abs) ? abs : undefined;
}

function html(webview: vscode.Webview, ext: vscode.Uri): string {
  const uri = (f: string) => webview.asWebviewUri(vscode.Uri.joinPath(ext, "media", f));
  const nonce = Math.random().toString(36).slice(2);
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${uri("graph.css")}"></head>
<body><div id="toolbar"></div><div id="viewport"><div id="canvas"><svg id="edges"></svg></div></div>
<script nonce="${nonce}" src="${uri("tree.js")}"></script>
<script nonce="${nonce}" src="${uri("graph.js")}"></script></body></html>`;
}

/** Launch Claude Code in a terminal. Prompt goes through a temp file so no file content is ever shell-interpreted. */
function launchClaude(prompt: string): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ft-prompt-"));
  const file = path.join(dir, "prompt.txt");
  fs.writeFileSync(file, prompt);
  const term = vscode.window.createTerminal({ name: "Claude (feature tree)", cwd: vscode.workspace.workspaceFolders?.[0].uri });
  term.show();
  term.sendText(`claude "$(cat '${file}')"`);
}

export function activate(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.commands.registerCommand("featureTree.openGraph", () => {
      const root = featuresRoot();
      if (!root || !fs.existsSync(root)) {
        vscode.window.showWarningMessage("Feature Tree: open a workspace with a features/ folder.");
        return;
      }
      if (panel) {
        panel.reveal();
        return;
      }
      panel = vscode.window.createWebviewPanel("featureTreeGraph", "Feature Tree", vscode.ViewColumn.Active, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(ctx.extensionUri, "media")],
      });
      panel.webview.html = html(panel.webview, ctx.extensionUri);
      const send = () => {
        try {
          panel?.webview.postMessage({ type: "files", files: readFiles(root) });
        } catch (e) {
          vscode.window.showErrorMessage(`Feature Tree: ${e}`);
        }
      };
      panel.webview.onDidReceiveMessage(async (m) => {
        switch (m.type) {
          case "ready":
            send();
            break;
          case "external":
            if (typeof m.url === "string" && /^https?:\/\//.test(m.url)) vscode.env.openExternal(vscode.Uri.parse(m.url));
            break;
          case "open": {
            const abs = safePath(root, m.path);
            if (abs) vscode.window.showTextDocument(vscode.Uri.file(abs));
            break;
          }
          case "write": {
            const abs = safePath(root, m.path);
            if (!abs || typeof m.text !== "string") return;
            // go through the editor so open buffers stay in sync and undo works
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(abs));
            const edit = new vscode.WorkspaceEdit();
            edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), m.text);
            await vscode.workspace.applyEdit(edit);
            await doc.save();
            break;
          }
          case "claude":
            if (typeof m.prompt === "string") launchClaude(m.prompt);
            break;
        }
      });
      const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(root, "**/*.md"));
      watcher.onDidChange(send);
      watcher.onDidCreate(send);
      watcher.onDidDelete(send);
      panel.onDidDispose(() => {
        watcher.dispose();
        panel = undefined;
      });
    })
  );
}

export function deactivate(): void {}
