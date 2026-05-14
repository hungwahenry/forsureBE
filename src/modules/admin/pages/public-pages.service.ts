import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../common/constants/error-codes';
import { AppException } from '../../../common/exceptions/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  serializeFooterLink,
  serializePublicPage,
  type FooterLink,
  type PublicPage,
} from './pages.serializer';

@Injectable()
export class PublicPagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getBySlug(slug: string): Promise<PublicPage> {
    const row = await this.prisma.adminPage.findUnique({ where: { slug } });
    if (!row || row.status !== 'PUBLISHED') {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, {
        message: 'Page not found.',
      });
    }
    return serializePublicPage(row);
  }

  async listFooterLinks(): Promise<FooterLink[]> {
    const rows = await this.prisma.adminPage.findMany({
      where: { status: 'PUBLISHED', showInFooter: true },
      orderBy: [{ footerOrder: 'asc' }, { title: 'asc' }],
      select: { slug: true, title: true },
    });
    return rows.map(serializeFooterLink);
  }
}
