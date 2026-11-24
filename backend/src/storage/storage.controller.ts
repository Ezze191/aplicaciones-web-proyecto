import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { StorageService } from './storage.service';

@ApiTags('Storage')
@Controller('uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @Post('evidence')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadEvidence(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const origin = host ? `${protocol}://${host}` : undefined;
    return this.storageService.uploadEvidence(file, origin);
  }
}
