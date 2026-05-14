import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { createId } from '../../../common/utils/id';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../shared/admin-audit.constants';
import { AdminAuditService } from '../shared/admin-audit.service';
import type { CreateBusinessCategoryDto } from './dto/create-category.dto';
import type { UpdateBusinessCategoryDto } from './dto/update-category.dto';
import {
  serializeAdminBusinessCategory,
  type AdminBusinessCategoryItem,
} from './business-categories.serializer';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminBusinessCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(): Promise<AdminBusinessCategoryItem[]> {
    const rows = await this.prisma.businessCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    if (rows.length === 0) return [];
    const counts = await this.prisma.business.groupBy({
      by: ['categoryId'],
      _count: { _all: true },
      where: { categoryId: { in: rows.map((r) => r.id) } },
    });
    const countsByCategory = new Map(
      counts.map((c) => [c.categoryId, c._count._all]),
    );
    return rows.map((r) =>
      serializeAdminBusinessCategory(r, countsByCategory.get(r.id) ?? 0),
    );
  }

  async create(
    dto: CreateBusinessCategoryDto,
    actor: ActorContext,
  ): Promise<AdminBusinessCategoryItem> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.businessCategory.create({
          data: {
            id: createId('bcg'),
            code: dto.code,
            label: dto.label,
            description: dto.description,
            iconName: dto.iconName,
            active: dto.active ?? true,
            sortOrder: dto.sortOrder ?? 0,
          },
        });
        await this.audit.record({
          adminId: actor.adminId,
          action: AdminAuditAction.BUSINESS_CATEGORY_CREATED,
          targetType: AdminAuditTargetType.BUSINESS_CATEGORY,
          targetId: created.id,
          after: { code: created.code, label: created.label },
          request: actor.request,
          tx,
        });
        return created;
      });
      return serializeAdminBusinessCategory(row, 0);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: `Category code "${dto.code}" already exists.`,
        });
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdateBusinessCategoryDto,
    actor: ActorContext,
  ): Promise<AdminBusinessCategoryItem> {
    const existing = await this.prisma.businessCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Category not found.',
      });
    }
    const updates: Prisma.BusinessCategoryUpdateInput = {};
    if (dto.label !== undefined) updates.label = dto.label;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.iconName !== undefined) updates.iconName = dto.iconName;
    if (dto.active !== undefined) updates.active = dto.active;
    if (dto.sortOrder !== undefined) updates.sortOrder = dto.sortOrder;
    if (Object.keys(updates).length === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, {
        message: 'No fields provided to update.',
      });
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      before[key] = (existing as Record<string, unknown>)[key];
      after[key] = (updates as Record<string, unknown>)[key];
    }

    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.businessCategory.update({
        where: { id },
        data: updates,
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.BUSINESS_CATEGORY_UPDATED,
        targetType: AdminAuditTargetType.BUSINESS_CATEGORY,
        targetId: id,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        request: actor.request,
        tx,
      });
      return updated;
    });
    const businessesCount = await this.prisma.business.count({
      where: { categoryId: id },
    });
    return serializeAdminBusinessCategory(row, businessesCount);
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    const existing = await this.prisma.businessCategory.findUnique({
      where: { id },
      select: { id: true, code: true, label: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Category not found.',
      });
    }
    const businessesCount = await this.prisma.business.count({
      where: { categoryId: id },
    });
    if (businessesCount > 0) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
        message: `Cannot delete a category that ${businessesCount} business${businessesCount === 1 ? '' : 'es'} reference. Deactivate it instead.`,
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.businessCategory.delete({ where: { id } });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.BUSINESS_CATEGORY_DELETED,
        targetType: AdminAuditTargetType.BUSINESS_CATEGORY,
        targetId: id,
        before: { code: existing.code, label: existing.label },
        request: actor.request,
        tx,
      });
    });
  }
}
