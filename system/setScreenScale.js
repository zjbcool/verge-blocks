import { _pGlob } from '../verge'

export function setScreenScale(factor) {
  _pGlob.appInstance.renderer.setPixelRatio(factor);
  // to update possible post-processing passes
  _pGlob.appInstance.onResize();
}
