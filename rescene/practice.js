'use strict';
const $ = id => document.getElementById(id);
let pendingPlay = false;
let selectedSource = 0;
let segmentEnded = false;
let cueTarget = null, loopTarget = null, catalogFilter = 'all';
let preferences = {}, favorites = new Set();
let ktvFollow = true, ktvRows = [], ktvMarks = [], ktvActive = -1;
function setKtvFollow(value) {
  ktvFollow = value;
  $('ktvFollow').setAttribute('aria-pressed', String(value));
  $('ktvFollow').textContent = value ? '自動跟隨：開' : '回到目前句';
  if (value) ktvActive = -1;
}
function renderKtv() {
  ktvRows = []; ktvMarks = []; ktvActive = -1;
  setKtvFollow(true);
  $('ktvList').replaceChildren(); $('ktvMarkers').replaceChildren();
  const cues = practiceCues(), range = bounds();
  const end = range.end ?? cues.at(-1)?.end ?? range.start + 1;
  cues.forEach((cue, index) => {
    const row = document.createElement('button'); row.className = 'ktv-row';
    const time = document.createElement('span'); time.className = 'ktv-time'; time.textContent = format(cue.start);
    const words = document.createElement('span'), primary = document.createElement('strong');
    const wording = preferences.wording || 'both';
    primary.textContent = wording === 'original' ? cue.text : cue.phoneticZh || cue.text; words.append(primary);
    if (cue.phoneticZh && wording === 'both') { const original = document.createElement('small'); original.textContent = cue.text; words.append(original); }
    row.append(time, words);
    row.setAttribute('aria-label', `${format(cue.start)} ${primary.textContent}，播放這句`);
    row.onclick = () => { setKtvFollow(true); jumpToCue(index, true); };
    const mark = document.createElement('button'); mark.className = 'ktv-marker';
    mark.style.left = `${100 * (Math.max(range.start, cue.start) - range.start) / (end - range.start)}%`;
    mark.style.width = `${100 * (Math.min(end, cue.end) - Math.max(range.start, cue.start)) / (end - range.start)}%`;
    mark.title = `${format(cue.start)} · ${cue.phoneticZh || cue.text}`;
    mark.setAttribute('aria-label', mark.title); mark.tabIndex = -1;
    mark.onclick = row.onclick;
    ktvRows.push(row); ktvMarks.push(mark); $('ktvList').append(row); $('ktvMarkers').append(mark);
  });
}
function updateKtv() {
  const cues = practiceCues(), visible = cues.length > 0;
  const time = ready ? player.getCurrentTime() : bounds().start;
  const range = bounds(), end = range.end ?? cues.at(-1)?.end ?? range.start + 1;
  $('ktvMarkers').style.setProperty('--position', `${Math.max(0, Math.min(100, 100 * (time - range.start) / (end - range.start)))}%`);
  $('ktvElapsed').textContent = format(time);
  $('ktvDuration').textContent = format(range.end ?? (ready ? player.getDuration() : 0));
  const active = segmentEnded ? -1 : cues.findIndex(c => c.start <= time && time < c.end);
  const next = segmentEnded ? -1 : cues.findIndex(c => c.start > time);
  const rate = ready ? player.getPlaybackRate() || 1 : 1;
  const state = ready ? player.getPlayerState() : -1;
  ktvRows.forEach((row, i) => {
    row.disabled = !ready; ktvMarks[i].disabled = !ready;
    row.dataset.state = i === active ? 'active' : i === next ? 'next' : cues[i].end <= time ? 'past' : 'future';
    row.setAttribute('aria-current', i === active ? 'true' : 'false');
    ktvMarks[i].dataset.state = row.dataset.state;
    const countdown = i === next && ready ? ` · 下一句 ${Math.ceil((cues[i].start - time) / rate)} 秒${state === 3 ? '（緩衝中）' : state !== 1 ? '（暫停）' : ''}` : i === next ? ' · 下一句' : i === active ? ' · 目前句' : '';
    row.children[0].textContent = format(cues[i].start) + countdown;
  });
  $('ktvStatus').textContent = !cues.length ? '本首尚無應援提示' : !ready ? '等待影片就緒 · 可先閱讀應援' : segmentEnded ? '本首練習結束' : player.getPlayerState() === 3 ? '影片緩衝中…' : player.getPlayerState() !== 1 ? '按播放，或點一句開始練習' : active >= 0 ? `本句應援 · ${active + 1} / ${cues.length}` : next >= 0 ? `距離下一句還有 ${Math.ceil((cues[next].start - time) / rate)} 秒` : '本首應援已結束';
  const target = active >= 0 ? active : next;
  if (visible && ktvFollow && target >= 0 && target !== ktvActive) {
    const list = $('ktvList'), row = ktvRows[target];
    list.scrollTop = Math.max(0, row.offsetTop - (list.clientHeight - row.offsetHeight) / 2);
    ktvActive = target;
  }
}
try {
  const stored = JSON.parse(localStorage.getItem('rescene-practice') || '{}');
  if (stored && typeof stored === 'object') preferences = stored;
  if (Array.isArray(preferences.favorites)) favorites = new Set(preferences.favorites.filter(Number.isInteger));
} catch { /* Storage may be unavailable in private browsing. */ }
function savePreferences() {
  try { localStorage.setItem('rescene-practice', JSON.stringify({...preferences, favorites:[...favorites]})); } catch {}
}
function updateContinuousStatus() {
  $('continuousStatus').textContent = $('loopCue').checked ? '單句循環中，暫不接續下一首' : $('continuous').checked ? '播完自動接下一首' : '已關閉連續播放';
}
function playbackSource(song = songs[selected]) {
  if (song === songs[selected]) return song?.sources[selectedSource] || song?.sources.find(s => s.videoId);
  return song?.sources.find(s => s.videoId);
}
function chantTrack(song = songs[selected]) {
  return playbackSource(song)?.chant || song?.chant;
}
function practiceCues(song = songs[selected]) {
  const source = playbackSource(song);
  return typeof Chant !== 'undefined' && Chant.validTrack(chantTrack(song), source?.videoId) ? chantTrack(song).cues.filter(c =>
    c.end > (source.startSeconds || 0) && (!Number.isFinite(source.endSeconds) || c.start < source.endSeconds)) : [];
}
function currentCueIndex() {
  const cues = practiceCues();
  if (!cues.length) return -1;
  if (cueTarget !== null) return cueTarget;
  const time = ready ? player.getCurrentTime() : 0;
  const index = cues.findIndex(c => c.end > time);
  return index < 0 ? cues.length - 1 : index;
}
function updatePracticeControls() {
  const cues = practiceCues(), index = currentCueIndex(), enabled = ready && cues.length > 0;
  $('previousCue').disabled = !enabled || index <= 0;
  $('nextCue').disabled = !enabled || index >= cues.length - 1;
  $('repeatCue').disabled = !enabled;
  $('loopCue').disabled = !enabled;
}
function jumpToCue(index, play = false) {
  const cues = practiceCues();
  if (!ready || !cues[index]) return;
  cueTarget = index;
  if ($('loopCue').checked) loopTarget = index;
  seek(Math.max(bounds().start, cues[index].start - 3));
  if (play) player.playVideo();
  updatePracticeControls();
}
function repeatLoop() {
  const cue = practiceCues()[loopTarget];
  if (!$('loopCue').checked || !cue || !ready) return false;
  jumpToCue(loopTarget, true);
  return true;
}
function renderCatalog() {
  const query = ($('search').value || '').trim().toLowerCase();
  $('songList').replaceChildren();
  let count = 0;
  songs.forEach((song, index) => {
    if (!(song.title + ' ' + song.artist).toLowerCase().includes(query) ||
      (catalogFilter === 'saved' && !favorites.has(song.number))) return;
    count++;
    const row = document.createElement('article'); row.className = 'song' + (index === selected ? ' selected' : '');
    const pick = document.createElement('button'); pick.className = 'song-pick'; pick.dataset.song = index;
    pick.setAttribute('aria-pressed', String(index === selected));
    const number = document.createElement('span'); number.className = 'number'; number.textContent = String(index + 1).padStart(2, '0');
    const info = document.createElement('span'), title = document.createElement('strong');
    title.textContent = song.title;
    info.append(title); pick.append(number, info);
    pick.onclick = () => {selectSong(index); $('songTitle').focus(); $('songTitle').scrollIntoView({block:'start'});};
    const save = document.createElement('button'); save.className = 'save';
    save.textContent = favorites.has(song.number) ? '★' : '☆';
    save.setAttribute('aria-label', '收藏 ' + song.title); save.setAttribute('aria-pressed', String(favorites.has(song.number)));
    save.onclick = () => {
      favorites.has(song.number) ? favorites.delete(song.number) : favorites.add(song.number);
      savePreferences(); renderCatalog();
      // Keep keyboard focus after replacing the filtered list.
      const replacement = document.querySelector(`[data-favorite="${song.number}"]`);
      (replacement || $('search')).focus();
    };
    save.dataset.favorite = song.number;
    row.append(pick, save); $('songList').append(row);
  });
  $('songCount').textContent = `${count} 首`;
  if (!count) { const empty = document.createElement('p'); empty.textContent = '沒有符合的歌曲，試試其他關鍵字或篩選。'; $('songList').append(empty); }
}
function bounds() {
  const source = playbackSource();
  const start = Number.isFinite(source?.startSeconds) ? Math.max(0, source.startSeconds) : 0;
  const end = Number.isFinite(source?.endSeconds) && source.endSeconds > start ? source.endSeconds : null;
  return {start, end};
}
function finishSegment() {
  if (segmentEnded) return;
  if (repeatLoop()) return;
  segmentEnded = true;
  $('play').textContent = '播放';
  updateChant();
  advance();
}
let songs = [], selected = 0, player, ready = false, generation = 0, loadTimer;
const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function updateSubtitles() {
  const song = songs[selected], source = playbackSource(song), track = source?.subtitles || song?.subtitles;
  const available = typeof Subtitles !== 'undefined' && Subtitles.validTrack(track, source?.videoId);
  $('subtitlePanel').hidden = !available;
  const cue = available && ready ? Subtitles.at(track, player.getCurrentTime(), segmentEnded ? 0 : player.getPlayerState()) : null;
  $('subtitleDisplay').hidden = !cue;
  if (typeof Subtitles !== 'undefined') Subtitles.render($('subtitleText'), cue);
}
function updateChant() {
  updateSubtitles();
  updateKtv();
  const song = songs[selected], source = playbackSource(song), track = chantTrack(song);
  const available = typeof Chant !== 'undefined' && Chant.validTrack(track, source?.videoId);

  $('chantUnavailable').hidden = available;
  updatePracticeControls();
  const note = available ? [track.note, track.phoneticNote].filter(Boolean).join('\n') : '本首尚未建立逐句應援提示，可先跟著來源影片練習。';
  if ($('chantNote').textContent !== note) $('chantNote').textContent = note;
}

