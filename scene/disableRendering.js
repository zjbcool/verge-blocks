import { _pGlob } from '../verge'

export function disableRendering( enableSSAA ) {
  _pGlob.appInstance.ssaaOnPause = enableSSAA;
  _pGlob.appInstance.disableRendering( 1 );
}
