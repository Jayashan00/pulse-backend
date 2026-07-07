import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

@Injectable()
export class UploadService {
  /** Saves the file to local disk and returns a public URL served by this API. */
  async upload(file: Express.Multer.File, folder: 'avatars' | 'posts') {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WEBP, GIF, MP4 or WEBM files are allowed');
    }
    if (file.size > MAX_BYTES) throw new BadRequestException('File is larger than 25 MB');

    const dir = path.join(UPLOAD_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });

    const ext = file.originalname.split('.').pop() || 'bin';
    const filename = `${uuid()}.${ext}`;
    fs.writeFileSync(path.join(dir, filename), file.buffer);

    const base = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
    const url = `${base}/api/uploads/${folder}/${filename}`;
    const mediaType = file.mimetype.startsWith('video') ? 'video' : file.mimetype === 'image/gif' ? 'gif' : 'image';
    return { url, mediaType, path: `${folder}/${filename}` };
  }
}