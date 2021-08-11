import { _pGlob } from '../verge'

export function reloadScene(url, sceneName, loadCb, progCb, errorCb) {

  _pGlob.appInstance.unload();

  // clean object cache
  _pGlob.objCache = {};
  _pGlob.appInstance.loadScene(url, function(loadedScene) {
      _pGlob.appInstance.enableControls();
      loadedScene.name = sceneName;
      loadCb();
  }, function(percentage) {
      progCb(percentage);
  }, errorCb);
}
