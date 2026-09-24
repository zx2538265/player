'use strict';
// Pure clock-driven state: seeking, replaying and rate changes need no timers.
const Chant = (() => {
  function validTrack(track, videoId) {
    return !!track && track.videoId === videoId && Array.isArray(track.cues) && track.cues.length > 0 &&
      track.cues.every((cue, i, all) => cue && Number.isFinite(cue.start) && Number.isFinite(cue.end) &&
        cue.start >= 0 && cue.end > cue.start && typeof cue.text === 'string' && cue.text.trim() &&
        (i === 0 || cue.start >= all[i - 1].end));
  }
  function state(track, time, playbackState, rate = 1) {
    const current = track.cues.find(c => c.start <= time && time < c.end);
    const next = track.cues.find(c => c.start > time);
    const previous = track.cues.filter(c => c.end <= time).at(-1);
    const playing = playbackState === 1;
    const remaining = next ? (next.start - time) / (Number.isFinite(rate) && rate > 0 ? rate : 1) : Infinity;
    const shortGap = !current && previous && next && next.start - previous.end <= 1.5;
    const countdown = !current && !shortGap && remaining <= 3 ? Math.ceil(remaining) : null;
    if (playbackState === 0) return {mode:'ended', label:'本首練習結束', text:'做得好！', next:'', count:''};
    const label = playing ? current ? '現在喊！' : shortGap ? '準備接下一句' : countdown ? '準備進場' : next ? '先聽音樂，準備下一句' : '本首應援已結束' :
      playbackState === 3 ? '影片緩衝中' : playbackState === 2 ? '已暫停' : '按播放開始練習';
    return {mode:playing ? current ? 'active' : shortGap ? 'gap' : countdown ? 'countdown' : 'waiting' : 'paused', label,
      text:current?.text || next?.text || '做得好！',
      next:current && next ? `下一句：${next.text}` : '',
      count:playing && countdown ? String(countdown) : ''};
  }
  return {validTrack, state};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Chant;
