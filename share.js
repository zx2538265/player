/* The build manifest contains only share pages included in the same release. */
(() => {
  const button = document.getElementById("copyShareBtn");
  const status = document.getElementById("shareStatus");
  let manifest;
  let currentId = "";
  let shareUrl = "";

  window.updateShareVideo = async videoId => {
    currentId = videoId;
    shareUrl = "";
    button.hidden = true;
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
    } catch {
      manifest = null;
    }
  };

  button.addEventListener("click", async () => {
    const url = shareUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      if (shareUrl === url) status.textContent = "已複製分享連結";
    } catch {
      if (shareUrl === url) window.prompt("請複製分享連結", url);
    }
  });
})();
