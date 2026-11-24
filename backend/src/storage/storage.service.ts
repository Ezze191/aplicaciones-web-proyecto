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

export interface UploadEvidenceOptions {
  folio?: string;
  stage?: 'antes' | 'despues';
}

interface CloudinaryCreds {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly uploadsRoot = path.join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {}

  async uploadEvidence(
    file: Express.Multer.File,
    requestOrigin?: string,
    options?: UploadEvidenceOptions,
  ): Promise<{
    url: string;
    path: string;
    sizeBytes: number;
    mimeType: string;
    provider: string;
  }> {
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

    const stage: 'antes' | 'despues' =
      options?.stage === 'despues' ? 'despues' : 'antes';
    const safeFolio = this.sanitizeFolio(options?.folio);
    const folderPath = safeFolio
      ? `reportes/${safeFolio}/${stage}`
      : 'reportes/pendientes';
    const shortId = crypto.randomUUID().slice(0, 8);
    const baseName = `evidencia_${stage}_${Date.now()}_${shortId}`;

    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL')?.trim();
    const parsedCloudinary = this.parseCloudinaryUrl(cloudinaryUrl);

    if (parsedCloudinary) {
      try {
        const uploaded = await this.uploadToCloudinary(
          file,
          parsedCloudinary,
          folderPath,
          baseName,
        );
        return {
          url: uploaded.secureUrl,
          path: uploaded.publicId,
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

    const targetDir = path.join(this.uploadsRoot, ...folderPath.split('/'));
    await fs.mkdir(targetDir, { recursive: true });
    const ext =
      file.mimetype === 'image/webp'
        ? 'webp'
        : file.mimetype === 'image/png'
          ? 'png'
          : 'jpg';
    const filename = `${baseName}.${ext}`;
    const fullPath = path.join(targetDir, filename);
    await fs.writeFile(fullPath, file.buffer);

    const relativePath = `${folderPath}/${filename}`;
    const baseUrl =
      requestOrigin ||
      `http://localhost:${this.configService.get<string>('PORT', '3000')}`;
    return {
      url: `${baseUrl}/uploads/${relativePath}`,
      path: relativePath,
      sizeBytes: file.size,
      mimeType: file.mimetype,
      provider: 'local',
    };
  }

  /**
   * Reubica una evidencia subida previamente a `reportes/pendientes/...` hacia
   * su carpeta definitiva `reportes/<FOLIO>/<antes|despues>/...` en Cloudinary
   * (o almacenamiento local) y devuelve la URL definitiva para guardar en BD.
   */
  async moveEvidenceToReportFolio(
    imageUrl: string,
    folio: string,
    stage: 'antes' | 'despues' = 'antes',
  ): Promise<string> {
    const trimmed = imageUrl.trim();
    const safeFolio = this.sanitizeFolio(folio);
    if (!trimmed || !safeFolio) return trimmed;

    // 1. Caso Cloudinary: renombrar public_id y actualizar asset_folder
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL')?.trim();
    const creds = this.parseCloudinaryUrl(cloudinaryUrl);
    if (creds && trimmed.includes(`res.cloudinary.com/${creds.cloudName}/`)) {
      const fromPublicId = this.extractCloudinaryPublicId(
        trimmed,
        creds.cloudName,
      );
      if (fromPublicId && fromPublicId.startsWith('reportes/pendientes/')) {
        const fileBase = fromPublicId.split('/').pop()!;
        const targetFolder = `reportes/${safeFolio}/${stage}`;
        const toPublicId = `${targetFolder}/${fileBase}`;
        try {
          const renamedUrl = await this.renameInCloudinary(
            creds,
            fromPublicId,
            toPublicId,
            targetFolder,
          );
          return renamedUrl;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error rename';
          this.logger.warn(
            `No se pudo mover la evidencia en Cloudinary a ${targetFolder}: ${msg}`,
          );
          return trimmed;
        }
      }
      return trimmed;
    }

    // 2. Caso local: mover de uploads/reportes/pendientes/... a uploads/reportes/<FOLIO>/<stage>/...
    const localMarker = '/uploads/reportes/pendientes/';
    const markerIdx = trimmed.indexOf(localMarker);
    if (markerIdx !== -1) {
      const filename = trimmed.slice(markerIdx + localMarker.length);
      if (filename && !filename.includes('..') && !filename.includes('/')) {
        const srcPath = path.join(
          this.uploadsRoot,
          'reportes',
          'pendientes',
          filename,
        );
        const destDir = path.join(this.uploadsRoot, 'reportes', safeFolio, stage);
        const destPath = path.join(destDir, filename);
        try {
          await fs.mkdir(destDir, { recursive: true });
          await fs.rename(srcPath, destPath);
          const originPrefix = trimmed.slice(0, markerIdx);
          return `${originPrefix}/uploads/reportes/${safeFolio}/${stage}/${filename}`;
        } catch {
          return trimmed;
        }
      }
    }

    return trimmed;
  }

  private sanitizeFolio(folio?: string): string | null {
    if (!folio) return null;
    const cleaned = folio
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    return cleaned.length > 0 ? cleaned : null;
  }

  private parseCloudinaryUrl(url?: string): CloudinaryCreds | null {
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

  private signCloudinaryParams(
    params: Record<string, string>,
    apiSecret: string,
  ): string {
    const sorted = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');
    return crypto
      .createHash('sha1')
      .update(`${sorted}${apiSecret}`)
      .digest('hex');
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    creds: CloudinaryCreds,
    folderPath: string,
    baseName: string,
  ): Promise<{ secureUrl: string; publicId: string }> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const publicId = `${folderPath}/${baseName}`;

    // En Cloudinary Dynamic Folder Mode, `asset_folder` crea las carpetas visibles
    // en Media Library y `public_id` define la ruta exacta en la URL.
    const paramsToSign: Record<string, string> = {
      asset_folder: folderPath,
      public_id: publicId,
      timestamp,
    };
    const signature = this.signCloudinaryParams(paramsToSign, creds.apiSecret);

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    formData.append('file', blob, file.originalname || `${baseName}.webp`);
    formData.append('asset_folder', folderPath);
    formData.append('public_id', publicId);
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
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} en Cloudinary ${errText}`);
    }

    const data = (await res.json()) as {
      secure_url?: string;
      public_id?: string;
    };
    if (!data.secure_url) {
      throw new Error('Cloudinary no devolvió secure_url');
    }
    return {
      secureUrl: data.secure_url,
      publicId: data.public_id ?? publicId,
    };
  }

  private extractCloudinaryPublicId(
    url: string,
    cloudName: string,
  ): string | null {
    try {
      const parsed = new URL(url);
      const prefix = `/${cloudName}/image/upload/`;
      const idx = parsed.pathname.indexOf(prefix);
      if (idx === -1) return null;
      let rest = parsed.pathname.slice(idx + prefix.length);
      // Quitar prefijo de versión v123456789/
      rest = rest.replace(/^v\d+\//, '');
      // Quitar extensión (.webp, .jpg, .png)
      return rest.replace(/\.[^/.]+$/, '');
    } catch {
      return null;
    }
  }

  private async renameInCloudinary(
    creds: CloudinaryCreds,
    fromPublicId: string,
    toPublicId: string,
    targetFolder: string,
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const renameParams: Record<string, string> = {
      from_public_id: fromPublicId,
      overwrite: 'true',
      timestamp,
      to_public_id: toPublicId,
    };
    const signature = this.signCloudinaryParams(renameParams, creds.apiSecret);

    const formData = new FormData();
    formData.append('from_public_id', fromPublicId);
    formData.append('to_public_id', toPublicId);
    formData.append('overwrite', 'true');
    formData.append('timestamp', timestamp);
    formData.append('api_key', creds.apiKey);
    formData.append('signature', signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/rename`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} al renombrar en Cloudinary ${errText}`);
    }

    const data = (await res.json()) as { secure_url?: string };
    if (!data.secure_url) {
      throw new Error('Cloudinary rename no devolvió secure_url');
    }

    // Actualizar también `asset_folder` vía Admin API para que en Media Library
    // se mueva visualmente a la carpeta `reportes/<FOLIO>/<stage>`.
    try {
      const authHeader =
        'Basic ' +
        Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
      await fetch(
        `https://api.cloudinary.com/v1_1/${creds.cloudName}/resources/image/upload/${encodeURIComponent(toPublicId)}`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ asset_folder: targetFolder }).toString(),
        },
      );
    } catch {
      // No bloquear si el ajuste visual de asset_folder falla
    }

    return data.secure_url;
  }
}
