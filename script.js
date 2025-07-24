// ==UserScript==
// @name         Prisma Studio Tabs Closer 
// @namespace    http://tampermonkey.net/
// @version      6.0
// @description  Adds a native style button with a custom animated confirmation modal to close all tabs in Prisma Studio.
// @author       Jad 
// @match        http://localhost:5555/*
// @icon         https://www.prisma.io/favicon.ico
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  // --- Configuration ---
  const headerSelector =
    "#root > div > div._container_dq66k_1 > div._container_1ud7d_1._header_dq66k_9";
  const tabBarSelector = '[data-testid="tab-bar"]';
  const buttonId = "prisma-tab-clear-btn-v6";
  const modalId = "prisma-custom-modal-overlay";
  const dbName = "Prisma Studio";
  const storeName = "tabs";

  let clearTabsButton = null;

  const trashIconSVG = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  `;

  /**
   * Injects the CSS for the modal and its animations into the page.
   */
  function injectModalStyles() {
    GM_addStyle(`
      #${modalId} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(9, 30, 66, 0.54);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease-in-out;
      }
      #${modalId}.visible {
        opacity: 1;
        pointer-events: auto;
      }
      #${modalId} .modal-content {
        transform: scale(0.95);
        transition: transform 0.2s ease-in-out;
      }
      #${modalId}.visible .modal-content {
        transform: scale(1);
      }
    `);
  }

  function clearAllTabs() {
    const request = window.indexedDB.open(dbName);
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], "readwrite");
      transaction.objectStore(storeName).clear().onsuccess = () => {
        window.location.reload();
      };
    };
  }

  function createConfirmationModal() {
    if (document.getElementById(modalId)) return;

    const overlay = document.createElement("div");
    overlay.id = modalId;

    const modal = document.createElement("div");
    modal.className = "modal-content"; // For animation targeting
    Object.assign(modal.style, {
      background: "#ffffff",
      padding: "24px",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      width: "400px",
      fontFamily: "sans-serif",
    });

    const title = document.createElement("h2");
    title.textContent = "Close All Tabs";
    Object.assign(title.style, {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1e293b",
      margin: "0 0 8px 0",
    });

    const text = document.createElement("p");
    text.textContent =
      "Are you sure you want to close all saved tabs? This action cannot be undone.";
    Object.assign(text.style, {
      fontSize: "14px",
      color: "#475569",
      margin: "0 0 24px 0",
      lineHeight: "1.5",
    });

    const buttonGroup = document.createElement("div");
    Object.assign(buttonGroup.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    Object.assign(cancelBtn.style, {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      backgroundColor: "#f8fafc",
      color: "#475569",
      cursor: "pointer",
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    Object.assign(confirmBtn.style, {
      padding: "8px 16px",
      fontSize: "14px",
      fontWeight: "500",
      border: "none",
      borderRadius: "6px",
      backgroundColor: "#dc2626",
      color: "white",
      cursor: "pointer",
    });

    // --- Event Handlers for showing/hiding with animation ---
    const showModal = () => overlay.classList.add("visible");
    const hideModal = () => overlay.classList.remove("visible");

    clearTabsButton.onclick = (e) => {
      e.preventDefault();
      showModal();
    };
    cancelBtn.onclick = hideModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) hideModal();
    };
    confirmBtn.onclick = () => {
      hideModal();
      clearAllTabs();
    };

    buttonGroup.append(cancelBtn, confirmBtn);
    modal.append(title, text, buttonGroup);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function updateButtonVisibility() {
    if (!clearTabsButton) return;
    const tabCount = document.querySelectorAll(
      `${tabBarSelector} [data-testid="title"]`
    ).length;
    // Only shows when we have at least one tab
    clearTabsButton.style.display = tabCount >= 1 ? "flex" : "none";
  }

  function initialize() {
    const header = document.querySelector(headerSelector);
    if (!header || document.getElementById(buttonId)) return;

    // Inject our animation styles into the page
    injectModalStyles();

    clearTabsButton = document.createElement("button");
    clearTabsButton.id = buttonId;
    clearTabsButton.innerHTML = trashIconSVG;
    clearTabsButton.title = "Close all tabs";
    clearTabsButton.className =
      "_container_18uec_1 _ghost_18uec_35 _button_1t4fm_7";
    clearTabsButton.style.marginLeft = "8px";
    clearTabsButton.style.display = "none";

    createConfirmationModal();

    const settingsButton = header.querySelector('[data-testid="settings-dialog"]');
    if (settingsButton) {
      settingsButton.parentNode.insertBefore(clearTabsButton, settingsButton);
    } else {
      header.appendChild(clearTabsButton);
    }
    console.log("Prisma Studio Tabs Closer initialized.");

    const tabObserver = new MutationObserver(updateButtonVisibility);
    tabObserver.observe(document.body, { childList: true, subtree: true });
    updateButtonVisibility();
  }

  const appLoadObserver = new MutationObserver((mutations, obs) => {
    if (document.querySelector(headerSelector)) {
      initialize();
      obs.disconnect();
    }
  });

  appLoadObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
