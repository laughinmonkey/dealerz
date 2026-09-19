import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public, Roles } from '../../../common/decorators/auth.decorator';
import { PrismaService } from '../../../prisma/prisma.service';

@ApiTags('Admin - Settings')
@Controller('admin/settings')
@ApiBearerAuth()
@Roles('SUPER_ADMIN')
export class AdminSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get all application settings' })
  async getSettings() {
    const settings = await this.prisma.setting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  @Patch()
  @ApiOperation({ summary: 'Update application settings' })
  async updateSettings(@Body() data: Record<string, unknown>) {
    for (const [key, value] of Object.entries(data)) {
      await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    return this.getSettings();
  }
}

@ApiTags('Config')
@Controller('config')
export class PublicConfigController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get public platform configuration (name, logo, etc.)' })
  async getPublicConfig() {
    const settings = await this.prisma.setting.findMany({
      where: {
        key: {
          in: [
            'platformName',
            'platformLogo',
            'defaultCurrency',
            'feePercentage',
            'themeColor',
            'adminContactWhatsAppEnabled',
            'adminContactWhatsAppValue',
            'adminContactSignalEnabled',
            'adminContactSignalValue',
            'adminContactTelegramEnabled',
            'adminContactTelegramValue',
            'adminContactEmailEnabled',
            'adminContactEmailValue',
          ],
        },
      },
    });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return {
      platformName: result['platformName'] || 'Assets Marketplace',
      platformLogo: result['platformLogo'] || '',
      defaultCurrency: result['defaultCurrency'] || 'USD',
      themeColor: result['themeColor'] || '#10B981',
      adminContactChannels: [
        {
          channel: 'whatsapp',
          label: 'WhatsApp',
          enabled: result['adminContactWhatsAppEnabled'] === 'true',
          value: result['adminContactWhatsAppValue'] || '',
        },
        {
          channel: 'signal',
          label: 'Signal',
          enabled: result['adminContactSignalEnabled'] === 'true',
          value: result['adminContactSignalValue'] || '',
        },
        {
          channel: 'telegram',
          label: 'Telegram',
          enabled: result['adminContactTelegramEnabled'] === 'true',
          value: result['adminContactTelegramValue'] || '',
        },
        {
          channel: 'email',
          label: 'Email',
          enabled: result['adminContactEmailEnabled'] === 'true',
          value: result['adminContactEmailValue'] || '',
        },
      ],
    };
  }
}
