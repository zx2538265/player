/* The build manifest contains only share pages included in the same release. */
(() => {
  const button = document.getElementById("copyShareBtn");
  const startOption = document.getElementById("shareStartOption");
  const startCheckbox = document.getElementById("shareStartEnabled");
  const startInput = document.getElementById("shareStartTime");
  const status = document.getElementById("shareStatus");
  let manifest;
  let currentId = "";
  let shareUrl = "";
  let getCurrentTime;

  window.updateShareVideo = async (videoId, readCurrentTime) => {
    currentId = videoId;
    getCurrentTime = readCurrentTime;
    shareUrl = "";
    button.hidden = true;
    startOption.hidden = true;
    startCheckbox.checked = false;
    startInput.hidden = true;
    startInput.value = "";
    status.textContent = "";
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return;
    try {
      manifest ||= fetch("data/share.json", { cache: "no-cache" }).then(async response => {
        if (!response.ok) throw new Error("Share manifest unavailable");
        const data = await response.json();
        if (data.version !== 1 || !data.videos || typeof data.videos !== "object") throw new Error("Invalid share manifest");
        return data.videos;
      });
      const videos = await manifest;
      if (videoId !== currentId) return;
      const expected = `https://allenka.com/share/${videoId}/`;
      if (videos[videoId] !== expected) return;
      shareUrl = expected;
      button.hidden = false;
      startOption.hidden = false;
    } catch {
      manifest = null;
    }
  };

  startCheckbox.addEventListener("change", () => {
    status.textContent = "";
    startInput.hidden = !startCheckbox.checked;
    if (!startCheckbox.checked) return;
    const seconds = Math.floor(getCurrentTime?.());
    const total = Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total / 60) % 60;
    const rest = String(total % 60).padStart(2, "0");
    startInput.value = hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
      : `${minutes}:${rest}`;
  });

  startInput.addEventListener("input", () => { status.textContent = ""; });

  button.addEventListener("click", async () => {
    const baseUrl = shareUrl;
    if (!baseUrl) return;
    let url = baseUrl;
    if (startCheckbox.checked) {
      const time = startInput.value.trim();
      const seconds = time.split(":").reduce((total, part) => total * 60 + Number(part), 0);
      if (!/^\d+(?::[0-5]?\d){0,2}$/.test(time) || !Number.isSafeInteger(seconds)) {
        status.textContent = "請輸入有效的開始時間，例如 1:23";
        startInput.focus();
        return;
      }
      url += `?t=${seconds}`;
    }
    try {
      await navigator.clipboard.writeText(url);
      if (shareUrl === baseUrl) status.textContent = "已複製分享連結";
    } catch {
      if (shareUrl === baseUrl) window.prompt("請複製分享連結", url);
    }
  });
})();
