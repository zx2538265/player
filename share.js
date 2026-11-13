/* The build manifest contains only share pages included in the same release. */
(() => {
  const button = document.getElementById("copyShareBtn");
  const openButton = document.getElementById("openShareBtn");
  const dialog = document.getElementById("shareDialog");
  const link = document.getElementById("shareLink");
  const startCheckbox = document.getElementById("shareStartEnabled");
  const startInput = document.getElementById("shareStartTime");
  const status = document.getElementById("shareStatus");
  let manifest;
  let currentId = "";
  let shareUrl = "";
  let getCurrentTime;

  window.updateShareVideo = async (videoId, readCurrentTime) => {
    getCurrentTime = readCurrentTime;
    if (videoId === currentId && shareUrl) return;
    currentId = videoId;
    shareUrl = "";
    if (dialog.open) dialog.close();
    openButton.hidden = true;
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
      openButton.hidden = false;
      refreshLink();
    } catch {
      manifest = null;
    }
  };

  openButton.addEventListener("click", () => {
    refreshLink();
    dialog.showModal();
  });

  dialog.addEventListener("keydown", event => event.stopPropagation());

  startCheckbox.addEventListener("change", () => {
    startInput.hidden = !startCheckbox.checked;
    if (startCheckbox.checked) fillCurrentTime();
    refreshLink();
  });

  function fillCurrentTime() {
    const seconds = Math.floor(getCurrentTime?.());
    const total = Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total / 60) % 60;
    const rest = String(total % 60).padStart(2, "0");
    startInput.value = hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
      : `${minutes}:${rest}`;
  }

  function refreshLink() {
    let url = shareUrl;
    let invalid = false;
    if (startCheckbox.checked) {
      const time = startInput.value.trim();
      const seconds = time.split(":").reduce((total, part) => total * 60 + Number(part), 0);
      invalid = !/^\d+(?::[0-5]?\d){0,2}$/.test(time) || !Number.isSafeInteger(seconds);
      url = invalid ? "" : `${shareUrl}?t=${seconds}`;
    }
    startInput.setAttribute("aria-invalid", String(invalid));
    link.value = url;
    status.textContent = invalid ? "請輸入有效的開始時間，例如 1:23" : "";
    return url;
  }

  startInput.addEventListener("input", refreshLink);
  link.addEventListener("focus", () => link.select());

  button.addEventListener("click", async () => {
    if (!shareUrl || !dialog.open) return;
    const url = refreshLink();
    if (!url) {
      startInput.focus();
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      if (dialog.open && link.value === url) status.textContent = "已複製分享連結";
    } catch {
      if (dialog.open && link.value === url) {
        link.focus();
        link.select();
        status.textContent = "已選取連結，請手動複製";
      }
    }
  });
})();
