import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const FORMAT_BY_MIME: Record<string, 'jpeg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const ALLOWED_PHOTO_MIME_TYPES = Object.keys(FORMAT_BY_MIME);
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * Strips image metadata (EXIF/GPS included) by decoding and re-encoding the
 * image before it leaves the server, then stores it with a signed Cloudinary
 * upload. The signature is generated locally with the API secret, so the
 * secret never reaches the browser.
 */
@Injectable()
export class PhotoStorageService {
  constructor(private readonly config: ConfigService) {}

  async store(
    file: { buffer: Buffer; mimetype: string; originalname: string },
    studentId: string,
  ): Promise<string> {
    const format = FORMAT_BY_MIME[file.mimetype];
    if (!format) {
      throw new BadRequestException('Photo must be a JPEG, PNG or WebP image');
    }

    const cleaned = await this.stripMetadata(file.buffer, format);

    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new ServiceUnavailableException(
        'Photo storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }

    const folder = `school-system/students/${studentId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(cleaned)], { type: file.mimetype }),
      file.originalname,
    );
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: form },
    );
    const payload = (await response.json().catch(() => null)) as {
      secure_url?: string;
      error?: { message?: string };
    } | null;

    if (!response.ok || !payload?.secure_url) {
      throw new BadGatewayException(
        payload?.error?.message ?? 'The photo could not be uploaded',
      );
    }

    return payload.secure_url;
  }

  /** Re-encoding drops EXIF, GPS and other embedded metadata. */
  private async stripMetadata(
    buffer: Buffer,
    format: 'jpeg' | 'png' | 'webp',
  ): Promise<Buffer> {
    try {
      return await sharp(buffer).rotate().toFormat(format).toBuffer();
    } catch {
      throw new BadRequestException('The uploaded file is not a valid image');
    }
  }
}
