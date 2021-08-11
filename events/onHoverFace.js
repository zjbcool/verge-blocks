/* 
onHover事件
参数：
objSelector - 指针经过的物体名称
xRay - 是否使用x-ray
cbOver - 指针经过时的回调函数
cbOut - 指针离开时的回调函数

onHoverFace(
    ['GROUP','cubes'],
    function (event, data) {
      snapToFace('Circle', data, 0.02);
    },
    function () { }
);
*/
import { _pGlob } from "../verge";
import { Raycaster } from "../v3d.module";
import {
  getObjectByName,
  retrieveObjectNames
} from '../util/util'

export function onHoverFace( objSelector, cbOver, cbOut ) {
  const elem = _pGlob.appInstance.renderer.domElement;
  elem.addEventListener( 'mousemove', pickListener );
  elem.addEventListener( 'touchmove', pickListener );

  var raycaster = new Raycaster();
  function pickListener( event ) {
    // to handle unload in loadScene puzzle
    if ( !_pGlob.appInstance.getCamera() )
      return;
    event.preventDefault();
    var xNorm = 0,
      yNorm = 0;
    const mouseButtons = [ 0, 1, 2 ];
    if ( event instanceof MouseEvent ) {
      if ( mouseButtons && mouseButtons.indexOf( event.button ) == -1 )
        return;
      xNorm = event.offsetX / elem.clientWidth;
      yNorm = event.offsetY / elem.clientHeight;
    } else if ( event instanceof TouchEvent ) {
      var rect = elem.getBoundingClientRect();
      xNorm = ( event.changedTouches[ 0 ].clientX - rect.left ) / rect.width;
      yNorm = ( event.changedTouches[ 0 ].clientY - rect.top ) / rect.height;
    }

    _pGlob.screenCoords.x = xNorm * 2 - 1;
    _pGlob.screenCoords.y = -yNorm * 2 + 1;
    raycaster.setFromCamera( _pGlob.screenCoords, _pGlob.appInstance.getCamera( true ) );

    const objNames = retrieveObjectNames( objSelector );
    const objList = objNames.map( ( name ) => getObjectByName( name ) );
    const data = {};

    var intersects = raycaster.intersectObjects( objList );
    if ( intersects.length > 0 ) {
      data.point = intersects[ 0 ].point;
      data.normal = intersects[ 0 ].face.normal;
      cbOver( event, data );
    } else {
      cbOut( event );
    }
  }
}

