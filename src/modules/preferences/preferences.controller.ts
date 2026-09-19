import { Controller, Get, Patch, Body, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Preferences')
@Controller('preferences')
@ApiBearerAuth()
export class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Get user preferences' })
  async get(@Req() req: AuthenticatedRequest) {
    let prefs = await this.prisma.userPreferences.findUnique({
      where: { userId: req.user.sub },
    });
    if (!prefs) {
      prefs = await this.prisma.userPreferences.create({
        data: { userId: req.user.sub },
      });
    }
    return prefs;
  }

  @Patch()
  @ApiOperation({ summary: 'Update user preferences' })
  async update(@Req() req: AuthenticatedRequest, @Body() body: Record<string, any>) {
    const allowed = ['emailNotifs', 'pushNotifs', 'inAppNotifs', 'profilePublic', 'showActivity', 'language', 'currency', 'timezone'];
    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    return this.prisma.userPreferences.upsert({
      where: { userId: req.user.sub },
      create: { userId: req.user.sub, ...data },
      update: data,
    });
  }
}
