// =========================
// LOCAL STORAGE
// =========================

const STORAGE_KEY = "skyblockFusionSettings";

// =========================
// SAVE SETTINGS
// =========================
export function saveSettings(data) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

}

// =========================
// LOAD SETTINGS
// =========================
export function loadSettings() {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return null;
    }

    try {

        return JSON.parse(saved);

    } catch (error) {

        console.error(
            "FAILED TO LOAD SETTINGS:",
            error
        );

        return null;

    }

}

// =========================
// CLEAR SETTINGS
// =========================
export function clearSettings() {

    localStorage.removeItem(STORAGE_KEY);

}