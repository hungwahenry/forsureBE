import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { FeatureFlagService } from '../../../../common/feature-flags/feature-flag.service';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import {
  serializeAdminFeatureFlag,
  type AdminFeatureFlagItem,
} from '../list/list.serializer';
import type { CreateFlagDto } from './dto/create-flag.dto';
import type { UpdateFlagDto } from './dto/update-flag.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

const UPDATED_BY_INCLUDE = {
  updatedBy: { select: { id: true, email: true } },
} as const;

@Injectable()
export class AdminFeatureFlagsActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async create(
    dto: CreateFlagDto,
    actor: ActorContext,
  ): Promise<AdminFeatureFlagItem> {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key: dto.key },
      select: { key: true },
    });
    if (existing) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: `Flag '${dto.key}' already exists.`,
      });
    }

    const enabled = dto.enabled ?? false;
    const clientExposed = dto.clientExposed ?? true;
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.featureFlag.create({
        data: {
          key: dto.key,
          enabled,
          clientExposed,
          description: dto.description ?? null,
          updatedById: actor.adminId,
        },
        include: UPDATED_BY_INCLUDE,
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.FEATURE_FLAG_CREATED,
        targetType: AdminAuditTargetType.FEATURE_FLAG,
        targetId: dto.key,
        after: {
          enabled,
          clientExposed,
          description: dto.description ?? null,
        },
        request: actor.request,
        tx,
      });
      return created;
    });

    this.featureFlags.invalidate(dto.key);
    return serializeAdminFeatureFlag(row);
  }

  async update(
    key: string,
    dto: UpdateFlagDto,
    actor: ActorContext,
  ): Promise<AdminFeatureFlagItem> {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Flag not found.',
      });
    }

    const updates: Prisma.FeatureFlagUpdateInput = {
      updatedBy: { connect: { id: actor.adminId } },
    };
    if (dto.enabled !== undefined) updates.enabled = dto.enabled;
    if (dto.clientExposed !== undefined) {
      updates.clientExposed = dto.clientExposed;
    }
    if (dto.description !== undefined) {
      updates.description = dto.description || null;
    }

    const toggled =
      dto.enabled !== undefined && dto.enabled !== existing.enabled;
    const exposureChanged =
      dto.clientExposed !== undefined &&
      dto.clientExposed !== existing.clientExposed;
    const descriptionChanged =
      dto.description !== undefined &&
      (dto.description || null) !== existing.description;

    if (!toggled && !exposureChanged && !descriptionChanged) {
      return serializeAdminFeatureFlag({ ...existing, updatedBy: null });
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.featureFlag.update({
        where: { key },
        data: updates,
        include: UPDATED_BY_INCLUDE,
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: toggled
          ? AdminAuditAction.FEATURE_FLAG_TOGGLED
          : AdminAuditAction.FEATURE_FLAG_EDITED,
        targetType: AdminAuditTargetType.FEATURE_FLAG,
        targetId: key,
        before: {
          enabled: existing.enabled,
          clientExposed: existing.clientExposed,
          description: existing.description,
        },
        after: {
          enabled: updated.enabled,
          clientExposed: updated.clientExposed,
          description: updated.description,
        },
        request: actor.request,
        tx,
      });
      return updated;
    });

    this.featureFlags.invalidate(key);
    return serializeAdminFeatureFlag(row);
  }

  async remove(key: string, actor: ActorContext): Promise<void> {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Flag not found.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.featureFlag.delete({ where: { key } });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.FEATURE_FLAG_DELETED,
        targetType: AdminAuditTargetType.FEATURE_FLAG,
        targetId: key,
        before: {
          enabled: existing.enabled,
          clientExposed: existing.clientExposed,
          description: existing.description,
        },
        request: actor.request,
        tx,
      });
    });

    this.featureFlags.invalidate(key);
  }
}
