const BOOKING_CART_STORAGE_PREFIX = 'valo_booking_cart';

const getStoredUserId = (storage) => {
  try {
    const user = JSON.parse(storage.getItem('valo_user') || 'null');
    return String(user?.id || user?._id || '').trim();
  } catch {
    return '';
  }
};

export const getBookingCartStorageKey = (storage = sessionStorage) => {
  const userId = getStoredUserId(storage);
  return userId ? `${BOOKING_CART_STORAGE_PREFIX}:${userId}` : null;
};

export const filterUnexpiredBookingCart = (items, now = Date.now()) =>
  (Array.isArray(items) ? items : []).filter((item) => {
    const expiresAt = new Date(item?.holdExpiresAt).getTime();
    return Boolean(item?.holdId) && Number.isFinite(expiresAt) && expiresAt > now;
  });

export const reconcileBookingCart = (items, activeHolds, now = Date.now()) => {
  const activeHoldIds = new Set(
    (Array.isArray(activeHolds) ? activeHolds : [])
      .map((hold) => String(hold?.holdId || hold?._id || ''))
      .filter(Boolean),
  );

  return filterUnexpiredBookingCart(items, now).filter((item) =>
    activeHoldIds.has(String(item.holdId)),
  );
};

export const readBookingCart = (storage = sessionStorage, now = Date.now()) => {
  const storageKey = getBookingCartStorageKey(storage);
  if (!storageKey) return [];

  try {
    const items = JSON.parse(storage.getItem(storageKey) || '[]');
    return filterUnexpiredBookingCart(items, now);
  } catch {
    storage.removeItem(storageKey);
    return [];
  }
};

export const writeBookingCart = (items, storage = sessionStorage) => {
  const storageKey = getBookingCartStorageKey(storage);
  if (!storageKey) return;

  const validItems = filterUnexpiredBookingCart(items);
  if (validItems.length === 0) {
    storage.removeItem(storageKey);
    return;
  }

  storage.setItem(storageKey, JSON.stringify(validItems));
};
