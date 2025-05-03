import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const provider = new WorkspaceFilesProvider();
  // Register our TreeDataProvider under the view ID:
  vscode.window.registerTreeDataProvider(
    'code-concat-ai.fileSelector',
    provider
  );

  // Command: toggle selection when user clicks an item
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'code-concat-ai.toggleSelect',
      (resource: vscode.Uri) => {
        provider.toggle(resource);
      }
    )
  );

  // Command: concatenate selected files
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'code-concat-ai.copyToOne',
      async () => {
        const files = provider.getSelectedFiles();
        if (files.length === 0) {
          vscode.window.showInformationMessage('No files selected in the sidebar.');
          return;
        }
        let combined = '';
        for (const uri of files) {
          const bytes = await vscode.workspace.fs.readFile(uri);
          combined += `\n\n// ===== FILE: ${uri.fsPath} =====\n\n` + bytes.toString();
        }
        const doc = await vscode.workspace.openTextDocument({ content: combined, language: 'plaintext' });
        await vscode.window.showTextDocument(doc);
      }
    )
  );
}

// TreeDataProvider implementation
class WorkspaceFilesProvider implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<FileItem | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  // Keep track of checked URIs
  private selected = new Set<string>();

  // Toggle selection state
  toggle(uri: vscode.Uri) {
    const key = uri.toString();
    if (this.selected.has(key)) this.selected.delete(key);
    else this.selected.add(key);
    this._onDidChangeTreeData.fire();   // refresh entire view
  }

  // Public getter for the command
  getSelectedFiles(): vscode.Uri[] {
    return Array.from(this.selected).map(s => vscode.Uri.parse(s));
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FileItem): Promise<FileItem[]> {
    // If no workspace, nothing to show
    const roots = vscode.workspace.workspaceFolders;
    if (!roots) return [];

    // If we’re at root level, show each workspace folder
    if (!element) {
      return roots.map(f => new FileItem(f.uri, vscode.FileType.Directory, this));
    }

    // Otherwise, list children of the folder
    const stat = await vscode.workspace.fs.stat(element.resourceUri);
    if (stat.type === vscode.FileType.Directory) {
      const entries = await vscode.workspace.fs.readDirectory(element.resourceUri);
      // sort directories first
      entries.sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
      return entries.map(
        ([name, type]) =>
          new FileItem(vscode.Uri.joinPath(element.resourceUri, name), type, this)
      );
    }
    return [];
  }
}

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly resourceUri: vscode.Uri,
    public readonly type: vscode.FileType,
    private provider: WorkspaceFilesProvider
  ) {
    super(
      resourceUri,
      type === vscode.FileType.Directory
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None
    );
    // simulate a checkbox in the label
    const key = resourceUri.toString();
    const checked = this.provider['selected'].has(key);
    this.label = `${checked ? '[x]' : '[ ]'} ${resourceUri.path.split('/').pop()}`;
    if (type === vscode.FileType.File) {
      // clicking a file toggles selection
      this.command = {
        command: 'code-concat-ai.toggleSelect',
        title: 'Toggle Select',
        arguments: [resourceUri],
      };
    }
    // use a folder icon for directories
    if (type === vscode.FileType.Directory) {
      this.iconPath = vscode.ThemeIcon.Folder;
    }
  }
}

export function deactivate() {}
