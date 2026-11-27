import { prisma } from "@/lib/db";
import { AppError } from "@/lib/api-response";
import type { NotificationType } from "@/types";

export async function listNotifications(userId: string, limit = 50) {
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return { items, unreadCount };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!existing) {
    throw new AppError("Notification not found", 404, "NOT_FOUND");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updatedCount: result.count };
}

export async function deleteNotification(userId: string, notificationId: string) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!existing) {
    throw new AppError("Notification not found", 404, "NOT_FOUND");
  }
  await prisma.notification.delete({ where: { id: notificationId } });
  return { deleted: true };
}

export async function createNotificationIfNotExists(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  dedupeKey: string;
  relatedId?: string;
}) {
  try {
    const existing = await prisma.notification.findUnique({
      where: {
        userId_dedupeKey: {
          userId: params.userId,
          dedupeKey: params.dedupeKey,
        },
      },
    });
    if (existing) return existing;

    return await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        dedupeKey: params.dedupeKey,
        relatedId: params.relatedId,
      },
    });
  } catch {
    // Handle concurrent insert race gracefully via unique constraint
    return prisma.notification.findUnique({
      where: {
        userId_dedupeKey: {
          userId: params.userId,
          dedupeKey: params.dedupeKey,
        },
      },
    });
  }
}
