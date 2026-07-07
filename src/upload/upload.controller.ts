import { Controller, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(FirebaseAuthGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Query('folder') folder: 'avatars' | 'posts' = 'posts') {
    return this.uploadService.upload(file, folder === 'avatars' ? 'avatars' : 'posts');
  }
}
