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
    const playing = playbackState === 1;
    const remaining = next ? (next.start - time) / (Number.isFinite(rate) && rate > 0 ? rate : 1) : Infinity;
    const countdown = !current && remaining <= 3 ? Math.ceil(remaining) : null;
    if (playbackState === 0) return {mode:'ended', label:'本首練習結束', text:'做得好！', next:'', count:''};
    const label = playing ? current ? (track.timingBasis === 'caption' ? '本句應援' : '現在喊！') : countdown ? (track.timingBasis === 'caption' ? '準備下一句' : '準備進場') : next ? '先聽音樂，準備下一句' : '本首應援已結束' :
      playbackState === 3 ? '影片緩衝中' : playbackState === 2 ? '已暫停' : '按播放開始練習';
    return {mode:playing ? current ? 'active' : countdown ? 'countdown' : 'waiting' : 'paused', label,
      text:current?.text || next?.text || '做得好！',
      next:current && next ? `下一句：${next.text}` : '',
      count:playing && countdown ? String(countdown) : ''};
  }
  return {validTrack, state};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Chant;
