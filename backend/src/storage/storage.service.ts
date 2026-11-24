import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (README 14.1)

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'evidences');

  constructor(private readonly configService: ConfigService) {}

  async uploadEvidence(
    file: Express.Multer.File,
    requestOrigin?: string,
  ): Promise<{ url: string; sizeBytes: number; mimeType: string; provider: string }> {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo de imagen.');
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'Formato no permitido. Solo se aceptan imágenes JPG, PNG o WebP.',
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        'La imagen excede el límite máximo permitido de 10 MB.',
      );
    }

    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL')?.trim();
    const parsedCloudinary = this.parseCloudinaryUrl(cloudinaryUrl);

    if (parsedCloudinary) {
      try {
        const uploadedUrl = await this.uploadToCloudinary(
          file,
          parsedCloudinary,
        );
        return {
          url: uploadedUrl,
          sizeBytes: file.size,
          mimeType: file.mimetype,
          provider: 'cloudinary',
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error Cloudinary';
        this.logger.warn(
          `Fallo al subir a Cloudinary, usando respaldo local: ${msg}`,
        );
      }
    }

    await fs.mkdir(this.uploadDir, { recursive: true });
    const ext =
      file.mimetype === 'image/webp'
        ? 'webp'
        : file.mimetype === 'image/png'
          ? 'png'
          : 'jpg';
    const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const fullPath = path.join(this.uploadDir, filename);
    await fs.writeFile(fullPath, file.buffer);

    const baseUrl =
      requestOrigin ||
      `http://localhost:${this.configService.get<string>('PORT', '3000')}`;
    return {
      url: `${baseUrl}/uploads/evidences/${filename}`,
      sizeBytes: file.size,
      mimeType: file.mimetype,
      provider: 'local',
    };
  }

  private parseCloudinaryUrl(url?: string): {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  } | null {
    if (!url || !url.startsWith('cloudinary://') || url.includes('demo:demo@demo')) {
      return null;
    }
    try {
      const stripped = url.replace('cloudinary://', '');
      const [creds, cloudName] = stripped.split('@');
      const [apiKey, apiSecret] = creds.split(':');
      if (!cloudName || !apiKey || !apiSecret || apiKey === 'api_key') {
        return null;
      }
      return { cloudName, apiKey, apiSecret };
    } catch {
      return null;
    }
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    creds: { cloudName: string; apiKey: string; apiSecret: string },
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const folder = 'siu_torreon_evidences';
    const signatureBase = `folder=${folder}&timestamp=${timestamp}${creds.apiSecret}`;
    const signature = crypto
      .createHash('sha1')
      .update(signatureBase)
      .digest('hex');

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    formData.append('file', blob, file.originalname || 'evidencia.webp');
    formData.append('folder', folder);
    formData.append('timestamp', timestamp);
    formData.append('api_key', creds.apiKey);
    formData.append('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} en Cloudinary`);
    }

    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
      throw new Error('Cloudinary no devolvió secure_url');
    }
    return data.secure_url;
  }
}