function sourcesInto(container, song) {
  container.replaceChildren();
  if (!song.sources.length) { container.textContent = '應援來源待補'; return; }
  for (const source of song.sources) {
    const a = document.createElement('a');
    a.href = source.resolvedUrl || source.url; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = `${source.kind} ↗`; a.title = source.title || source.kind;
    container.append(a);
  }
}
function fail(message) { ready = false; $('transport').disabled = true; $('status').textContent = message; $('retry').hidden = !songs[selected]?.sources.some(s => s.videoId); updateChant(); }
function advance(reason = '') {
  if (!$('continuous').checked) return;
  const skipped = reason ? [reason] : [];
  let index = selected + 1;
  while (index < songs.length && !songs[index].sources.some(s => s.videoId)) {
    skipped.push(songs[index].title + '（無影片）'); index++;
  }
  if (index >= songs.length) {
    pendingPlay = false;
    $('continuousStatus').textContent = (skipped.length ? '已跳過 ' + skipped.join('、') + '；' : '') + '歌單播放完畢';
    return;
  }
  selectSong(index, true, true);
  $('continuousStatus').textContent = skipped.length ? '已跳過 ' + skipped.join('、') : '接續播放：' + songs[index].title;
}
function mountPlayer(song, token) {
  const source = playbackSource(song);
  if (!source || !window.YT?.Player || token !== generation || player) return;
  player = new YT.Player('player', {
    videoId:source.videoId, width:'100%', height:'100%',
    playerVars:{playsinline:1, origin:location.origin, rel:0, start:Math.floor(bounds().start), ...(bounds().end === null ? {} : {end:Math.floor(bounds().end)})},
    events:{
      onReady:event => {
        if(token !== generation) return;
        player = event.target; ready = true; clearTimeout(loadTimer); $('transport').disabled = false;
        $('retry').hidden = true;
        $('status').textContent = `${source.kind} · ${source.title || song.title}`;
        $('speed').replaceChildren(...player.getAvailablePlaybackRates().map(rate => { const o = document.createElement('option'); o.value = rate; o.textContent = `${rate}×`; return o; }));
        $('speed').value = String(player.getPlaybackRate());
        if (player.getAvailablePlaybackRates().includes(preferences.speed)) player.setPlaybackRate(preferences.speed);
        if (pendingPlay && $('continuous').checked) player.playVideo();
        pendingPlay = false;
        updateChant();
      },
      onStateChange:event => { if(token !== generation) return; if(event.data === 1 && (bounds().end === null || player.getCurrentTime() < bounds().end)) segmentEnded = false; $('play').textContent = event.data === 1 ? '暫停' : '播放'; updateChant(); if(event.data === 0) finishSegment(); },
      onPlaybackRateChange:event => { if(token === generation) $('speed').value = String(event.data); },
      onError:() => { if(token === generation) {clearTimeout(loadTimer); fail('影片無法在這裡播放，請用上方連結開啟原影片。'); advance(song.title + '（播放失敗）');} },
      onAutoplayBlocked:() => { if(token === generation) $('status').textContent = '自動播放被瀏覽器阻擋，請點一下播放以繼續。'; }
    }
  });
}
function selectSong(index, updateHash = true, autoplay = null, sourceIndex = 0) {
  if(!Number.isInteger(index) || index < 0 || index >= songs.length) return;
  pendingPlay = autoplay === null ? ($('continuous').checked && ready && player?.getPlayerState() === 1) : autoplay;
  $('continuousStatus').textContent = '';
  selected = index; const song = songs[index]; const token = ++generation;
  selectedSource = song.sources[sourceIndex]?.videoId ? sourceIndex : Math.max(0, song.sources.findIndex(source => source.videoId));
  $('sourceButtons').replaceChildren();
  song.sources.forEach((source, i) => {
    if (!source.videoId) return;
    const button = document.createElement('button');
    button.type = 'button'; button.dataset.source = i; button.textContent = source.kind;
    button.setAttribute('aria-pressed', String(i === selectedSource));
    button.onclick = () => {
      if (i === selectedSource) return;
      selectSong(selected, true, false, i);
      [...$('sourceButtons').children].find(item => Number(item.dataset.source) === i)?.focus();
    };
    $('sourceButtons').append(button);
  });
  $('sourceChoice').hidden = !song.sources.some(source => source.videoId);
  cueTarget = null; loopTarget = null; $('loopCue').checked = false; $('retry').hidden = true;
  segmentEnded = false;
  ready = false; clearTimeout(loadTimer); if(player) {player.destroy(); player = null;}
  $('videoContainer').replaceChildren(Object.assign(document.createElement('div'),{id:'player'}), $('subtitleDisplay'), $('exitVideoFullscreen'));
  $('transport').disabled = true; $('play').textContent = '播放'; $('clock').textContent = '0:00 / 0:00'; $('seek').value = 0;
  $('speed').replaceChildren(Object.assign(document.createElement('option'),{value:'1',textContent:'1×'}));
  $('songTitle').textContent = song.title; document.title = `${song.title} · RESCENE 應援練習室`;
  $('songMeta').textContent = `${String(index + 1).padStart(2,'0')} / ${song.artist} · ${song.section}`;
  $('version').textContent = `${String(index + 1).padStart(2,'0')} / ${song.section} · ${song.artist} — ${song.note}`;
  $('songSelect').value = index; $('previous').disabled = index === 0; $('next').disabled = index === songs.length - 1;
  sourcesInto($('currentSources'),song);
  document.querySelectorAll('[data-song]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.song) === index)));
  renderCatalog();
  const source = playbackSource(song);
  const external = song.sources[0];
  $('videoContainer').hidden = !source; $('transport').hidden = !source; $('externalNote').hidden = !!source;
  $('externalNote').textContent = external ? '請開啟參考來源觀看本首應援。' : '本首應援來源待補。';
  $('status').textContent = source ? '正在載入影片…' : external ? '參考連結列於下方' : '尚無可播放的應援來源';
  renderKtv();
  updateChant();
  if(source) {
    mountPlayer(song,token);
    loadTimer = setTimeout(() => { if(token === generation && !ready) fail('影片載入較久，可從「本首來源與版本說明」開啟原影片。'); },15000);
  }
  if(updateHash) history.replaceState(null,'',`#${encodeURIComponent(song.slug)}`);
  if(!source && pendingPlay) advance(song.title + '（無影片）');
}
function fromHash() {
  if (location.hash === '#practice' && songs.length && player) return;
  // Freeze the old public links: display numbers and catalog order may change.
  const legacySlugs = ['love-attack','runaway','deja-vu','pinball','pretty-girl','uhuh','glow-up','heart-drop','bloom','yoyo','busy-boy'];
  let slug;
  try { slug = decodeURIComponent(location.hash.slice(1)).toLowerCase(); } catch { slug = ''; }
  const [songSlug, sourceSlug] = slug.split('/');
  slug = songSlug;
  const legacy = /^song-(\d+)$/.exec(slug);
  if (legacy) slug = legacySlugs[Number(legacy[1]) - 1];
  const index = songs.findIndex(song => song.slug === slug);
  const sourceIndex = index >= 0 && sourceSlug ? songs[index].sources.findIndex(source => source.slug === sourceSlug) : 0;
  selectSong(index < 0 ? 0 : index, index >= 0, null, sourceIndex);
}
$('continuous').onchange = () => { pendingPlay = false; updateContinuousStatus(); };
$('ktvFollow').onclick = () => { setKtvFollow(!ktvFollow); updateKtv(); };
$('ktvList').onwheel = $('ktvList').ontouchstart = () => setKtvFollow(false);
$('ktvList').onpointerdown = event => { if (event.target === $('ktvList')) setKtvFollow(false); };
$('ktvList').onkeydown = event => { if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key)) setKtvFollow(false); };
$('subtitleFullscreen').hidden = !(document.fullscreenEnabled && $('videoContainer').requestFullscreen);
$('subtitleFullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement === $('videoContainer')) await document.exitFullscreen();
    else await $('videoContainer').requestFullscreen();
  } catch { $('status').textContent = '此瀏覽器無法切換含字幕全螢幕，可使用專注練習。'; }
};
$('exitVideoFullscreen').onclick = async () => {
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch { /* Browser exit controls remain available. */ }
  }
};
$('chantSize').value = ['1','1.25','1.5'].includes(preferences.size) ? preferences.size : '1';
$('subtitleDisplay').style.setProperty('--scale', $('chantSize').value);
$('ktvPanel').style.setProperty('--scale', $('chantSize').value);
$('wordingMode').value = ['both','phonetic','original'].includes(preferences.wording) ? preferences.wording : 'both';
$('wordingMode').onchange = () => { preferences.wording = $('wordingMode').value; savePreferences(); renderKtv(); updateKtv(); };
$('chantSize').onchange = () => {preferences.size = $('chantSize').value; $('ktvPanel').style.setProperty('--scale', preferences.size); $('subtitleDisplay').style.setProperty('--scale', preferences.size); savePreferences();};
$('focusMode').onclick = () => {const focused = document.body.classList.toggle('focus'); $('focusMode').setAttribute('aria-pressed', String(focused)); $('focusMode').textContent = focused ? '↙ 還原版面' : '↗ 放大練習區'; $('songTitle').scrollIntoView({block:'start'});};
window.addEventListener('keydown', event => {if (event.key === 'Escape' && document.body.classList.contains('focus')) $('focusMode').click();});
$('search').oninput = renderCatalog;
document.querySelectorAll('[data-filter]').forEach(button => {button.onclick = () => {catalogFilter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); renderCatalog();};});
$('previousCue').onclick = () => jumpToCue(currentCueIndex() - 1);
$('nextCue').onclick = () => jumpToCue(currentCueIndex() + 1);
$('repeatCue').onclick = () => jumpToCue(currentCueIndex(), true);
$('loopCue').onchange = () => {loopTarget = $('loopCue').checked ? currentCueIndex() : null; updateContinuousStatus();};
$('retry').onclick = () => {if (window.YT?.Player) selectSong(selected, false, false, selectedSource); else location.reload();};
$('previous').onclick = () => selectSong(selected-1);
$('next').onclick = () => selectSong(selected+1);
$('songSelect').onchange = () => selectSong(Number($('songSelect').value));
function seek(time) {
  const {start,end} = bounds();
  segmentEnded = false;
  player.seekTo(Math.max(end === null ? 0 : start, Math.min(end ?? Infinity,time)),true);
  updateChant();
}
$('play').onclick = () => {if(ready) { if(player.getPlayerState() === 1) player.pauseVideo(); else {if(segmentEnded || (bounds().end !== null && player.getCurrentTime() >= bounds().end)) seek(bounds().start); player.playVideo();} }};
function manualSeek(time) { cueTarget = null; loopTarget = null; $('loopCue').checked = false; updateContinuousStatus(); seek(time); }
$('back').onclick = () => {if(ready) manualSeek(player.getCurrentTime()-5);};
$('seek').oninput = () => {if(ready) manualSeek(Number($('seek').value));};
$('speed').onchange = () => {if(ready) { preferences.speed = Number($('speed').value); savePreferences(); player.setPlaybackRate(preferences.speed); }};
window.addEventListener('hashchange',fromHash);
window.onYouTubeIframeAPIReady = () => {if(songs.length) mountPlayer(songs[selected],generation);};
fetch('songs.json?v=20261114-love-live-v1').then(response => {if(!response.ok) throw new Error('catalog'); return response.json();}).then(data => {
  const firstSlugs = ['with', 'inside-out'];
  songs = [...firstSlugs.flatMap(slug => data.filter(song => song.slug === slug)),
    ...data.filter(song => !firstSlugs.includes(song.slug))];
  songs.forEach((song,index) => {
    const option = document.createElement('option'); option.value = index; option.textContent = `${String(index + 1).padStart(2,'0')} · ${song.title}`; $('songSelect').append(option);
  });
  $('songSelect').disabled = false;fromHash();
}).catch(() => fail('曲目資料載入失敗，請重新整理頁面。'));
setInterval(() => {
  updateChant();
  if(!ready) return; const t = player.getCurrentTime(),duration = bounds().end ?? player.getDuration();
  const loopingCue = practiceCues()[loopTarget];
  if (player.getPlayerState() === 1 && $('loopCue').checked && loopingCue && t >= loopingCue.end) { repeatLoop(); return; }
  if (cueTarget !== null && t >= practiceCues()[cueTarget]?.end && !$('loopCue').checked) cueTarget = null;
  if(bounds().end !== null && t >= bounds().end && !segmentEnded) {player.pauseVideo(); finishSegment(); return;}
  $('clock').textContent = `${format(t)} / ${format(duration)}`;
  $('seek').min = bounds().end === null ? 0 : bounds().start;
  $('seek').max = duration || 1;if(document.activeElement !== $('seek')) $('seek').value = t;
},150);
const api = document.createElement('script');api.src = 'https://www.youtube.com/iframe_api';
api.onerror = () => fail('無法連線至 YouTube，仍可使用各首來源連結。');document.head.append(api);
