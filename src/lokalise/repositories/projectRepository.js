import { STORAGE_KEYS } from "../config/storageKeys.js";
import {
  getLocalItem,
  removeLocalItem,
  setLocalItem,
} from "../infrastructure/storage.js";

function parseProjects(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse lokalise projects from storage:", error);
    return [];
  }
}

export function getProjects() {
  return parseProjects(getLocalItem(STORAGE_KEYS.LOKALISE_PROJECTS));
}

export function findProjectById(projectId) {
  if (!projectId) return null;
  return getProjects().find((project) => project?.project_id === projectId) || null;
}

export function getProjectNameById(projectId) {
  const project = findProjectById(projectId);
  return project?.name || null;
}

export function getDefaultProjectId() {
  return getLocalItem(STORAGE_KEYS.DEFAULT_PROJECT_ID, "");
}

export function setDefaultProjectId(projectId) {
  if (!projectId) {
    removeLocalItem(STORAGE_KEYS.DEFAULT_PROJECT_ID);
    return;
  }
  setLocalItem(STORAGE_KEYS.DEFAULT_PROJECT_ID, projectId);
}

export function initializeDefaultProjectIdFromProjects() {
  const projects = getProjects();
  const firstProjectId = projects[0]?.project_id || "";
  if (firstProjectId) {
    setDefaultProjectId(firstProjectId);
  }
  return firstProjectId;
}

export function resolveCdnProjectNameByName(projectName) {
  if (!projectName) return null;
  const normalizedName = projectName.trim();
  if (["Common", "AmazonSearch", "Commerce"].includes(normalizedName)) {
    return normalizedName;
  }

  const lowerName = normalizedName.toLowerCase();
  if (lowerName.includes("common")) return "Common";
  if (lowerName.includes("amazon") || lowerName.includes("search")) {
    return "AmazonSearch";
  }
  if (lowerName.includes("commerce")) return "Commerce";
  return null;
}

export function resolveCdnProjectNameById(projectId) {
  const projectName = getProjectNameById(projectId);
  return resolveCdnProjectNameByName(projectName);
}
