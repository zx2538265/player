'use strict';
const $ = id => document.getElementById(id);
let pendingPlay = false;
let segmentEnded = false;
let cueTarget = null, loopTarget = null, catalogFilter = 'all';
let preferences = {}, favorites = new Set();
try {
  const stored = JSON.parse(localStorage.getItem('babymonster-practice') || '{}');
  if (stored && typeof stored === 'object') preferences = stored;
  if (Array.isArray(preferences.favorites)) favorites = new Set(preferences.favorites.filter(Number.isInteger));
} catch { /* Storage may be unavailable in private browsing. */ }
function savePreferences() {
  try { localStorage.setItem('babymonster-practice', JSON.stringify({...preferences, favorites:[...favorites]})); } catch {}
}
function updateContinuousStatus() {
  $('continuousStatus').textContent = $('loopCue').checked ? '單句循環中，暫不接續下一首' : $('continuous').checked ? '播完自動接下一首' : '已關閉連續播放';
}
function practiceCues(song = songs[selected]) {
  const source = song?.sources.find(s => s.videoId);
  return typeof Chant !== 'undefined' && Chant.validTrack(song?.chant, source?.videoId) ? song.chant.cues.filter(c =>
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
    const available = practiceCues(song).length > 0;
    if (!(song.title + ' ' + song.artist).toLowerCase().includes(query) ||
      (catalogFilter === 'chant' && !available) || (catalogFilter === 'saved' && !favorites.has(song.number))) return;
    count++;
    const row = document.createElement('article'); row.className = 'song' + (index === selected ? ' selected' : '');
    const pick = document.createElement('button'); pick.className = 'song-pick'; pick.dataset.song = index;
    pick.setAttribute('aria-pressed', String(index === selected));
    const number = document.createElement('span'); number.className = 'number'; number.textContent = String(song.number).padStart(2, '0');
    const info = document.createElement('span'), title = document.createElement('strong'), state = document.createElement('small');
    title.textContent = song.title;
    state.textContent = song.artist + ' · ' + song.section + ' · ' + (available ? '有應援提示' : song.sources.some(s => s.videoId) ? '影片練習' : song.sources.length ? '外部來源' : '來源待補');
    if (available) state.className = 'badge';
    info.append(title, state); pick.append(number, info);
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
  const source = songs[selected]?.sources.find(s => s.videoId);
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
function updateChant() {
  const song = songs[selected], source = song?.sources.find(s => s.videoId), track = song?.chant;
  const available = typeof Chant !== 'undefined' && Chant.validTrack(track, source?.videoId);
  $('chantEnabled').disabled = !available;
  $('chantUnavailable').hidden = available;
  updatePracticeControls();
  const note = available ? track.note : '本首尚未建立逐句應援提示，可先跟著來源影片練習。';
  if ($('chantNote').textContent !== note) $('chantNote').textContent = note;
  $('chantDisplay').hidden = !available || !$('chantEnabled').checked;
  if (!available) return;
  const view = ready ? Chant.state(track, player.getCurrentTime(), segmentEnded ? 0 : player.getPlayerState(), player.getPlaybackRate()) :
    {mode:'paused',label:'等待影片就緒',text:track.cues[0].text,next:'',count:''};
  $('chantDisplay').dataset.mode = view.mode;
  for (const [id, value] of [['chantLabel',view.label],['chantText',view.text],['chantNext',view.next],['chantCount',view.count]]) {
    if ($(id).textContent !== value) $(id).textContent = value;
  }
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
  const source = song.sources.find(s => s.videoId);
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
function selectSong(index, updateHash = true, autoplay = null) {
  if(!Number.isInteger(index) || index < 0 || index >= songs.length) return;
  pendingPlay = autoplay === null ? ($('continuous').checked && ready && player?.getPlayerState() === 1) : autoplay;
  $('continuousStatus').textContent = '';
  selected = index; const song = songs[index]; const token = ++generation;
  cueTarget = null; loopTarget = null; $('loopCue').checked = false; $('retry').hidden = true;
  segmentEnded = false;
  ready = false; clearTimeout(loadTimer); if(player) {player.destroy(); player = null;}
  $('videoContainer').replaceChildren(Object.assign(document.createElement('div'),{id:'player'}));
  $('transport').disabled = true; $('play').textContent = '播放'; $('clock').textContent = '0:00 / 0:00'; $('seek').value = 0;
  $('speed').replaceChildren(Object.assign(document.createElement('option'),{value:'1',textContent:'1×'}));
  $('songTitle').textContent = song.title; document.title = `${song.title} · BABYMONSTER 應援練習室`;
  $('songMeta').textContent = `${String(song.number).padStart(2,'0')} / ${song.artist} · ${song.section}`;
  $('version').textContent = `${String(song.number).padStart(2,'0')} / ${song.section} · ${song.artist} — ${song.note}`;
  $('songSelect').value = index; $('previous').disabled = index === 0; $('next').disabled = index === songs.length - 1;
  sourcesInto($('currentSources'),song);
  document.querySelectorAll('[data-song]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.song) === index)));
  renderCatalog();
  const source = song.sources.find(s => s.videoId);
  const external = song.sources[0];
  $('watchLink').hidden = !external;
  if (external) $('watchLink').href = source ? `https://www.youtube.com/watch?v=${source.videoId}` : external.resolvedUrl || external.url;
  else $('watchLink').removeAttribute('href');
  $('watchLink').textContent = source ? '在 YouTube 開啟 ↗' : '開啟參考來源 ↗';
  $('videoContainer').hidden = !source; $('transport').hidden = !source; $('externalNote').hidden = !!source;
  $('externalNote').textContent = external ? '請開啟參考來源觀看本首應援。' : '本首應援來源待補。';
  $('status').textContent = source ? '正在載入影片…' : external ? '參考連結列於下方' : '尚無可播放的應援來源';
  updateChant();
  if(source) {
    mountPlayer(song,token);
    loadTimer = setTimeout(() => { if(token === generation && !ready) fail('影片載入較久，可用上方連結開啟原影片。'); },15000);
  }
  if(updateHash) history.replaceState(null,'',`#song-${song.number}`);
  if(!source && pendingPlay) advance(song.title + '（無影片）');
}
function fromHash() {
  const match = /^#song-(\d+)$/.exec(location.hash);
  const number = match ? Number(match[1]) : 1;
  selectSong(number >= 1 && number <= songs.length ? number - 1 : 0, false);
}
$('continuous').onchange = () => { pendingPlay = false; updateContinuousStatus(); };
$('chantEnabled').checked = preferences.chantEnabled !== false;
$('chantEnabled').onchange = () => {preferences.chantEnabled = $('chantEnabled').checked; savePreferences(); updateChant();};
$('chantSize').value = ['1','1.25','1.5'].includes(preferences.size) ? preferences.size : '1';
$('chantDisplay').style.setProperty('--scale', $('chantSize').value);
$('chantSize').onchange = () => {preferences.size = $('chantSize').value; $('chantDisplay').style.setProperty('--scale', preferences.size); savePreferences();};
$('focusMode').onclick = () => {const focused = document.body.classList.toggle('focus'); $('focusMode').setAttribute('aria-pressed', String(focused)); $('focusMode').textContent = focused ? '↙ 返回歌單' : '↗ 專注練習'; $('songTitle').scrollIntoView({block:'start'});};
window.addEventListener('keydown', event => {if (event.key === 'Escape' && document.body.classList.contains('focus')) $('focusMode').click();});
$('search').oninput = renderCatalog;
document.querySelectorAll('[data-filter]').forEach(button => {button.onclick = () => {catalogFilter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button))); renderCatalog();};});
$('previousCue').onclick = () => jumpToCue(currentCueIndex() - 1);
$('nextCue').onclick = () => jumpToCue(currentCueIndex() + 1);
$('repeatCue').onclick = () => jumpToCue(currentCueIndex(), true);
$('loopCue').onchange = () => {loopTarget = $('loopCue').checked ? currentCueIndex() : null; updateContinuousStatus();};
$('retry').onclick = () => {if (window.YT?.Player) selectSong(selected, false, false); else location.reload();};
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
fetch('songs.json?v=20260924-practice-ux').then(response => {if(!response.ok) throw new Error('catalog'); return response.json();}).then(data => {
  songs = data;
  songs.forEach((song,index) => {
    const option = document.createElement('option'); option.value = index; option.textContent = `${String(song.number).padStart(2,'0')} · ${song.title} / ${song.artist}`; $('songSelect').append(option);
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
