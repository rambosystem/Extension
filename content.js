// Content script
console.log("Extension content script loaded");

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle messages here
  sendResponse({ success: true });
});
