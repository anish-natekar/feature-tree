import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

let panel: vscode.WebviewPanel | undefined;
const NODE_EDITOR_VIEW_TYPE = "featureTree.node";

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

/** Resolve a Citations/Abstract/etc. markdown link's href against the node file it was rendered on,
 *  same as a browser would resolve a relative link — but refuse anything outside the workspace. */
function resolveHref(fromAbsPath: string, href: unknown): string | undefined {
  if (typeof href !== "string" || !href) return undefined;
  const wsRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!wsRoot) return undefined;
  const target = path.resolve(path.dirname(fromAbsPath), href);
  return (target === wsRoot || target.startsWith(wsRoot + path.sep)) && fs.existsSync(target) ? target : undefined;
}

async function openHref(fromAbsPath: string, href: unknown): Promise<void> {
  const target = resolveHref(fromAbsPath, href);
  if (!target) {
    vscode.window.showWarningMessage(`Feature Tree: can't open "${href}" (missing, or outside the workspace).`);
    return;
  }
  const doc = await vscode.workspace.openTextDocument(target);
  await vscode.window.showTextDocument(doc, { preview: true });
}

function html(webview: vscode.Webview, ext: vscode.Uri, mode?: "node"): string {
  const uri = (f: string) => webview.asWebviewUri(vscode.Uri.joinPath(ext, "media", f));
  const nonce = Math.random().toString(36).slice(2);
  const modeScript = mode ? `<script nonce="${nonce}">window.FT_MODE=${JSON.stringify(mode)};</script>` : "";
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<link rel="stylesheet" href="${uri("graph.css")}"></head>
<body><div id="toolbar"></div><div id="viewport"><div id="canvas"><svg id="edges"></svg></div></div>
${modeScript}
<script nonce="${nonce}" src="${uri("tree.js")}"></script>
<script nonce="${nonce}" src="${uri("graph.js")}"></script></body></html>`;
}

/** Custom editor for a single node .md: same section-card UI as the graph drawer, opened as a normal tab. */
class FeatureNodeEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly ctx: vscode.ExtensionContext) {}

  resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): void {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.ctx.extensionUri, "media")],
    };
    webviewPanel.webview.html = html(webviewPanel.webview, this.ctx.extensionUri, "node");

    const relPath = (): string => {
      const root = featuresRoot();
      const fsPath = document.uri.fsPath;
      if (root && fsPath.startsWith(root + path.sep)) return path.relative(root, fsPath).split(path.sep).join("/");
      return path.basename(fsPath);
    };

    const send = () => webviewPanel.webview.postMessage({ type: "doc", path: relPath(), text: document.getText() });

    const changeSub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) send();
    });

    webviewPanel.webview.onDidReceiveMessage(async (m) => {
      switch (m.type) {
        case "ready":
          send();
          break;
        case "external":
          if (typeof m.url === "string" && /^https?:\/\//.test(m.url)) vscode.env.openExternal(vscode.Uri.parse(m.url));
          break;
        case "raw":
          await vscode.commands.executeCommand("vscode.openWith", document.uri, "default", webviewPanel.viewColumn);
          break;
        case "openPath":
          await openHref(document.uri.fsPath, m.href);
          break;
        case "write": {
          if (typeof m.text !== "string" || m.text === document.getText()) return;
          const edit = new vscode.WorkspaceEdit();
          edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), m.text);
          await vscode.workspace.applyEdit(edit);
          await document.save();
          break;
        }
      }
    });

    webviewPanel.onDidDispose(() => changeSub.dispose());
  }
}

export function activate(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(vscode.window.registerCustomEditorProvider(NODE_EDITOR_VIEW_TYPE, new FeatureNodeEditorProvider(ctx), { webviewOptions: { retainContextWhenHidden: true } }));

  // always-visible button: extension only activates when features/SCHEMA.md exists, so no need to gate this
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = "$(type-hierarchy) Feature Tree";
  statusBar.tooltip = "Open Feature Tree graph";
  statusBar.command = "featureTree.openGraph";
  statusBar.show();
  ctx.subscriptions.push(statusBar);

  // activity-bar icon's sidebar view: no tree data of its own, just hosts the "Open Graph" viewsWelcome button
  ctx.subscriptions.push(
    vscode.window.registerTreeDataProvider("featureTree.sidebar", {
      getTreeItem: (e: vscode.TreeItem) => e,
      getChildren: () => [],
    })
  );

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
            if (abs) vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(abs), NODE_EDITOR_VIEW_TYPE);
            break;
          }
          case "openPath": {
            const fromAbs = safePath(root, m.node);
            if (fromAbs) await openHref(fromAbs, m.href);
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
