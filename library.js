"use strict";

let libraryWorks = [];

const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const grid = document.getElementById("grid");
const artistSelect = document.getElementById("artist-filter");
const typeFilters = document.getElementById("type-filters");
const clearButton = document.getElementById("clear");
let selectedArtist = [];
let selectedType = [];

function selectWorks(works, query, artist, type, order) {
  const terms = query.trim().normalize("NFKC").toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const result = works.filter(work => {
    const text = [work.title, work.artist, work.type, work.keywords].join(" ").normalize("NFKC").toLocaleLowerCase();
    return (!artist.length || artist.some(name => work.tags.includes(name))) &&
      (!type.length || type.includes(work.type || "待分類")) && terms.every(term => text.includes(term));
  });
  if (order === "newest") result.sort((a, b) => b.date.localeCompare(a.date));
  if (order === "oldest") result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeCard(work, index) {
  const url = new URL(work.url);
  const playerUrl = url.hostname === "zx2538265.github.io" && url.pathname.replace(/\/$/, "") === "/player" ? `./${url.search}` : work.url;
  const article = makeElement("article", "work");
  const cover = makeElement("a", "cover-link");
  cover.href = playerUrl;
  cover.setAttribute("aria-label", `觀看翻譯：${work.title}`);
  const image = makeElement("img");
  image.alt = "";
  image.width = 640;
  image.height = 360;
  image.loading = index < 3 ? "eager" : "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    image.replaceWith(makeElement("span", "cover-fallback", `${work.artist} · 影片封面暫無法載入`));
  }, { once: true });
  if (work.image) { image.src = work.image; cover.append(image); }
  else cover.append(makeElement("span", "cover-fallback", work.artist));
  if (work.type) cover.append(makeElement("span", "cover-type", work.type));
  const content = makeElement("div", "work-content");
  const meta = makeElement("div", "work-meta");
  const date = makeElement("time", "", `${work.dateLabel} ${work.date.replaceAll("-", "/")}`);
  date.dateTime = work.date;
  meta.append(makeElement("span", "artist", work.artist), date);
  const title = makeElement("h3");
  const titleLink = makeElement("a", "", work.title);
  titleLink.href = playerUrl;
  title.append(titleLink);
  content.append(meta, title);
  article.append(cover, content);
  return article;
}

function render() {
  const result = selectWorks(libraryWorks, searchInput.value, selectedArtist, selectedType, sortSelect.value);
  grid.replaceChildren(...result.map(makeCard));
  document.getElementById("count").textContent = `顯示 ${result.length} / ${libraryWorks.length} 部作品`;
  document.getElementById("empty").hidden = result.length !== 0;
  clearButton.hidden = searchInput.value.length === 0;
  document.getElementById("artist-summary").textContent = selectedArtist.length ? selectedArtist.join("、") : "全部藝人／團體";
  artistSelect.querySelectorAll("input").forEach(input => { input.checked = selectedArtist.includes(input.value); });
  document.getElementById("type-summary").textContent = selectedType.length ? selectedType.join("、") : "全部內容類型";
  typeFilters.querySelectorAll("input").forEach(input => { input.checked = selectedType.includes(input.value); });
}

function renderFilters() {
artistSelect.replaceChildren();
for (const artist of new Set(libraryWorks.flatMap(work => work.tags))) {
  const label = makeElement("label", "artist-option");
  const input = makeElement("input");
  input.type = "checkbox";
  input.value = artist;
  input.addEventListener("change", () => {
    selectedArtist = input.checked ? [...selectedArtist, artist] : selectedArtist.filter(name => name !== artist);
    render();
  });
  label.append(input, makeElement("span", "", artist));
  artistSelect.append(label);
}
typeFilters.replaceChildren();
for (const type of new Set(libraryWorks.map(work => work.type || "待分類"))) {
  const label = makeElement("label", "artist-option");
  const input = makeElement("input");
  input.type = "checkbox";
  input.value = type;
  input.addEventListener("change", () => {
    selectedType = input.checked ? [...selectedType, type] : selectedType.filter(name => name !== type);
    render();
  });
  label.append(input, makeElement("span", "", type));
  typeFilters.append(label);
}
}
document.querySelector(".search-form").addEventListener("submit", event => event.preventDefault());
searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);
document.getElementById("artist-all").addEventListener("click", () => { selectedArtist = []; render(); });
document.getElementById("type-all").addEventListener("click", () => { selectedType = []; render(); });
for (const picker of document.querySelectorAll(".filter-picker")) {
  document.addEventListener("click", event => { if (!picker.contains(event.target)) picker.open = false; });
  picker.addEventListener("keydown", event => {
    if (event.key === "Escape") { picker.open = false; picker.querySelector("summary").focus(); }
  });
}
clearButton.addEventListener("click", () => { searchInput.value = ""; render(); searchInput.focus(); });
document.getElementById("reset").addEventListener("click", () => {
  searchInput.value = "";
  selectedArtist = [];
  selectedType = [];
  sortSelect.value = "curated";
  render();
  searchInput.focus();
});
async function loadLibrary() {
  document.getElementById("count").textContent = "讀取作品中…";
  try {
    const response = await fetch("data/library.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Catalog unavailable");
    const data = await response.json();
    const safeUrl = value => { try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password; } catch { return false; } };
    if (data.version !== 1 || !["notion", "preview"].includes(data.source) || !Array.isArray(data.works) || !data.works.length || !data.works.every(work =>
      typeof work.id === "string" && typeof work.title === "string" && work.title &&
      [work.artist, work.type, work.keywords, work.dateLabel].every(value => typeof value === "string") &&
      typeof work.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(work.date) &&
      Array.isArray(work.tags) && work.tags.every(tag => typeof tag === "string") && safeUrl(work.url) &&
      (!work.sourceUrl || safeUrl(work.sourceUrl)) && (!work.image || /^data\/covers\/[a-f0-9]{64}\.(png|jpg|gif|webp)$/.test(work.image) || safeUrl(work.image)))) throw new Error("Invalid catalog");
    libraryWorks = data.works;
    const isPreview = data.source === "preview";
    sortSelect.options[0].textContent = data.orderSource === "notion-view" ? "Notion 排序" : (isPreview ? "清單順序" : "最近加入");
    sortSelect.options[1].textContent = isPreview ? "原片日期：新到舊" : "加入日期：新到舊";
    sortSelect.options[2].textContent = isPreview ? "原片日期：舊到新" : "加入日期：舊到新";
    renderFilters();
    render();
  } catch {
    document.getElementById("count").textContent = "作品清單暫時無法載入，請重新整理，或開啟上方 Notion 清單。";
    searchInput.disabled = true;
    sortSelect.disabled = true;
    document.getElementById("artist-all").disabled = true;
    document.getElementById("type-all").disabled = true;
  }
}
loadLibrary();
