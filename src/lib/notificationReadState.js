function getReadNotificationIds(userId) {
  if (!userId) return new Set();

  try {
    return new Set(JSON.parse(localStorage.getItem(`chd-read-notifications-${userId}`) || "[]"));
  } catch (error) {
    console.error("load saved notification read state error:", error);
    return new Set();
  }
}

export function applyStoredReadNotifications(notifications, userId) {
  const readIds = getReadNotificationIds(userId);
  return (notifications || []).map((notification) =>
    notification.is_read || readIds.has(notification.notif_id)
      ? { ...notification, is_read: true }
      : notification
  );
}

export function storeReadNotification(userId, notificationId) {
  if (!userId || notificationId == null) return;

  const readIds = getReadNotificationIds(userId);
  readIds.add(notificationId);
  try {
    localStorage.setItem(`chd-read-notifications-${userId}`, JSON.stringify([...readIds]));
  } catch (error) {
    console.error("save notification read state error:", error);
  }
}

export function clearStoredReadNotification(userId, notificationId) {
  if (!userId || notificationId == null) return;

  const readIds = getReadNotificationIds(userId);
  readIds.delete(notificationId);
  try {
    localStorage.setItem(`chd-read-notifications-${userId}`, JSON.stringify([...readIds]));
  } catch (error) {
    console.error("clear notification read state error:", error);
  }
}