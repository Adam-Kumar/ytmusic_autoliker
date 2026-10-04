// ==UserScript==
// @name         YouTube Music Playlist Auto-Liker
// @namespace    https://github.com/Adam-Kumar/ytmusic_autoliker
// @version      1.4.1
// @description  Bulk like every song in a YouTube Music playlist with customizable delays, oldest-first option, smart skip for already liked tracks, and a sleek floating UI.
// @author       Adam Kumar
// @homepageURL  https://github.com/Adam-Kumar/ytmusic_autoliker
// @supportURL   https://github.com/Adam-Kumar/ytmusic_autoliker/issues
// @downloadURL  https://raw.githubusercontent.com/Adam-Kumar/ytmusic_autoliker/main/ytmusic-autoliker.user.js
// @updateURL    https://raw.githubusercontent.com/Adam-Kumar/ytmusic_autoliker/main/ytmusic-autoliker.user.js
// @match        *://music.youtube.com/*
// @match        *://www.youtube.com/*
// @icon         https://music.youtube.com/img/favicon_144.png
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  console.log('%c[YTM Auto-Liker]%c Userscript loaded on:', 'background: #ff0000; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: bold;', 'color: #38bdf8;', window.location.href);

  // --- Configuration & State ---
  const STATE = {
    status: 'IDLE', // 'IDLE' | 'LOADING_PLAYLIST' | 'RUNNING' | 'PAUSED' | 'STOPPED'
    stopRequested: false,
    pauseRequested: false,
    resumeResolver: null,
    totalSongs: 0,
    currentIndex: 0,
    likedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    order: 'oldestFirst', // 'oldestFirst' | 'defaultOrder'
    minDelay: 1500, // ms
    maxDelay: 3000, // ms
    skipLiked: true,
    autoScroll: true,
  };

  // --- Utilities ---
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function formatTime(date = new Date()) {
    return date.toTimeString().split(' ')[0];
  }

  function heartSvg(size = 16, fill = '#ffffff') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;
    svg.style.fill = fill;
    svg.style.display = 'inline-block';
    svg.style.verticalAlign = 'middle';
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute(
      'd',
      'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'
    );
    svg.appendChild(path);
    return svg;
  }

  // --- UI Styles (Injected via GM_addStyle + Fallback) ---
  const UI_STYLES = `
    #ytm-autoliker-launcher:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 25px rgba(255, 0, 0, 0.7) !important;
    }
    #ytm-autoliker-header {
      background: linear-gradient(135deg, rgba(255, 0, 0, 0.9), rgba(180, 0, 0, 0.8)) !important;
      padding: 11px 15px !important;
      cursor: grab !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      border-top-left-radius: 13px !important;
      border-top-right-radius: 13px !important;
    }
    #ytm-autoliker-header:active {
      cursor: grabbing !important;
    }
    #ytm-autoliker-title {
      font-weight: 700 !important;
      font-size: 14px !important;
      letter-spacing: 0.3px !important;
      display: flex !important;
      align-items: center !important;
      gap: 7px !important;
      color: #ffffff !important;
    }
    .ytm-header-actions {
      display: flex !important;
      gap: 6px !important;
    }
    .ytm-icon-btn {
      background: rgba(255, 255, 255, 0.18) !important;
      border: none !important;
      color: #fff !important;
      width: 24px !important;
      height: 24px !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 13px !important;
      font-weight: bold !important;
      transition: background 0.15s ease !important;
    }
    .ytm-icon-btn:hover {
      background: rgba(255, 255, 255, 0.35) !important;
    }
    #ytm-autoliker-body {
      padding: 14px !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
    }
    #ytm-autoliker-body.minimized {
      display: none !important;
    }
    .ytm-section-label {
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.8px !important;
      color: rgba(255, 255, 255, 0.6) !important;
      font-weight: 600 !important;
      margin-bottom: 4px !important;
    }
    .ytm-input-group {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
    }
    .ytm-input-row {
      display: flex !important;
      gap: 8px !important;
      align-items: center !important;
    }
    .ytm-input-row input[type="text"],
    .ytm-input-row input[type="number"],
    .ytm-input-group select {
      background: rgba(255, 255, 255, 0.1) !important;
      border: 1px solid rgba(255, 255, 255, 0.22) !important;
      color: #fff !important;
      padding: 7px 10px !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      outline: none !important;
      box-sizing: border-box !important;
    }
    .ytm-input-group select {
      width: 100% !important;
      cursor: pointer !important;
    }
    .ytm-input-group select option {
      background: #1e1e1e !important;
      color: #fff !important;
    }
    .ytm-button {
      background: #ff0000 !important;
      border: none !important;
      color: #fff !important;
      font-weight: 600 !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 13px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      transition: background 0.15s ease, opacity 0.15s ease !important;
    }
    .ytm-button:hover:not(:disabled) {
      background: #cc0000 !important;
    }
    .ytm-button:disabled {
      opacity: 0.45 !important;
      cursor: not-allowed !important;
    }
    .ytm-button-secondary {
      background: rgba(255, 255, 255, 0.15) !important;
      color: #eee !important;
    }
    .ytm-button-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.25) !important;
    }
    .ytm-checkbox-label {
      display: flex !important;
      align-items: center !important;
      gap: 7px !important;
      cursor: pointer !important;
      user-select: none !important;
      font-size: 12.5px !important;
      color: #ddd !important;
    }
    .ytm-checkbox-label input[type="checkbox"] {
      accent-color: #ff0000 !important;
      width: 15px !important;
      height: 15px !important;
      cursor: pointer !important;
    }
    .ytm-stats-grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 6px !important;
      background: rgba(255, 255, 255, 0.05) !important;
      padding: 8px !important;
      border-radius: 8px !important;
      text-align: center !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    .ytm-stat-box {
      display: flex !important;
      flex-direction: column !important;
    }
    .ytm-stat-box .val {
      font-weight: 700 !important;
      font-size: 15px !important;
      color: #fff !important;
    }
    .ytm-stat-box.liked .val { color: #4ade80 !important; }
    .ytm-stat-box.skipped .val { color: #facc15 !important; }
    .ytm-stat-box.error .val { color: #f87171 !important; }
    .ytm-stat-box .lbl {
      font-size: 10px !important;
      color: rgba(255, 255, 255, 0.55) !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
    }
    .ytm-progress-container {
      width: 100% !important;
      height: 6px !important;
      background: rgba(255, 255, 255, 0.12) !important;
      border-radius: 4px !important;
      overflow: hidden !important;
      margin-top: 4px !important;
    }
    .ytm-progress-bar {
      height: 100% !important;
      width: 0% !important;
      background: linear-gradient(90deg, #ff4e45, #ff0000) !important;
      transition: width 0.2s ease !important;
    }
    #ytm-current-track {
      font-size: 12px !important;
      color: #bbb !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      min-height: 17px !important;
    }
    .ytm-btn-row {
      display: flex !important;
      gap: 8px !important;
    }
    .ytm-btn-row .ytm-button {
      flex: 1 !important;
    }
    #ytm-log-box {
      height: 95px !important;
      background: rgba(0, 0, 0, 0.5) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 6px !important;
      padding: 6px 8px !important;
      font-family: 'Consolas', 'Courier New', monospace !important;
      font-size: 11px !important;
      color: #bbb !important;
      overflow-y: auto !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 3px !important;
    }
    .ytm-log-entry {
      word-break: break-all !important;
    }
    .ytm-log-entry.info { color: #60a5fa !important; }
    .ytm-log-entry.success { color: #4ade80 !important; }
    .ytm-log-entry.warn { color: #facc15 !important; }
    .ytm-log-entry.error { color: #f87171 !important; }
  `;

  function injectCSS() {
    try {
      if (typeof GM_addStyle === 'function') {
        GM_addStyle(UI_STYLES);
      } else {
        const style = document.createElement('style');
        style.id = 'ytm-autoliker-styles';
        style.textContent = UI_STYLES;
        (document.head || document.documentElement).appendChild(style);
      }
    } catch (e) {
      console.warn('[YTM Auto-Liker] GM_addStyle notice:', e);
    }
  }

  // --- YouTube Music DOM Extraction Helpers ---
  function getPlaylistRows() {
    // 1. Primary: If a playlist shelf exists, ONLY get rows from inside it (excludes suggestions shelf below)
    const playlistShelf = document.querySelector('ytmusic-playlist-shelf-renderer');
    if (playlistShelf) {
      const rows = playlistShelf.querySelectorAll('ytmusic-responsive-list-item-renderer');
      return Array.from(rows);
    }

    // 2. Secondary fallback (e.g. album or other view without playlist-shelf):
    // Exclude any shelf with title containing "Suggestions", "Recommended", "Related", etc.
    const shelves = Array.from(document.querySelectorAll('ytmusic-shelf-renderer'));
    const validRows = [];
    for (const shelf of shelves) {
      const title = (
        shelf.querySelector('.title, yt-formatted-string.title, yt-formatted-string#title')?.textContent || ''
      ).toLowerCase();
      if (
        title.includes('suggest') ||
        title.includes('recommend') ||
        title.includes('related') ||
        title.includes('similar')
      ) {
        continue; // Skip suggestion shelves
      }
      const rows = shelf.querySelectorAll('ytmusic-responsive-list-item-renderer');
      validRows.push(...Array.from(rows));
    }

    return validRows;
  }

  function getTrackInfo(row) {
    let title = 'Unknown Title';
    let artist = 'Unknown Artist';

    const titleEl = row.querySelector('.title-column yt-formatted-string, .title yt-formatted-string, a.yt-simple-endpoint[href*="watch?v="]');
    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    }

    const artistEl = row.querySelector('.secondary-flex-columns yt-formatted-string, .byline-column yt-formatted-string');
    if (artistEl && artistEl.textContent) {
      artist = artistEl.textContent.trim();
    }

    return { title, artist };
  }

  function getLikeStatusAndButton(row) {
    const likeRenderer = row.querySelector('ytmusic-like-button-renderer');
    if (!likeRenderer) return { isLiked: false, button: null };

    const likeStatusAttr = likeRenderer.getAttribute('like-status');
    const isLikedByAttr = likeStatusAttr === 'LIKE';

    const buttons = Array.from(likeRenderer.querySelectorAll('button, tp-yt-paper-icon-button'));
    let likeBtn = buttons.find((b) => {
      const aria = (b.getAttribute('aria-label') || '').toLowerCase();
      const icon = b.querySelector('yt-icon, tp-yt-iron-icon');
      const iconAttr = (icon?.getAttribute('icon') || '').toLowerCase();
      const isDislike = aria.includes('dislike') || iconAttr.includes('thumb-down');
      if (isDislike) return false;

      return (
        aria.includes('like') ||
        iconAttr.includes('thumb-up') ||
        b.classList.contains('like') ||
        b.id === 'like-button'
      );
    });

    if (!likeBtn && buttons.length > 0) {
      likeBtn = buttons.find((b) => {
        const aria = (b.getAttribute('aria-label') || '').toLowerCase();
        return !aria.includes('dislike');
      }) || buttons[0];
    }

    const isPressed = likeBtn?.getAttribute('aria-pressed') === 'true';
    const ariaLabel = (likeBtn?.getAttribute('aria-label') || '').toLowerCase();
    const isLikedByLabel = ariaLabel.includes('remove like') || ariaLabel.includes('liked');

    return {
      isLiked: isLikedByAttr || isPressed || isLikedByLabel,
      button: likeBtn,
    };
  }

  // --- Playlist Full Loader (Auto-Scroll) ---
  async function loadAllPlaylistItems(logger, progressUpdater) {
    logger('Scanning playlist & preloading tracks...', 'info');
    let lastCount = 0;
    let unchangedCycles = 0;
    const maxUnchangedCycles = 4;

    while (unchangedCycles < maxUnchangedCycles) {
      if (STATE.stopRequested) return [];

      const rows = getPlaylistRows();
      const currentCount = rows.length;

      if (currentCount > lastCount) {
        lastCount = currentCount;
        unchangedCycles = 0;
        logger(`Loaded ${currentCount} playlist songs so far...`, 'info');
        progressUpdater(currentCount);
      } else {
        unchangedCycles++;
      }

      // Check continuation specifically within the playlist shelf
      const playlistShelf = document.querySelector('ytmusic-playlist-shelf-renderer');
      const continuation = playlistShelf ? playlistShelf.querySelector('ytmusic-continuation-item-renderer') : null;

      // If playlist shelf has no continuation item left and we verified count stability, loading is complete
      if (playlistShelf && !continuation && currentCount > 0 && unchangedCycles >= 2) {
        logger(`All playlist tracks loaded (${currentCount} songs).`, 'success');
        break;
      }

      // Scroll specifically the playlist continuation or the last playlist row to avoid scrolling into suggestions
      if (continuation) {
        continuation.scrollIntoView({ behavior: 'auto', block: 'end' });
      } else if (rows.length > 0) {
        rows[rows.length - 1].scrollIntoView({ behavior: 'auto', block: 'end' });
      } else if (playlistShelf) {
        playlistShelf.scrollIntoView({ behavior: 'auto', block: 'end' });
      }

      await sleep(800);
    }

    const finalRows = getPlaylistRows();
    logger(`Scan complete: Found ${finalRows.length} playlist songs.`, 'success');
    return finalRows;
  }

  class AutoLikerUI {
    constructor() {
      injectCSS();
      this.createDOM();
      this.bindEvents();
      this.detectCurrentURL();
    }

    createDOM() {
      // 1. Floating Launcher Button
      const launcher = document.createElement('div');
      launcher.id = 'ytm-autoliker-launcher';
      launcher.title = 'Click to open/close YouTube Music Auto-Liker';
      launcher.style.cssText = `
        position: fixed !important;
        bottom: 85px !important;
        right: 25px !important;
        background: #ff0000 !important;
        color: #ffffff !important;
        padding: 9px 15px !important;
        border-radius: 25px !important;
        font-weight: 700 !important;
        font-size: 13px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
        box-shadow: 0 4px 18px rgba(255, 0, 0, 0.6) !important;
        cursor: pointer !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        gap: 7px !important;
        border: 1px solid rgba(255, 255, 255, 0.35) !important;
        user-select: none !important;
      `;
      launcher.appendChild(heartSvg(16, '#ffffff'));
      const launcherText = document.createElement('span');
      launcherText.textContent = 'Auto-Liker';
      launcher.appendChild(launcherText);

      // 2. Main Floating Panel
      const panel = document.createElement('div');
      panel.id = 'ytm-autoliker-panel';
      panel.style.cssText = `
        position: fixed !important;
        top: 80px !important;
        right: 25px !important;
        width: 360px !important;
        max-width: calc(100vw - 35px) !important;
        background: #181818 !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 14px !important;
        box-shadow: 0 16px 45px rgba(0, 0, 0, 0.9) !important;
        color: #fff !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
        z-index: 2147483647 !important;
        user-select: none !important;
        font-size: 13px !important;
        line-height: 1.4 !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
      `;

      // Header
      const header = document.createElement('div');
      header.id = 'ytm-autoliker-header';

      const titleDiv = document.createElement('div');
      titleDiv.id = 'ytm-autoliker-title';
      titleDiv.appendChild(heartSvg(17, '#ffffff'));
      const titleSpan = document.createElement('span');
      titleSpan.textContent = 'YTM Auto-Liker';
      titleDiv.appendChild(titleSpan);
      header.appendChild(titleDiv);

      const headerActions = document.createElement('div');
      headerActions.className = 'ytm-header-actions';

      const minBtn = document.createElement('button');
      minBtn.className = 'ytm-icon-btn';
      minBtn.id = 'ytm-minimize-btn';
      minBtn.title = 'Minimize/Expand';
      minBtn.textContent = '−';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'ytm-icon-btn';
      closeBtn.id = 'ytm-close-btn';
      closeBtn.title = 'Hide Panel';
      closeBtn.textContent = '×';

      headerActions.appendChild(minBtn);
      headerActions.appendChild(closeBtn);
      header.appendChild(headerActions);
      panel.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.id = 'ytm-autoliker-body';

      // Section: Playlist URL
      const grpUrl = document.createElement('div');
      grpUrl.className = 'ytm-input-group';
      const lblUrl = document.createElement('div');
      lblUrl.className = 'ytm-section-label';
      lblUrl.textContent = 'Playlist Link / Current Page';
      const rowUrl = document.createElement('div');
      rowUrl.className = 'ytm-input-row';
      const inputUrl = document.createElement('input');
      inputUrl.type = 'text';
      inputUrl.id = 'ytm-playlist-url';
      inputUrl.placeholder = 'https://music.youtube.com/playlist?list=...';
      inputUrl.style.flex = '1';
      const btnNav = document.createElement('button');
      btnNav.className = 'ytm-button ytm-button-secondary';
      btnNav.id = 'ytm-navigate-btn';
      btnNav.title = 'Go to Playlist';
      btnNav.textContent = 'Go';
      rowUrl.appendChild(inputUrl);
      rowUrl.appendChild(btnNav);
      grpUrl.appendChild(lblUrl);
      grpUrl.appendChild(rowUrl);
      body.appendChild(grpUrl);

      // Section: Order
      const grpOrder = document.createElement('div');
      grpOrder.className = 'ytm-input-group';
      const lblOrder = document.createElement('div');
      lblOrder.className = 'ytm-section-label';
      lblOrder.textContent = 'Liking Order';
      const selectOrder = document.createElement('select');
      selectOrder.id = 'ytm-order-select';
      const opt1 = document.createElement('option');
      opt1.value = 'oldestFirst';
      opt1.textContent = 'Oldest Songs First (Bottom to Top)';
      const opt2 = document.createElement('option');
      opt2.value = 'defaultOrder';
      opt2.textContent = 'Playlist Order (Top to Bottom)';
      selectOrder.appendChild(opt1);
      selectOrder.appendChild(opt2);
      grpOrder.appendChild(lblOrder);
      grpOrder.appendChild(selectOrder);
      body.appendChild(grpOrder);

      // Section: Delay
      const grpDelay = document.createElement('div');
      grpDelay.className = 'ytm-input-group';
      const lblDelay = document.createElement('div');
      lblDelay.className = 'ytm-section-label';
      lblDelay.textContent = 'Delay Between Likes (Seconds)';
      const rowDelay = document.createElement('div');
      rowDelay.className = 'ytm-input-row';
      const minDelayInput = document.createElement('input');
      minDelayInput.type = 'number';
      minDelayInput.id = 'ytm-min-delay';
      minDelayInput.value = '1.5';
      minDelayInput.min = '0.5';
      minDelayInput.max = '30';
      minDelayInput.step = '0.5';
      minDelayInput.style.width = '50%';
      minDelayInput.title = 'Minimum Delay';

      const spanTo = document.createElement('span');
      spanTo.style.color = '#888';
      spanTo.textContent = 'to';

      const maxDelayInput = document.createElement('input');
      maxDelayInput.type = 'number';
      maxDelayInput.id = 'ytm-max-delay';
      maxDelayInput.value = '3.0';
      maxDelayInput.min = '0.5';
      maxDelayInput.max = '30';
      maxDelayInput.step = '0.5';
      maxDelayInput.style.width = '50%';
      maxDelayInput.title = 'Maximum Delay';

      rowDelay.appendChild(minDelayInput);
      rowDelay.appendChild(spanTo);
      rowDelay.appendChild(maxDelayInput);
      grpDelay.appendChild(lblDelay);
      grpDelay.appendChild(rowDelay);
      body.appendChild(grpDelay);

      // Checkboxes
      const checkContainer = document.createElement('div');
      checkContainer.style.cssText = 'display: flex; flex-direction: column; gap: 6px;';

      const lblCheck1 = document.createElement('label');
      lblCheck1.className = 'ytm-checkbox-label';
      const checkSkip = document.createElement('input');
      checkSkip.type = 'checkbox';
      checkSkip.id = 'ytm-skip-liked';
      checkSkip.checked = true;
      lblCheck1.appendChild(checkSkip);
      lblCheck1.appendChild(document.createTextNode(' Skip songs already liked (prevent unliking)'));

      const lblCheck2 = document.createElement('label');
      lblCheck2.className = 'ytm-checkbox-label';
      const checkAutoScroll = document.createElement('input');
      checkAutoScroll.type = 'checkbox';
      checkAutoScroll.id = 'ytm-auto-scroll';
      checkAutoScroll.checked = true;
      lblCheck2.appendChild(checkAutoScroll);
      lblCheck2.appendChild(document.createTextNode(' Keep active track scrolled in view'));

      checkContainer.appendChild(lblCheck1);
      checkContainer.appendChild(lblCheck2);
      body.appendChild(checkContainer);

      // Stats Grid
      const statsGrid = document.createElement('div');
      statsGrid.className = 'ytm-stats-grid';

      const createStatBox = (id, labelText, extraClass = '') => {
        const box = document.createElement('div');
        box.className = `ytm-stat-box ${extraClass}`.trim();
        const val = document.createElement('span');
        val.className = 'val';
        val.id = id;
        val.textContent = '0';
        const lbl = document.createElement('span');
        lbl.className = 'lbl';
        lbl.textContent = labelText;
        box.appendChild(val);
        box.appendChild(lbl);
        return box;
      };

      statsGrid.appendChild(createStatBox('ytm-stat-total', 'Total'));
      statsGrid.appendChild(createStatBox('ytm-stat-liked', 'Liked', 'liked'));
      statsGrid.appendChild(createStatBox('ytm-stat-skipped', 'Skipped', 'skipped'));
      statsGrid.appendChild(createStatBox('ytm-stat-error', 'Errors', 'error'));
      body.appendChild(statsGrid);

      // Current track & Progress
      const trackDiv = document.createElement('div');
      const curTrack = document.createElement('div');
      curTrack.id = 'ytm-current-track';
      curTrack.textContent = 'Ready to start';

      const progressContainer = document.createElement('div');
      progressContainer.className = 'ytm-progress-container';
      const progressBar = document.createElement('div');
      progressBar.className = 'ytm-progress-bar';
      progressBar.id = 'ytm-progress-bar';
      progressContainer.appendChild(progressBar);

      trackDiv.appendChild(curTrack);
      trackDiv.appendChild(progressContainer);
      body.appendChild(trackDiv);

      // Action buttons
      const btnRow = document.createElement('div');
      btnRow.className = 'ytm-btn-row';

      const startBtn = document.createElement('button');
      startBtn.className = 'ytm-button';
      startBtn.id = 'ytm-start-btn';
      startBtn.textContent = 'Start Liking';

      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'ytm-button ytm-button-secondary';
      pauseBtn.id = 'ytm-pause-btn';
      pauseBtn.disabled = true;
      pauseBtn.textContent = 'Pause';

      const stopBtn = document.createElement('button');
      stopBtn.className = 'ytm-button ytm-button-secondary';
      stopBtn.id = 'ytm-stop-btn';
      stopBtn.disabled = true;
      stopBtn.textContent = 'Stop';

      btnRow.appendChild(startBtn);
      btnRow.appendChild(pauseBtn);
      btnRow.appendChild(stopBtn);
      body.appendChild(btnRow);

      // Log section
      const logSec = document.createElement('div');
      const logLbl = document.createElement('div');
      logLbl.className = 'ytm-section-label';
      logLbl.textContent = 'Activity Log';
      const logBox = document.createElement('div');
      logBox.id = 'ytm-log-box';
      logSec.appendChild(logLbl);
      logSec.appendChild(logBox);
      body.appendChild(logSec);

      panel.appendChild(body);

      const mountParent = document.body || document.documentElement;
      mountParent.appendChild(launcher);
      mountParent.appendChild(panel);

      this.panel = panel;
      this.launcher = launcher;

      window.__ytmAutoLikerOpen = () => {
        panel.style.display = 'flex';
      };
      window.__ytmAutoLikerHide = () => {
        panel.style.display = 'none';
      };
    }

    bindEvents() {
      // Toggle from Launcher
      this.launcher.addEventListener('click', () => {
        const isHidden = this.panel.style.display === 'none';
        this.panel.style.display = isHidden ? 'flex' : 'none';
      });

      // Close button on Panel
      const closeBtn = this.panel.querySelector('#ytm-close-btn');
      closeBtn.addEventListener('click', () => {
        this.panel.style.display = 'none';
      });

      // Draggable panel
      const header = this.panel.querySelector('#ytm-autoliker-header');
      let isDragging = false;
      let startX, startY, initialLeft, initialTop;

      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.ytm-header-actions')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = this.panel.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        this.panel.style.right = 'auto';
        this.panel.style.left = `${initialLeft}px`;
        this.panel.style.top = `${initialTop}px`;
      });

      window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        this.panel.style.left = `${Math.max(10, Math.min(window.innerWidth - 370, initialLeft + dx))}px`;
        this.panel.style.top = `${Math.max(10, Math.min(window.innerHeight - 100, initialTop + dy))}px`;
      });

      window.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Minimize button
      const minBtn = this.panel.querySelector('#ytm-minimize-btn');
      const body = this.panel.querySelector('#ytm-autoliker-body');
      minBtn.addEventListener('click', () => {
        const isMin = body.classList.toggle('minimized');
        minBtn.textContent = isMin ? '+' : '−';
      });

      // Navigate button
      const navBtn = this.panel.querySelector('#ytm-navigate-btn');
      const urlInput = this.panel.querySelector('#ytm-playlist-url');
      navBtn.addEventListener('click', () => {
        const val = urlInput.value.trim();
        if (val) {
          if (!val.includes('music.youtube.com') && !val.includes('youtube.com')) {
            alert('Please enter a valid YouTube Music playlist URL (e.g. https://music.youtube.com/playlist?list=...)');
            return;
          }
          window.location.href = val;
        }
      });

      // Start / Pause / Stop Buttons
      const startBtn = this.panel.querySelector('#ytm-start-btn');
      const pauseBtn = this.panel.querySelector('#ytm-pause-btn');
      const stopBtn = this.panel.querySelector('#ytm-stop-btn');

      startBtn.addEventListener('click', () => this.handleStart());
      pauseBtn.addEventListener('click', () => this.handlePause());
      stopBtn.addEventListener('click', () => this.handleStop());
    }

    detectCurrentURL() {
      const urlInput = this.panel.querySelector('#ytm-playlist-url');
      if (window.location.href.includes('/playlist') || window.location.href.includes('/browse/')) {
        urlInput.value = window.location.href;
      }
      window.addEventListener('yt-navigate-finish', () => {
        if (window.location.href.includes('/playlist') || window.location.href.includes('/browse/')) {
          urlInput.value = window.location.href;
        }
      });
    }

    log(message, type = 'info') {
      const logBox = this.panel.querySelector('#ytm-log-box');
      if (!logBox) return;
      const entry = document.createElement('div');
      entry.className = `ytm-log-entry ${type}`;
      entry.textContent = `[${formatTime()}] ${message}`;
      logBox.appendChild(entry);
      logBox.scrollTop = logBox.scrollHeight;
    }

    updateStats() {
      this.panel.querySelector('#ytm-stat-total').textContent = STATE.totalSongs;
      this.panel.querySelector('#ytm-stat-liked').textContent = STATE.likedCount;
      this.panel.querySelector('#ytm-stat-skipped').textContent = STATE.skippedCount;
      this.panel.querySelector('#ytm-stat-error').textContent = STATE.errorCount;

      const progress = STATE.totalSongs > 0 ? (STATE.currentIndex / STATE.totalSongs) * 100 : 0;
      this.panel.querySelector('#ytm-progress-bar').style.width = `${Math.min(100, progress)}%`;
    }

    setCurrentTrack(text) {
      this.panel.querySelector('#ytm-current-track').textContent = text;
    }

    setControlsState(status) {
      STATE.status = status;
      const startBtn = this.panel.querySelector('#ytm-start-btn');
      const pauseBtn = this.panel.querySelector('#ytm-pause-btn');
      const stopBtn = this.panel.querySelector('#ytm-stop-btn');
      const inputs = this.panel.querySelectorAll(
        '#ytm-order-select, #ytm-min-delay, #ytm-max-delay, #ytm-skip-liked, #ytm-playlist-url, #ytm-navigate-btn'
      );

      if (status === 'RUNNING' || status === 'LOADING_PLAYLIST') {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Pause';
        stopBtn.disabled = false;
        inputs.forEach((i) => (i.disabled = true));
      } else if (status === 'PAUSED') {
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Resume';
        stopBtn.disabled = false;
      } else {
        startBtn.disabled = false;
        startBtn.textContent = 'Start Liking';
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'Pause';
        stopBtn.disabled = true;
        inputs.forEach((i) => (i.disabled = false));
      }
    }

    readConfig() {
      STATE.order = this.panel.querySelector('#ytm-order-select').value;
      const minD = parseFloat(this.panel.querySelector('#ytm-min-delay').value);
      const maxD = parseFloat(this.panel.querySelector('#ytm-max-delay').value);
      STATE.minDelay = Math.max(500, Math.min(minD, maxD) * 1000);
      STATE.maxDelay = Math.max(STATE.minDelay, Math.max(minD, maxD) * 1000);
      STATE.skipLiked = this.panel.querySelector('#ytm-skip-liked').checked;
      STATE.autoScroll = this.panel.querySelector('#ytm-auto-scroll').checked;
    }

    async handleStart() {
      this.readConfig();
      STATE.stopRequested = false;
      STATE.pauseRequested = false;
      STATE.likedCount = 0;
      STATE.skippedCount = 0;
      STATE.errorCount = 0;
      STATE.currentIndex = 0;
      this.updateStats();

      if (!window.location.href.includes('/playlist') && !window.location.href.includes('/browse/')) {
        this.log('Notice: Make sure you are on a playlist page before starting.', 'warn');
      }

      this.setControlsState('LOADING_PLAYLIST');
      this.setCurrentTrack('Scanning playlist items...');

      const rows = await loadAllPlaylistItems(
        (msg, type) => this.log(msg, type),
        (count) => {
          STATE.totalSongs = count;
          this.updateStats();
        }
      );

      if (STATE.stopRequested) {
        this.setControlsState('STOPPED');
        this.setCurrentTrack('Stopped.');
        return;
      }

      if (!rows || rows.length === 0) {
        this.log('No songs found in this playlist. Please open a valid playlist.', 'error');
        this.setControlsState('IDLE');
        this.setCurrentTrack('No songs found.');
        return;
      }

      STATE.totalSongs = rows.length;
      this.updateStats();
      this.setControlsState('RUNNING');

      const targetIndices = [];
      if (STATE.order === 'oldestFirst') {
        for (let i = rows.length - 1; i >= 0; i--) {
          targetIndices.push(i);
        }
      } else {
        for (let i = 0; i < rows.length; i++) {
          targetIndices.push(i);
        }
      }

      this.log(`Starting auto-like for ${rows.length} songs (${STATE.order === 'oldestFirst' ? 'Oldest first' : 'Playlist order'})...`, 'info');

      for (let step = 0; step < targetIndices.length; step++) {
        if (STATE.stopRequested) {
          this.log('Process stopped by user.', 'warn');
          break;
        }

        if (STATE.pauseRequested) {
          this.setControlsState('PAUSED');
          this.setCurrentTrack('Paused.');
          this.log('Process paused.', 'warn');
          await new Promise((resolve) => {
            STATE.resumeResolver = resolve;
          });
          if (STATE.stopRequested) break;
          this.setControlsState('RUNNING');
          this.log('Process resumed.', 'info');
        }

        const rowIndex = targetIndices[step];
        const currentRows = getPlaylistRows();
        const row = currentRows[rowIndex] || rows[rowIndex];

        if (!row) {
          STATE.errorCount++;
          this.log(`Track #${rowIndex + 1} not found in DOM.`, 'error');
          STATE.currentIndex = step + 1;
          this.updateStats();
          continue;
        }

        const { title, artist } = getTrackInfo(row);
        this.setCurrentTrack(`[${step + 1}/${targetIndices.length}] ${title} - ${artist}`);

        if (STATE.autoScroll) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        const { isLiked, button } = getLikeStatusAndButton(row);

        if (isLiked && STATE.skipLiked) {
          STATE.skippedCount++;
          this.log(`[Skipped - Already Liked] ${title} - ${artist}`, 'warn');
        } else if (!button) {
          STATE.errorCount++;
          this.log(`[Error: No Like Button] ${title} - ${artist}`, 'error');
        } else {
          try {
            button.click();
            STATE.likedCount++;
            this.log(`[Liked] ${title} - ${artist}`, 'success');
            await sleep(350);
          } catch (err) {
            STATE.errorCount++;
            this.log(`[Click Failed] ${title}: ${err.message}`, 'error');
          }
        }

        STATE.currentIndex = step + 1;
        this.updateStats();

        if (step < targetIndices.length - 1 && !STATE.stopRequested) {
          const delay = randomDelay(STATE.minDelay, STATE.maxDelay);
          await sleep(delay);
        }
      }

      this.setControlsState('IDLE');
      this.setCurrentTrack('Finished!');
      this.log(`Completed: Liked ${STATE.likedCount}, Skipped ${STATE.skippedCount}, Errors ${STATE.errorCount}.`, 'success');
    }

    handlePause() {
      if (STATE.status === 'RUNNING') {
        STATE.pauseRequested = true;
      } else if (STATE.status === 'PAUSED') {
        STATE.pauseRequested = false;
        if (STATE.resumeResolver) {
          STATE.resumeResolver();
          STATE.resumeResolver = null;
        }
      }
    }

    handleStop() {
      STATE.stopRequested = true;
      if (STATE.resumeResolver) {
        STATE.resumeResolver();
        STATE.resumeResolver = null;
      }
      this.setControlsState('STOPPED');
      this.setCurrentTrack('Stopping...');
      this.log('Stop signal sent.', 'warn');
    }
  }

  // --- Initializer & Mounting ---
  function mountUI() {
    console.log('[YTM Auto-Liker] mountUI triggered');
    if (document.getElementById('ytm-autoliker-panel')) {
      console.log('[YTM Auto-Liker] Panel is already in DOM.');
      return;
    }
    const mountParent = document.body || document.documentElement;
    if (!mountParent) {
      console.log('[YTM Auto-Liker] Waiting for body/documentElement...');
      setTimeout(mountUI, 200);
      return;
    }
    try {
      new AutoLikerUI();
      console.log(
        '%c[YTM Auto-Liker]%c Panel & Launcher successfully attached to DOM!',
        'background: #ff0000; color: #fff; padding: 3px 6px; border-radius: 3px; font-weight: bold;',
        'color: #4ade80; font-weight: bold;'
      );
    } catch (err) {
      console.error('[YTM Auto-Liker] Initialization error:', err);
    }
  }

  // Try immediate mount
  mountUI();

  // Also hook into lifecycle events
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountUI);
  }
  window.addEventListener('load', mountUI);
  window.addEventListener('yt-navigate-finish', mountUI);
})();
