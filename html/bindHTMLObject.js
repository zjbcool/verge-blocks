/* 
参数：
 objName - 物体名称
 id - 要绑定的HTML元素的ID
e.g
bindHTMLObject( objName, id )
 */
import { Vector3 } from '../v3d.module'
import { _pGlob } from '../verge'
import { getObjectByName } from '../util/util'

export function bindHTMLObject( objName, id ) {
  var obj = getObjectByName( objName );
  var elem = document.getElementById( id )

  var projected = new Vector3();
  elem.style.top = 0;
  elem.style.left = 0;
  function bindHTMLUpdateCb() {
    var camera = _pGlob.appInstance.getCamera( true );
    camera.updateMatrixWorld();
    obj.getWorldPosition( projected ).project( camera );

    var isBehindCamera = false;
    var farNearCoeff = ( camera.far + camera.near ) / ( camera.far - camera.near );
    if ( camera.isPerspectiveCamera ) {
      isBehindCamera = projected.z > farNearCoeff;
    } else if ( camera.isOrthographicCamera ) {
      isBehindCamera = projected.z < -farNearCoeff;
    }
    if ( isBehindCamera ) {
      // behind the camera, just move the element out of the sight
      projected.x = projected.y = -1e5;
    } else {
      projected.x = ( 0.5 + projected.x / 2 ) * _pGlob.appInstance.container.offsetWidth;
      projected.y = ( 0.5 - projected.y / 2 ) * _pGlob.appInstance.container.offsetHeight;
    }
    elem.style.transform = "translate(" + projected.x + "px, " + projected.y + "px)";
  }
  _pGlob.appInstance.renderCallbacks.push( bindHTMLUpdateCb );
}
