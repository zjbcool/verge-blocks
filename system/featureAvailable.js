/* 
e.g
featureAvailable( feature )  'MOBILE'|'IOS'...
 */
import { Detector } from '../v3d.module'
import { _pGlob } from '../verge'

export function featureAvailable( feature ) {
  var userAgent = window.navigator.userAgent;
  var platform = window.navigator.platform;
  switch ( feature ) {
    case 'LINUX':
      return /Linux/.test( platform );
    case 'WINDOWS':
      return [ 'Win32', 'Win64', 'Windows', 'WinCE' ].indexOf( platform ) !== -1;
    case 'MACOS':
      return ( [ 'Macintosh', 'MacIntel', 'MacPPC', 'Mac68K' ].indexOf( platform ) !== -1 && !Detector.checkIOS() );
    case 'IOS':
      return Detector.checkIOS();
    case 'ANDROID':
      return /Android/i.test( userAgent );
    case 'MOBILE':
      return ( /Android|webOS|BlackBerry/i.test( userAgent ) || Detector.checkIOS() );
    case 'CHROME':
      // Chromium based
      return ( !!window.chrome && !/Edge/.test( navigator.userAgent ) );
    case 'FIREFOX':
      return /Firefox/.test( navigator.userAgent );
    case 'IE':
      return /Trident/.test( navigator.userAgent );
    case 'EDGE':
      return /Edge/.test( navigator.userAgent );
    case 'SAFARI':
      return ( /Safari/.test( navigator.userAgent ) && !/Chrome/.test( navigator.userAgent ) );
    case 'TOUCH':
      return !!( ( 'ontouchstart' in window ) || window.DocumentTouch && document instanceof DocumentTouch );
    case 'RETINA':
      return window.devicePixelRatio >= 2;
    case 'HDR':
      return _pGlob.appInstance.useHDR;
    case 'WEBAUDIO':
      return Detector.checkWebAudio();
    case 'WEBGL2':
      var canvas = document.createElement( 'canvas' );
      var gl = canvas.getContext( 'webgl2' )
      return !!gl;
    case 'WOOCOMMERCE':
      var woo_fun = window.parent.v3d_woo_get_product_info || window.parent.parent.v3d_woo_get_product_info;
      return !!woo_fun;
    case 'DO_NOT_TRACK':
      if ( navigator.doNotTrack == '1' || window.doNotTrack == '1' )
        return true;
      else
        return false;
    default:
      return false;
  }
}
