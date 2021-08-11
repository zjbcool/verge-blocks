// 加载音频，需要支持webAudioAPI
import {
  Audio,
  AudioListener
} from "../v3d.module"

export class AudioWebAudio {
  constructor () {
    this.audio = new Audio( new AudioListener() );
    this._muted = false;
    this._volume = 1;
  }
  load( url ) {
    var scope = this;

    var xhr = new XMLHttpRequest()
    xhr.open( 'GET', url );
    xhr.responseType = 'arraybuffer';

    xhr.onload = function ( e ) {
      if ( this.status === 200 ) {
        // new promise-based syntax is not currently supported in Safari
        scope.audio.context.decodeAudioData( this.response, function ( decodedData ) {
          scope.audio.setBuffer( decodedData );
        } );
      }
    }

    xhr.send();
    return this;
  }

  play() {
    if ( this.audio.buffer === null ) return;
    this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    if ( this.audio.buffer === null ) return;
    this.audio.stop();
  }

  rewind() {
    if ( this.audio.buffer === null ) return;

    var isPlaying = this.audio.isPlaying;
    this.audio.stop();
    if ( isPlaying ) {
      this.audio.play();
    }
  }

  setPlaybackTime( time ) {
    // TODO: not easy with WebAudio
  }

  getPlaybackTime() {
    // TODO: not easy with WebAudio
    return 0;
  }

  setPlaybackRate( rate ) {
    this.audio.setPlaybackRate( rate );
  }

  isPlaying() {
    return this.audio.isPlaying;
  }

  setLoop( looped ) {
    this.audio.setLoop( looped );
  }

  setVolume( volume ) {
    this._volume = volume;
    if ( !this._muted ) {
      this.audio.setVolume( volume );
    }
  }

  setMuted( muted ) {
    this._muted = muted;
    this.audio.setVolume( muted ? 0 : this._volume );
  }
}
