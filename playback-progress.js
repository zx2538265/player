(function (root) {
  'use strict';
  // Keep progress independent of subtitle loading and its refresh timer.
  root.createPlaybackProgress = function (getPlayer, showResume, getStorage = () => localStorage) {
    const prefix = 'yt-srt-progress-v1:';
    let videoId = '', played = false, waiting = false, resumeAt = 0;
    function read(id) {
      try {
        const entry = JSON.parse(getStorage().getItem(prefix + id));
        // Saved positions from the original upload use its longer timeline.
        if (id === '1BC-953eVP4' && Number.isFinite(entry?.duration) && entry.duration > 8300 &&
            Number.isFinite(entry.seconds) && entry.seconds >= 0 && entry.seconds < entry.duration) {
          const seconds = entry.seconds - 3098.48;
          return seconds > 0 && seconds < 5144.451 ? seconds : 0;
        }
        return entry && Number.isFinite(entry.seconds) && entry.seconds > 0 &&
          Number.isFinite(entry.duration) && entry.duration > entry.seconds ? entry.seconds : 0;
      } catch { return 0; }
    }
    function clear() {
      try { getStorage().removeItem(prefix + videoId); } catch { /* Playback still works. */ }
    }
    function matches() {
      return videoId && getPlayer()?.getVideoData?.().video_id === videoId;
    }
    function save() {
      if (!played || waiting || !matches()) return;
      const player = getPlayer();
      if (![1, 2, 3].includes(player.getPlayerState())) return;
      const seconds = player.getCurrentTime(), duration = player.getDuration();
      if (!Number.isFinite(seconds) || !Number.isFinite(duration) || duration <= 0 || seconds < 0 || seconds >= duration) return;
      try { getStorage().setItem(prefix + videoId, JSON.stringify({ seconds, duration, updatedAt: Date.now() })); } catch { /* Storage may be blocked or full. */ }
    }
    function detach() {
      save();
      videoId = ''; played = false; waiting = false; resumeAt = 0;
      showResume(null);
    }
    function load(id, startSeconds) {
      videoId = id; played = false;
      resumeAt = startSeconds === undefined ? read(id) : 0;
      waiting = resumeAt > 0;
      showResume(waiting ? resumeAt : null);
      const options = { videoId: id, startSeconds: startSeconds ?? resumeAt, suggestedQuality: 'hd1080' };
      if (waiting) getPlayer().cueVideoById(options);
      else getPlayer().loadVideoById(options);
    }
    function choose(restart) {
      if (!waiting || !videoId) return;
      if (restart) clear();
      waiting = false;
      showResume(null);
      getPlayer().loadVideoById({ videoId, startSeconds: restart ? 0 : resumeAt, suggestedQuality: 'hd1080' });
    }
    function state(value) {
      if (!matches()) return;
      if (value === 1) {
        // The native YouTube play button also accepts the cued resume point.
        waiting = false; played = true; showResume(null);
      } else if (value === 0 && played) {
        clear(); played = false;
      } else if (value === 2) save();
    }
    return { save, detach, load, choose, state };
  };
})(typeof window === 'undefined' ? globalThis : window);
