function getWindowLocalStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

export const piniaLocalStorage = {
  getItem(key) {
    const storage = getWindowLocalStorage();
    return storage ? storage.getItem(key) : null;
  },
  setItem(key, value) {
    const storage = getWindowLocalStorage();
    if (storage) storage.setItem(key, value);
  },
  removeItem(key) {
    const storage = getWindowLocalStorage();
    if (storage) storage.removeItem(key);
  },
};

export function getLocalItem(key, fallback = null) {
  try {
    const value = piniaLocalStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (error) {
    console.error(`[storage] Failed to read localStorage key "${key}":`, error);
    return fallback;
  }
}

export function setLocalItem(key, value) {
  try {
    const serialized =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    piniaLocalStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to write localStorage key "${key}":`, error);
    return false;
  }
}

export function removeLocalItem(key) {
  try {
    piniaLocalStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[storage] Failed to remove localStorage key "${key}":`, error);
    return false;
  }
}

function getChromeStorageLocal() {
  if (typeof chrome === "undefined" || !chrome.storage?.local) {
    return null;
  }
  return chrome.storage.local;
}

export function setChromeLocal(items) {
  const storage = getChromeStorageLocal();
  if (!storage) return Promise.resolve();
  return new Promise((resolve) => storage.set(items, resolve));
}

export function getChromeLocal(keys) {
  const storage = getChromeStorageLocal();
  if (!storage) return Promise.resolve({});
  return new Promise((resolve) => storage.get(keys, resolve));
}

export function removeChromeLocal(keys) {
  const storage = getChromeStorageLocal();
  if (!storage) return Promise.resolve();
  return new Promise((resolve) => storage.remove(keys, resolve));
}
