/* 
unloadScene('path/to/scene.gltf');
 */

import { _pGlob } from '../verge'

export function unloadScene(url) {
  if (_pGlob.appInstance.scene) {
      var scene = url === '' ? _pGlob.appInstance.scene : _pGlob.appInstance.scene.getObjectByName(url);
      if (scene) _pGlob.appInstance.unload(scene);

      if (!_pGlob.appInstance.scene) _pGlob.appInstance.renderer.clear();

      // clean object cache
      _pGlob.objCache = {};
  }
}
