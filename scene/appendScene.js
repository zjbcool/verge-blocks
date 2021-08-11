/* 
appendScene(
  'path/to/scene.gltf', 
  'path/to/scene.gltf', 
  false, 
  false, 
  function() {}, 
  function() {}, 
  function() {}
);
 */
import { _pGlob } from '../verge'

export function appendScene( url, sceneName, loadCameras, loadLights, loadCb, progCb, errorCb ) {
  _pGlob.percentage = 0;

  _pGlob.appInstance.appendScene( url, function ( loadedScene ) {
    loadedScene.name = sceneName;
    _pGlob.percentage = 100;
    loadCb();
  }, function ( percentage ) {
    _pGlob.percentage = percentage;
    progCb();
  }, errorCb, loadCameras, loadLights );
}
