import {
  Controller, Post, Get, Body, Param, Req, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { KycService } from '../services/kyc.service';
import { FileStorageService } from '../../media/services/file-storage.service';
import { Roles } from '../../../common/decorators/auth.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request';
import { SubmitKycDto, RejectKycDto } from '../dto/kyc.dto';

// multer file type
interface MulterFile {
  originalname: string;
  filename?: string;
  mimetype: string;
  size: number;
}

@ApiTags('KYC')
@Controller('kyc')
@ApiBearerAuth()
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly storageService: FileStorageService,
  ) {}

  @Post('submit')
  @ApiOperation({ summary: 'Submit KYC for verification' })
  async submit(@Req() req: AuthenticatedRequest, @Body() dto: SubmitKycDto) {
    return await this.kycService.submitKyc(req.user.sub, dto.notes);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get my KYC status' })
  async getStatus(@Req() req: AuthenticatedRequest) {
    const status = await this.kycService.getKycStatus(req.user.sub);
    return status ?? { message: 'No KYC request found.' };
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a KYC document' })
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @Req() req: AuthenticatedRequest,
    @Body('kycId') kycId: string,
    @UploadedFile() file: MulterFile,
  ) {
    if (!kycId) {
      throw new BadRequestException('kycId is required.');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    // Upload the file via the active storage provider
    const fileUrl = await this.storageService.upload(file as unknown as Express.Multer.File, { folder: 'kyc', category: 'KYC', uploadedBy: req.user.sub });

    return await this.kycService.uploadDocument(kycId, {
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
    });
  }

  @Post('documents/presigned')
  @ApiOperation({ summary: 'Link a presigned-uploaded file as a KYC document' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['kycId', 'fileUrl', 'fileName', 'fileType', 'fileSize'],
      properties: {
        kycId: { type: 'string', example: 'uuid' },
        fileUrl: { type: 'string', example: 'https://assets.example.com/kyc/uuid.jpg' },
        fileName: { type: 'string', example: 'passport.jpg' },
        fileType: { type: 'string', example: 'image/jpeg' },
        fileSize: { type: 'number', example: 102400 },
      },
    },
  })
  async linkPresignedDocument(
    @Req() req: AuthenticatedRequest,
    @Body() body: { kycId: string; fileUrl: string; fileName: string; fileType: string; fileSize: number },
  ) {
    if (!body.kycId || !body.fileUrl || !body.fileName || !body.fileType || body.fileSize === undefined) {
      throw new BadRequestException('kycId, fileUrl, fileName, fileType, and fileSize are required.');
    }

    return await this.kycService.uploadDocument(body.kycId, {
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
      fileSize: body.fileSize,
    });
  }
}

@ApiTags('Admin - KYC')
@Controller('admin')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminKycController {
  constructor(
    private readonly kycService: KycService,
    private readonly storageService: FileStorageService,
  ) {}

  @Get('users/:userId/kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get KYC status for a user' })
  async getKyc(@Param('userId') userId: string) {
    const status = await this.kycService.getKycStatus(userId);
    if (!status) {
      throw new BadRequestException('No KYC request found for this user.');
    }
    return status;
  }

  @Post('users/:userId/approve-kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a user KYC request' })
  async approveKyc(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    // Find the user's most recent pending KYC request
    const kycStatus = await this.kycService.getKycStatus(userId);
    if (!kycStatus || kycStatus.status !== 'PENDING') {
      throw new BadRequestException('User has no pending KYC request.');
    }
    return await this.kycService.approveKyc(kycStatus.id, req.user.sub);
  }

  @Post('users/:userId/reject-kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a user KYC request' })
  async rejectKyc(
    @Req() req: AuthenticatedRequest,
    @Param('userId') userId: string,
    @Body() dto: RejectKycDto,
  ) {
    const kycStatus = await this.kycService.getKycStatus(userId);
    if (!kycStatus || kycStatus.status !== 'PENDING') {
      throw new BadRequestException('User has no pending KYC request.');
    }
    return await this.kycService.rejectKyc(kycStatus.id, req.user.sub, dto.reason);
  }

  @Post('kyc/:kycId/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a KYC document on behalf of a user (admin)' })
  @ApiConsumes('multipart/form-data')
  async uploadDocument(
    @Req() req: AuthenticatedRequest,
    @Param('kycId') kycId: string,
    @UploadedFile() file: MulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }

    const fileUrl = await this.storageService.upload(file as unknown as Express.Multer.File, { folder: 'kyc', category: 'KYC', uploadedBy: req.user.sub });

    return await this.kycService.uploadDocument(kycId, {
      fileName: file.originalname,
      fileUrl,
      fileType: file.mimetype,
      fileSize: file.size,
    });
  }

  @Post('kyc/:kycId/documents/presigned')
  @ApiOperation({ summary: 'Link a presigned-uploaded file as a KYC document (admin)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileUrl', 'fileName', 'fileType', 'fileSize'],
      properties: {
        fileUrl: { type: 'string' },
        fileName: { type: 'string' },
        fileType: { type: 'string' },
        fileSize: { type: 'number' },
      },
    },
  })
  async linkPresignedDocument(
    @Req() req: AuthenticatedRequest,
    @Param('kycId') kycId: string,
    @Body() body: { fileUrl: string; fileName: string; fileType: string; fileSize: number },
  ) {
    if (!body.fileUrl || !body.fileName || !body.fileType || body.fileSize === undefined) {
      throw new BadRequestException('fileUrl, fileName, fileType, and fileSize are required.');
    }

    return await this.kycService.uploadDocument(kycId, {
      fileName: body.fileName,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
      fileSize: body.fileSize,
    });
  }

  @Get('kyc/pending')
  @ApiOperation({ summary: 'List all pending KYC requests' })
  async getPendingKyc() {
    return await this.kycService.getPendingKyc();
  }
}
