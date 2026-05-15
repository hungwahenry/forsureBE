import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCode } from '../../../../common/constants/error-codes';
import { AppException } from '../../../../common/exceptions/app.exception';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../shared/admin-audit.constants';
import { AdminAuditService } from '../../shared/admin-audit.service';
import {
  serializeContactLeadDetail,
  type AdminContactLeadDetail,
} from '../detail/detail.serializer';
import type { UpdateContactLeadDto } from './dto/update-contact-lead.dto';

interface ActorContext {
  adminId: string;
  request: Request;
}

@Injectable()
export class AdminContactLeadsActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async updateStatus(
    id: string,
    dto: UpdateContactLeadDto,
    actor: ActorContext,
  ): Promise<AdminContactLeadDetail> {
    const existing = await this.prisma.contactLead.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Contact lead not found.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.contactLead.update({
        where: { id },
        data: { status: dto.status },
      });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.CONTACT_LEAD_STATUS_CHANGED,
        targetType: AdminAuditTargetType.CONTACT_LEAD,
        targetId: id,
        before: { status: existing.status },
        after: { status: dto.status },
        request: actor.request,
        tx,
      });
      return row;
    });

    return serializeContactLeadDetail(updated);
  }

  async remove(id: string, actor: ActorContext): Promise<void> {
    const existing = await this.prisma.contactLead.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Contact lead not found.',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.contactLead.delete({ where: { id } });
      await this.audit.record({
        adminId: actor.adminId,
        action: AdminAuditAction.CONTACT_LEAD_DELETED,
        targetType: AdminAuditTargetType.CONTACT_LEAD,
        targetId: id,
        before: {
          name: existing.name,
          email: existing.email,
          status: existing.status,
        },
        request: actor.request,
        tx,
      });
    });
  }
}
