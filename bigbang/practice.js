'use strict';
const $ = id => document.getElementById(id);
let pendingPlay = false;
let songs = [], selected = 0, player, ready = false, generation = 0, loadTimer;
const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
function updateChant() {
  const song = songs[selected], source = song?.sources.find(s => s.videoId), track = song?.chant;
  const available = typeof Chant !== 'undefined' && Chant.validTrack(track, source?.videoId);
  $('chantEnabled').disabled = !available;
  const note = available ? track.note : '本首尚未建立逐句應援提示，可先跟著來源影片練習。';
  if ($('chantNote').textContent !== note) $('chantNote').textContent = note;
  $('chantDisplay').hidden = !available || !$('chantEnabled').checked;
  if (!available) return;
  const view = ready ? Chant.state(track, player.getCurrentTime(), player.getPlayerState(), player.getPlaybackRate()) :
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
function fail(message) { ready = false; $('transport').disabled = true; $('status').textContent = message; updateChant(); }
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
  if (!source || !window.YT?.Player || token !== generation) return;
  player = new YT.Player('player', {
    videoId:source.videoId, width:'100%', height:'100%',
    playerVars:{playsinline:1, origin:location.origin, rel:0, start:Number.isFinite(source.startSeconds) && source.startSeconds >= 0 ? Math.floor(source.startSeconds) : 0},
    events:{
      onReady:event => {
        if(token !== generation) return;
        player = event.target; ready = true; clearTimeout(loadTimer); $('transport').disabled = false;
        $('status').textContent = `${source.kind} · ${source.title || song.title}`;
        $('speed').replaceChildren(...player.getAvailablePlaybackRates().map(rate => { const o = document.createElement('option'); o.value = rate; o.textContent = `${rate}×`; return o; }));
        $('speed').value = String(player.getPlaybackRate());
        if (pendingPlay && $('continuous').checked) player.playVideo();
        pendingPlay = false;
        updateChant();
      },
      onStateChange:event => { if(token !== generation) return; $('play').textContent = event.data === 1 ? '暫停' : '播放'; updateChant(); if(event.data === 0) advance(); },
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
  ready = false; clearTimeout(loadTimer); if(player) {player.destroy(); player = null;}
  $('videoContainer').replaceChildren(Object.assign(document.createElement('div'),{id:'player'}));
  $('transport').disabled = true; $('play').textContent = '播放'; $('clock').textContent = '0:00 / 0:00'; $('seek').value = 0;
  $('speed').replaceChildren(Object.assign(document.createElement('option'),{value:'1',textContent:'1×'}));
  $('songTitle').textContent = song.title; document.title = `${song.title} · BIGBANG 應援練習室`;
  $('version').textContent = `${String(song.number).padStart(2,'0')} / ${song.section} · ${song.artist} — ${song.note}`;
  $('songSelect').value = index; $('previous').disabled = index === 0; $('next').disabled = index === songs.length - 1;
  sourcesInto($('currentSources'),song);
  document.querySelectorAll('[data-song]').forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.song) === index)));
  const source = song.sources.find(s => s.videoId);
  const external = song.sources[0];
  $('watchLink').hidden = !external;
  if (external) $('watchLink').href = source ? `https://www.youtube.com/watch?v=${source.videoId}` : external.resolvedUrl || external.url;
  else $('watchLink').removeAttribute('href');
  $('watchLink').textContent = source ? '在 YouTube 開啟 ↗' : '開啟參考來源 ↗';
  $('videoContainer').hidden = !source; $('transport').hidden = !source; $('externalNote').hidden = !!source;
  $('externalNote').textContent = song.hasChant ? '本首應援收錄於 Threads，請開啟原貼文觀看。' : '本首應援來源待補。';
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
$('continuous').onchange = () => { pendingPlay = false; $('continuousStatus').textContent = $('continuous').checked ? '播完自動接下一首' : '已關閉連續播放'; };
$('chantEnabled').onchange = updateChant;
$('previous').onclick = () => selectSong(selected-1);
$('next').onclick = () => selectSong(selected+1);
$('songSelect').onchange = () => selectSong(Number($('songSelect').value));
$('play').onclick = () => {if(ready) player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();};
$('back').onclick = () => {if(ready) player.seekTo(Math.max(0,player.getCurrentTime()-5),true);};
$('seek').oninput = () => {if(ready) player.seekTo(Number($('seek').value),true);};
$('speed').onchange = () => {if(ready) player.setPlaybackRate(Number($('speed').value));};
window.addEventListener('hashchange',fromHash);
window.onYouTubeIframeAPIReady = () => {if(songs.length) mountPlayer(songs[selected],generation);};
fetch('songs.json?v=20260923-chants-78-r3').then(response => {if(!response.ok) throw new Error('catalog'); return response.json();}).then(data => {
  songs = data;
  let group;
  songs.forEach((song,index) => {
    const option = document.createElement('option'); option.value = index; option.textContent = `${String(song.number).padStart(2,'0')} · ${song.title} / ${song.artist}`; $('songSelect').append(option);
    if(group !== song.section) {group = song.section;const h = document.createElement('h3');h.textContent = group;$('songList').append(h);}
    const card = document.createElement('article');card.className = 'song-card';
    const button = document.createElement('button');button.dataset.song = index;button.textContent = `${String(song.number).padStart(2,'0')}  ${song.title}`;button.onclick = () => {selectSong(index);$('songTitle').scrollIntoView({block:'start'});};
    const artist = document.createElement('span');artist.className = 'artist';artist.textContent = song.artist;
    const links = document.createElement('div');links.className = 'source-links';sourcesInto(links,song);
    card.append(button,artist,links);$('songList').append(card);
  });
  $('songSelect').disabled = false;fromHash();
}).catch(() => fail('曲目資料載入失敗，請重新整理頁面。'));
setInterval(() => {
  updateChant();
  if(!ready) return; const t = player.getCurrentTime(),duration = player.getDuration();
  $('clock').textContent = `${format(t)} / ${format(duration)}`;
  $('seek').max = duration || 1;if(document.activeElement !== $('seek')) $('seek').value = t;
},150);
const api = document.createElement('script');api.src = 'https://www.youtube.com/iframe_api';
api.onerror = () => fail('無法連線至 YouTube，仍可使用各首來源連結。');document.head.append(api);
