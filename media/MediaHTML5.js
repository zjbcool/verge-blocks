// 加载音乐和视频
export class MediaHTML5 {
  constructor ( isVideo ) {
    this.source = null;
  }
  load( url, isVideo ) {
    if ( isVideo ) {
      this.source = document.createElement( 'video' );
      this.source.playsInline = true;
      this.source.preload = 'auto';
      this.source.autoload = true;
      this.source.crossOrigin = 'anonymous';
    } else {
      this.source = document.createElement( 'audio' );
    }

    this.source.src = url;
    return this;
  }

  play() {
    this.source.play();
  }

  pause() {
    this.source.pause();
  }

  stop() {
    this.source.pause();
    this.source.currentTime = 0;
  }

  rewind() {
    this.source.currentTime = 0;
  }

  setPlaybackTime( time ) {
    this.source.currentTime = time
  }

  getPlaybackTime() {
    return this.source.currentTime;
  }

  setPlaybackRate( rate ) {
    this.source.playbackRate = rate;
  }

  isPlaying() {
    return this.source.duration > 0 && !this.source.paused;
  }

  setLoop( looped ) {
    this.source.loop = looped;
  }

  setVolume( volume ) {
    this.source.volume = volume;
  }

  setMuted( muted ) {
    this.source.muted = muted;
  }
}
