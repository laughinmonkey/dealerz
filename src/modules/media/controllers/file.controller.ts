import { Controller, Get, Post, Param, Body, Req, UseInterceptors, UploadedFile, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/auth.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { FileStorageService } from '../services/file-storage.service';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';

@ApiTags('Files')
@Controller('files')
export class FileController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: FileStorageService,
  ) {}

  @Public()
  @Get(':fileId')
  @ApiOperation({ summary: 'Resolve a file ID to its URL' })
  async resolve(@Param('fileId') fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: { fileUrl: true, fileName: true, fileType: true, fileSize: true },
    });
    if (!file || file.fileUrl === null) {
      throw new NotFoundException('File not found');
    }
    return file;
  }

  @Post('upload')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file and get its URL' })
  @ApiConsumes('multipart/form-data')
  async upload(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const fileUrl = await this.storageService.upload(file, {
      folder: 'general',
      category: 'GENERAL',
      uploadedBy: req.user.sub,
    });

    const record = await this.prisma.file.create({
      data: {
        fileName: file.originalname,
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        category: 'GENERAL',
        uploadedBy: req.user.sub,
      },
    });

    return { id: record.id, fileUrl, fileName: file.originalname, fileType: file.mimetype, fileSize: file.size };
  }

  @Post('presigned-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a presigned upload URL for direct-to-storage upload' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileName', 'folder', 'contentType'],
      properties: {
        fileName: { type: 'string', example: 'photo.jpg' },
        folder: { type: 'string', example: 'assets' },
        contentType: { type: 'string', example: 'image/jpeg' },
      },
    },
  })
  async getPresignedUploadUrl(
    @Body() body: { fileName: string; folder: string; contentType: string },
  ) {
    if (!body.fileName || !body.folder || !body.contentType) {
      throw new BadRequestException('fileName, folder, and contentType are required.');
    }

    const result = await this.storageService.getPresignedUploadUrl(
      body.fileName,
      body.folder,
      body.contentType,
    );

    return result;
  }

  @Post('confirm-upload')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm a completed presigned upload and register it' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileUrl', 'fileName', 'fileType', 'fileSize'],
      properties: {
        fileUrl: { type: 'string', example: 'https://assets.example.com/assets/uuid.jpg' },
        fileName: { type: 'string', example: 'photo.jpg' },
        fileType: { type: 'string', example: 'image/jpeg' },
        fileSize: { type: 'number', example: 102400 },
        category: { type: 'string', example: 'ASSET_IMAGE' },
      },
    },
  })
  async confirmUpload(
    @Req() req: AuthenticatedRequest,
    @Body() body: { fileUrl: string; fileName: string; fileType: string; fileSize: number; category?: string },
  ) {
    if (!body.fileUrl || !body.fileName || !body.fileType || body.fileSize === undefined) {
      throw new BadRequestException('fileUrl, fileName, fileType, and fileSize are required.');
    }

    const result = await this.storageService.confirmUpload(body.fileUrl, {
      fileName: body.fileName,
      fileType: body.fileType,
      fileSize: body.fileSize,
      category: body.category,
      uploadedBy: req.user.sub,
    });

    return result;
  }
}
