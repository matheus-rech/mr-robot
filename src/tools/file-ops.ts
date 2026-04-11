import { Tool } from './base';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File operations tool for reading, writing, and listing files.
 * Restricted to a safe directory to prevent system file access.
 */
export class FileOpsTool implements Tool {
  name = 'file_ops';
  description = 'Read, write, and list files in the user workspace';
  private workspaceDir: string;

  constructor() {
    // Use workspace directory in project root
    this.workspaceDir = path.join(process.cwd(), 'workspace');
  }

  async execute(args: string): Promise<string> {
    try {
      const parsed = JSON.parse(args);
      const { operation, filePath, content } = parsed;

      // Ensure workspace directory exists
      await fs.mkdir(this.workspaceDir, { recursive: true });

      // Validate and resolve path (prevent directory traversal)
      const safePath = this.resolveSafePath(filePath);
      if (!safePath) {
        return 'Error: Invalid or unsafe file path';
      }

      switch (operation) {
        case 'read':
          return await this.readFile(safePath);

        case 'write':
          if (!content) {
            return 'Error: Content is required for write operation';
          }
          return await this.writeFile(safePath, content);

        case 'list':
          return await this.listFiles(safePath);

        case 'delete':
          return await this.deleteFile(safePath);

        default:
          return `Error: Unknown operation "${operation}". Supported: read, write, list, delete`;
      }

    } catch (error: any) {
      return `File operation error: ${error.message}`;
    }
  }

  private resolveSafePath(filePath: string): string | null {
    try {
      // Resolve the path and ensure it's within workspace
      const resolved = path.resolve(this.workspaceDir, filePath);

      // Check if resolved path is within workspace
      if (!resolved.startsWith(this.workspaceDir + path.sep) && resolved !== this.workspaceDir) {
        return null;
      }

      return resolved;
    } catch {
      return null;
    }
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return `File content:\n${content}`;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 'Error: File not found';
      }
      throw error;
    }
  }

  private async writeFile(filePath: string, content: string): Promise<string> {
    try {
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      return `File written successfully: ${path.relative(this.workspaceDir, filePath)}`;
    } catch (error: any) {
      throw error;
    }
  }

  private async listFiles(dirPath: string): Promise<string> {
    try {
      const stats = await fs.stat(dirPath);

      if (stats.isFile()) {
        // If it's a file, just return the file info
        const size = stats.size;
        const modified = stats.mtime.toISOString();
        return `File: ${path.basename(dirPath)}\nSize: ${size} bytes\nModified: ${modified}`;
      }

      // If it's a directory, list contents
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const fileList = entries.map(entry => {
        const type = entry.isDirectory() ? 'DIR ' : 'FILE';
        return `${type} ${entry.name}`;
      }).join('\n');

      return `Directory contents:\n${fileList}`;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 'Error: Path not found';
      }
      throw error;
    }
  }

  private async deleteFile(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        return 'Error: Cannot delete directories. Please specify a file.';
      }

      await fs.unlink(filePath);
      return `File deleted successfully: ${path.relative(this.workspaceDir, filePath)}`;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return 'Error: File not found';
      }
      throw error;
    }
  }
}
