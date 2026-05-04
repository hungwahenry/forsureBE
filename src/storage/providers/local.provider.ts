import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Env } from '../../config/env.schema';
import {
  FetchedObject,
  PutOptions,
  StorageProvider,
} from '../storage.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;
  private readonly publicBase: string;
  private readonly contentTypes = new Map<string, string>();

  constructor(config: ConfigService<Env, true>) {
    this.baseDir = path.resolve(
      config.get('LOCAL_STORAGE_DIR', { infer: true }),
    );
    this.publicBase = config
      .get('LOCAL_PUBLIC_URL', { infer: true })!
      .replace(/\/$/, '');
  }

  async put(key: string, body: Buffer, opts: PutOptions): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);
    this.contentTypes.set(key, opts.contentType);
  }

  async get(key: string): Promise<FetchedObject> {
    const filePath = path.join(this.baseDir, key);
    const body = await fs.readFile(filePath);
    return {
      body,
      contentType: this.contentTypes.get(key) ?? 'application/octet-stream',
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    await fs.unlink(filePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
    this.contentTypes.delete(key);
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }
}
