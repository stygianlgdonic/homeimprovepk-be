import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly config: ConfigService) {}

  async upload(file: Express.Multer.File, folder: string): Promise<{ url: string }> {
    const cloudinaryUrl = this.config.get<string>('CLOUDINARY_URL');
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      return this.uploadToCloudinary(file, folder, cloudName, apiKey, apiSecret);
    }

    // Dev stub: return data URL
    this.logger.warn('Cloudinary not configured — returning data URL stub');
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    return { url: dataUrl };
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    folder: string,
    cloudName: string,
    apiKey: string,
    apiSecret: string,
  ): Promise<{ url: string }> {
    const crypto = await import('crypto');
    const timestamp = Math.round(Date.now() / 1000);
    const params = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(params).digest('hex');

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    formData.append('file', blob, file.originalname);
    formData.append('folder', folder);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Cloudinary upload failed: ${error}`);
    }

    const result = (await response.json()) as { secure_url: string };
    return { url: result.secure_url };
  }
}
