import {
  Body,
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
        folio: { type: 'string', example: 'SIM-2026-0842' },
        stage: { type: 'string', enum: ['antes', 'despues'] },
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
    @Body() body?: { folio?: string; stage?: string },
  ) {
    const protocol = req.protocol || 'http';
    const host = req.get('host');
    const origin = host ? `${protocol}://${host}` : undefined;
    const rawStage = body?.stage?.trim().toLowerCase();
    const stage =
      rawStage === 'despues' || rawStage === 'antes' ? rawStage : undefined;

    return this.storageService.uploadEvidence(file, origin, {
      folio: body?.folio,
      stage,
    });
  }
}
