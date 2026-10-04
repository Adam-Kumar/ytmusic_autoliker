# YouTube Music Playlist Auto-Liker

A client-side userscript that automatically likes every song in a YouTube Music playlist. This tool enables users to bulk-transfer songs from any playlist into their personal "Liked Music" collection while preserving track order and preventing accidental unliking.

---

## Use Cases

- **Playlist to Liked Music Migration**: Quickly transfer any custom, public, or shared playlist into your primary Liked Music library.
- **Chronological Preservation**: Use the "Oldest Songs First" mode so older playlist additions appear at the bottom of your Liked Music library, preserving your listening timeline.
- **Account Migration**: When switching accounts, users who keep their music in their 'liked music' playlist have no native methods to transfer liked music to a new account's liked music playlist.
- **Safe Resumption**: Run the script on partially liked playlists without risking unliking tracks you already marked as liked.

---

## Key Features

- **Direction Control**: Support for both bottom-to-top (Oldest First) and top-to-bottom (Playlist Order) execution. This feature was missing in similar publicly available scripts
- **Smart Duplicate Prevention**: Inspects `like-status="LIKE"` and `aria-pressed="true"` states prior to clicking, preventing accidental unliking of already-liked tracks.
- **Rate-Limiting Protection**: Customizable minimum and maximum delay boundaries with randomized interval jitter to mimic natural user interaction.
- **Targeted Playlist Isolation**: Scopes exclusively to the playlist shelf container (`ytmusic-playlist-shelf-renderer`), ignoring unrelated recommendations or suggested tracks at the bottom of the page.
- **Continuation Auto-Loader**: Programmatically scrolls the playlist container until all continuation tokens are resolved, ensuring long playlists (500+ songs) are fully loaded before processing.
- **Trusted Types Compliant**: Built entirely with native DOM construction APIs (`document.createElement`, `document.createElementNS`), ensuring zero conflicts with YouTube's strict `TrustedHTML` Content Security Policy.
- **Floating Control Overlay**: A draggable, minimizable panel with real-time statistics (Total, Liked, Skipped, Errors), progress tracking, activity logs, and Start/Pause/Stop controls.

---

## Prerequisites

To run this userscript, install a compatible userscript manager extension in your browser:

- **Tampermonkey** (Recommended for Chrome, Edge, Brave, Firefox, Safari)
- **Violentmonkey**

If using Chrome or Chromium-based browsers under Manifest V3:
1. Navigate to `chrome://extensions`.
2. Enable the **Developer mode** toggle in the top-right corner.

---

## Installation

### Method 1: Direct Install (Recommended)
1. Ensure your userscript manager extension is enabled.
2. Click the direct installation link to the raw userscript file:
   [Install ytmusic-autoliker.user.js](https://raw.githubusercontent.com/Adam-Kumar/ytmusic_autoliker/main/ytmusic-autoliker.user.js)
3. Tampermonkey will open an installation prompt. Click **Install**.

### Method 2: Manual Installation
1. Open [`ytmusic-autoliker.user.js`](./ytmusic-autoliker.user.js) in this repository and copy all code.
2. Click the Tampermonkey icon in your browser toolbar and select **Create a new script**.
3. Replace any existing template code with the copied script.
4. Save the script via `Ctrl + S` or **File > Save**.

---

## Usage Instructions

1. Navigate to [music.youtube.com](https://music.youtube.com/).
2. Open the playlist you wish to process, or paste its URL into the **Playlist Link** input box and click **Go**.
3. Configure your preferences:
   - **Liking Order**: Select *Oldest Songs First (Bottom to Top)* or *Playlist Order (Top to Bottom)*.
   - **Delay Between Likes**: Set safe minimum and maximum delay thresholds (e.g., 1.5s to 3.0s).
   - **Skip songs already liked**: Ensure this is checked to protect existing likes.
   - **Keep active track scrolled in view**: Keeps each row visible as it is processed.
4. Click **Start Liking**.
5. The script will scan the playlist, load all continuation items, and process each track according to your parameters.

---

## Configuration Reference

| Option | Default | Recommended | Description |
| :--- | :--- | :--- | :--- |
| **Liking Order** | `Oldest First` | `Oldest First` | Reverses iteration so the oldest playlist additions enter Liked Music first. |
| **Min Delay** | `1.5` seconds | `1.5` – `2.0`s | Lower bound of the randomized delay between like clicks. |
| **Max Delay** | `3.0` seconds | `3.0` – `4.0`s | Upper bound of the randomized delay between like clicks. |
| **Skip Already Liked** | `Enabled` | `Enabled` | Checks like state prior to clicking to avoid toggling off existing likes. |
| **Keep in View** | `Enabled` | `Enabled` | Scrolls the active song into view so DOM components remain active. |

---

## Controls Reference

- **Auto-Liker Launcher**: A red floating button anchored in the bottom-right corner. Click to toggle the main panel.
- **Start Liking**: Initiates playlist preloading and begins execution.
- **Pause / Resume**: Suspends operations without losing current progress index or counters.
- **Stop**: Halts operations immediately.
- **Minimize (− / +)**: Collapses panel body to maintain an unobstructed view of the music player.
- **Drag Header**: Click and hold the header bar to reposition the widget anywhere on screen.

---

## Troubleshooting

### Script does not appear on YouTube Music
- Ensure Developer Mode is enabled in `chrome://extensions`.
- Hard-refresh the YouTube Music tab (`Ctrl + F5` or `Ctrl + Shift + R`). Userscript managers only inject code upon page load.
- Open the Developer Tools console (`F12` > Console) to verify that `[YTM Auto-Liker]` initialization logs are displayed.

### Rate-Limiting or HTTP 429 Errors
- If processing large playlists exceeding 500 tracks, increase the delay range to `2.5s` – `4.5s`.
- If YouTube temporarily throttles your session, click **Pause**, wait 2–5 minutes, and click **Resume**.

### Unavailable or Country-Restricted Tracks
- Grayed-out tracks or podcast episodes without standard music like buttons are safely bypassed and incremented in the **Errors** counter without interrupting the remaining queue.

---

## Security and Privacy

- **Client-Side Only**: All operations execute directly in your active browser session. No external servers or third-party APIs are contacted.
- **Zero Credentials Required**: Operates using your existing YouTube Music session without requiring Google Cloud API keys or OAuth permissions.
- **Trusted Types Compliant**: Does not use insecure HTML assignment strings (`innerHTML`, `outerHTML`), conforming to browser Content Security Policies.

---

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details. Feel free to use or modify this script freely.
