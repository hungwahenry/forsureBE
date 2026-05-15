import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { AppConfigService } from '../../../../common/app-config/app-config.service';
import { validateConfigValue } from '../../../../common/app-config/app-config.validation';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import {
  serializeAdminConfig,
  type AdminConfigItem,
} from '../list/list.serializer';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminConfigActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly appConfig: AppConfigService,
  ) {}

  async update(
    key: string,
    value: unknown,
    actor: ActorContext,
  ): Promise<AdminConfigItem> {
    const existing = await this.requireRow(key);
    const validated = validateConfigValue(existing, value);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appConfig.update({
        where: { key },
        data: {
          value: validated,
          updatedById: actor.adminId,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.APP_CONFIG_UPDATED,
        targetType: AdminAuditTargetType.APP_CONFIG,
        targetId: key,
        before: { value: existing.value },
        after: { value: updated.value },
        request: actor.request,
        tx,
      });
      return updated;
    });

    this.appConfig.invalidate();
    return serializeAdminConfig(row);
  }

  async reset(key: string, actor: ActorContext): Promise<AdminConfigItem> {
    const existing = await this.requireRow(key);

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.appConfig.update({
        where: { key },
        data: {
          value: existing.defaultValue as Prisma.InputJsonValue,
          updatedById: actor.adminId,
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.APP_CONFIG_RESET,
        targetType: AdminAuditTargetType.APP_CONFIG,
        targetId: key,
        before: { value: existing.value },
        after: { value: updated.value },
        request: actor.request,
        tx,
      });
      return updated;
    });

    this.appConfig.invalidate();
    return serializeAdminConfig(row);
  }

  private async requireRow(key: string) {
    const row = await this.prisma.appConfig.findUnique({ where: { key } });
    if (!row) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: `Config key '${key}' not found.`,
      });
    }
    return row;
  }
}
