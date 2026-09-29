'use strict';
// Captions follow the video clock. Highlighting is fixed for the whole cue.
const Subtitles = (() => {
  function validTrack(track, videoId) {
    return !!track && track.videoId === videoId && Array.isArray(track.cues) && track.cues.length > 0 &&
      track.cues.every((cue, i, all) => cue && Number.isFinite(cue.start) && Number.isFinite(cue.end) &&
        cue.start >= 0 && cue.end > cue.start && (i === 0 || cue.start >= all[i - 1].end) &&
        Array.isArray(cue.parts) && cue.parts.length > 0 && cue.parts.every(part =>
          part && typeof part.text === 'string' && part.text.length > 0 && typeof part.chant === 'boolean'));
  }
  function at(track, time, playbackState) {
    if (!Number.isFinite(time) || playbackState === 0) return null;
    return track.cues.find(cue => cue.start <= time && time < cue.end) || null;
  }
  function render(element, cue) {
    const parts = cue?.parts || [];
    const key = JSON.stringify(parts);
    if (element.dataset.caption === key) return;
    element.dataset.caption = key;
    element.replaceChildren(...parts.map(part => {
      const span = document.createElement(part.chant ? 'strong' : 'span');
      span.className = part.chant ? 'subtitle-chant' : 'subtitle-lyric';
      span.textContent = part.text;
      return span;
    }));
  }
  return {validTrack, at, render};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Subtitles;
