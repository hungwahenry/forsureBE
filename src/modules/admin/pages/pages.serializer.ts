import type { AdminPage, AdminPageStatus, Prisma } from '@prisma/client';

export interface AdminPageListItem {
  id: string;
  slug: string;
  title: string;
  status: AdminPageStatus;
  publishedAt: string | null;
  showInFooter: boolean;
  footerOrder: number;
  updatedAt: string;
  updatedById: string;
  updatedByEmail: string | null;
}

export interface FooterLink {
  slug: string;
  title: string;
}

export interface AdminPageDetail extends AdminPageListItem {
  bodyJson: Prisma.JsonValue;
  bodyHtml: string;
  createdAt: string;
  createdById: string;
  createdByEmail: string | null;
}

export interface PublicPage {
  slug: string;
  title: string;
  bodyHtml: string;
  publishedAt: string;
  updatedAt: string;
}

type RowWithUsers = AdminPage & {
  updatedBy: { id: string; email: string } | null;
  createdBy: { id: string; email: string } | null;
};

export function serializeAdminPageListItem(
  row: RowWithUsers,
): AdminPageListItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    showInFooter: row.showInFooter,
    footerOrder: row.footerOrder,
    updatedAt: row.updatedAt.toISOString(),
    updatedById: row.updatedById,
    updatedByEmail: row.updatedBy?.email ?? null,
  };
}

export function serializeFooterLink(row: {
  slug: string;
  title: string;
}): FooterLink {
  return { slug: row.slug, title: row.title };
}

export function serializeAdminPageDetail(row: RowWithUsers): AdminPageDetail {
  return {
    ...serializeAdminPageListItem(row),
    bodyJson: row.bodyJson,
    bodyHtml: row.bodyHtml,
    createdAt: row.createdAt.toISOString(),
    createdById: row.createdById,
    createdByEmail: row.createdBy?.email ?? null,
  };
}

export function serializePublicPage(row: AdminPage): PublicPage {
  return {
    slug: row.slug,
    title: row.title,
    bodyHtml: row.bodyHtml,
    publishedAt: (row.publishedAt ?? row.updatedAt).toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
