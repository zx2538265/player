"""Local-only MP4 preview using the production ATEEZ UI (not published)."""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'video/ateez-preview';out.mkdir(exist_ok=True)
for name in ['chant.js','practice.js','practice.css','songs.json']:
    shutil.copyfile(ROOT/'ateez'/name,out/name)
html=(ROOT/'ateez/index.html').read_text(encoding='utf-8')
html=html.replace('<script src="practice.js', '<script src="local-player.js" defer></script>\n  <script src="practice.js')
html=html.replace('跟著影片練','本機 MP4 校對預覽（非 YouTube 實播）')
(out/'index.html').write_text(html,encoding='utf-8')
(out/'local-player.js').write_text('''
// Only this ignored preview page uses HTML5 video in place of the iframe API.
window.YT={Player:function(id,options){
 const video=document.createElement('video');video.controls=true;video.playsInline=true;
 video.style.cssText='width:100%;height:100%;object-fit:contain';
 video.src='../'+options.videoId+'/source.mp4';document.getElementById(id).replaceWith(video);
 const api={getCurrentTime:()=>video.currentTime,getDuration:()=>video.duration||0,
  getPlayerState:()=>video.ended?0:video.paused?2:1,getPlaybackRate:()=>video.playbackRate,
  getAvailablePlaybackRates:()=>[.5,.75,1,1.25,1.5,2],setPlaybackRate:r=>video.playbackRate=r,
  seekTo:t=>video.currentTime=t,playVideo:()=>video.play().catch(()=>{}),pauseVideo:()=>video.pause(),
  destroy:()=>{video.pause();video.removeAttribute('src');video.load();video.remove()}};
 video.addEventListener('loadedmetadata',()=>options.events.onReady({target:api}));
 for(const [event,state] of [['play',1],['pause',2],['ended',0],['waiting',3]])video.addEventListener(event,()=>options.events.onStateChange({data:state}));
 video.addEventListener('ratechange',()=>options.events.onPlaybackRateChange({data:video.playbackRate}));
 return api;
}};
''',encoding='utf-8')
print(out/'index.html')
