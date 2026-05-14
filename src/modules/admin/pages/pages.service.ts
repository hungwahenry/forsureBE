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
import type { CreatePageDto } from './dto/create-page.dto';
import type { UpdatePageDto } from './dto/update-page.dto';
import {
  serializeAdminPageDetail,
  serializeAdminPageListItem,
  type AdminPageDetail,
  type AdminPageListItem,
} from './pages.serializer';
import { sanitizePageHtml } from './sanitize';

interface ActorContext {
  adminId: string;
  request: Request;
}

const userSelect = { id: true, email: true } as const;

@Injectable()
export class AdminPagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(): Promise<AdminPageListItem[]> {
    const rows = await this.prisma.adminPage.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        updatedBy: { select: userSelect },
        createdBy: { select: userSelect },
      },
    });
    return rows.map(serializeAdminPageListItem);
  }

  async get(id: string): Promise<AdminPageDetail> {
    const row = await this.prisma.adminPage.findUnique({
      where: { id },
      include: {
        updatedBy: { select: userSelect },
        createdBy: { select: userSelect },
      },
    });
    if (!row) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Page not found.',
      });
    }
    return serializeAdminPageDetail(row);
  }

  async create(
    dto: CreatePageDto,
    actor: ActorContext,
  ): Promise<AdminPageDetail> {
    const cleanHtml = sanitizePageHtml(dto.bodyHtml);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.adminPage.create({
          data: {
            id: createId('pg'),
            slug: dto.slug,
            title: dto.title,
            bodyJson: dto.bodyJson as Prisma.InputJsonValue,
            bodyHtml: cleanHtml,
            status: 'DRAFT',
            createdById: actor.adminId,
            updatedById: actor.adminId,
          },
          include: {
            updatedBy: { select: userSelect },
            createdBy: { select: userSelect },
          },
        });
        await this.audit.record({
          adminId: actor.adminId,
          action: AdminAuditAction.ADMIN_PAGE_CREATED,
          targetType: AdminAuditTargetType.ADMIN_PAGE,
          targetId: created.id,
          after: { slug: created.slug, title: created.title },
          request: actor.request,
          tx,
        });
        return created;
      });
      return serializeAdminPageDetail(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: `Slug "${dto.slug}" is already in use.`,
        });
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: UpdatePageDto,
    actor: ActorContext,
  ): Promise<AdminPageDetail> {
    const existing = await this.prisma.adminPage.findUnique({ where: { id } });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Page not found.',
      });
    }

    const updates: Prisma.AdminPageUpdateInput = { updatedBy: { connect: { id: actor.adminId } } };
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      updates.slug = dto.slug;
      before.slug = existing.slug;
      after.slug = dto.slug;
    }
    if (dto.title !== undefined && dto.title !== existing.title) {
      updates.title = dto.title;
      before.title = existing.title;
      after.title = dto.title;
    }
    if (dto.bodyJson !== undefined) {
      updates.bodyJson = dto.bodyJson as Prisma.InputJsonValue;
    }
    if (dto.bodyHtml !== undefined) {
      updates.bodyHtml = sanitizePageHtml(dto.bodyHtml);
    }
    if (
      dto.showInFooter !== undefined &&
      dto.showInFooter !== existing.showInFooter
    ) {
      updates.showInFooter = dto.showInFooter;
      before.showInFooter = existing.showInFooter;
      after.showInFooter = dto.showInFooter;
    }
    if (
      dto.footerOrder !== undefined &&
      dto.footerOrder !== existing.footerOrder
    ) {
      updates.footerOrder = dto.footerOrder;
      before.footerOrder = existing.footerOrder;
      after.footerOrder = dto.footerOrder;
    }

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.adminPage.update({
          where: { id },
          data: updates,
          include: {
            updatedBy: { select: userSelect },
            createdBy: { select: userSelect },
          },
        });
        await this.audit.record({
          adminId: actor.adminId,
          action: AdminAuditAction.ADMIN_PAGE_UPDATED,
          targetType: AdminAuditTargetType.ADMIN_PAGE,
          targetId: id,
          before: before as Prisma.InputJsonValue,
          after: after as Prisma.InputJsonValue,
          request: actor.request,
          tx,
        });
        return updated;
      });
      return serializeAdminPageDetail(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppException(ErrorCode.RESOURCE_CONFLICT, {
          message: `Slug "${dto.slug}" is already in use.`,
        });
      }
      throw err;
    }
  }

  async publish(id: string, actor: ActorContext): Promise<AdminPageDetail> {
    const existing = await this.prisma.adminPage.findUnique({ where: { id } });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Page not found.',
      });
    }
    if (existing.status === 'PUBLISHED') {
      return this.get(id);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.adminPage.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: existing.publishedAt ?? new Date(),
          updatedBy: { connect: { id: actor.adminId } },
        },
        include: {
          updatedBy: { select: userSelect },
          createdBy: { select: userSelect },
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.ADMIN_PAGE_PUBLISHED,
        targetType: AdminAuditTargetType.ADMIN_PAGE,
        targetId: id,
        after: { slug: updated.slug, status: 'PUBLISHED' },
        request: actor.request,
        tx,
      });
      return updated;
    });
    return serializeAdminPageDetail(row);
  }

  async unpublish(id: string, actor: ActorContext): Promise<AdminPageDetail> {
    const existing = await this.prisma.adminPage.findUnique({ where: { id } });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Page not found.',
      });
    }
    if (existing.status === 'DRAFT') {
      return this.get(id);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.adminPage.update({
        where: { id },
        data: {
          status: 'DRAFT',
          updatedBy: { connect: { id: actor.adminId } },
        },
        include: {
          updatedBy: { select: userSelect },
          createdBy: { select: userSelect },
        },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.ADMIN_PAGE_UNPUBLISHED,
        targetType: AdminAuditTargetType.ADMIN_PAGE,
        targetId: id,
        before: { status: 'PUBLISHED' },
        after: { status: 'DRAFT' },
        request: actor.request,
        tx,
      });
      return updated;
    });
    return serializeAdminPageDetail(row);
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    const existing = await this.prisma.adminPage.findUnique({
      where: { id },
      select: { id: true, slug: true, title: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Page not found.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.adminPage.delete({ where: { id } });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.ADMIN_PAGE_DELETED,
        targetType: AdminAuditTargetType.ADMIN_PAGE,
        targetId: id,
        before: { slug: existing.slug, title: existing.title },
        request: actor.request,
        tx,
      });
    });
  }
}
