/* 
onHover事件
参数：
objSelector - 指针经过的物体名称
xRay - 是否使用x-ray
cbOver - 指针经过时的回调函数
cbOut - 指针离开时的回调函数

_pGlob.hoveredObject 经过的物体名称

onHover(
  '<none>', 
  false,
   function(event, currHovered) {}, 
   function() {}
);
*/
import { _pGlob } from "../verge";
import {
  retrieveObjectNames,
  objectsIncludeObj,
  getPickedObjectName,
  initObjectPicking
} from '../util/util'

function onHover( objSelector, xRay, cbOver, cbOut ) {
  initObjectPicking( function ( intersects, event ) {
    var prevHovered = _pGlob.hoveredObject;
    var currHovered = '';

    // the event might happen before hover registration
    _pGlob.objHoverInfo = _pGlob.objHoverInfo || [];

    // search for closest hovered object

    var lastIntersectIndex = Infinity;
    _pGlob.objHoverInfo.forEach( function ( el ) {
      var maxIntersects = el.xRay ? intersects.length : Math.min( 1, intersects.length );

      for ( var i = 0;i < maxIntersects;i++ ) {

        var obj = intersects[ i ].object;
        var objName = getPickedObjectName( obj );

        if ( objectsIncludeObj( retrieveObjectNames( el.objSelector ), objName ) && i <= lastIntersectIndex ) {
          currHovered = objName;
          lastIntersectIndex = i;
        }
      }
    } );

    if ( prevHovered == currHovered ) return;

    // first - all "out" callbacks, then - all "over"
    _pGlob.objHoverInfo.forEach( function ( el ) {
      if ( objectsIncludeObj( retrieveObjectNames( el.objSelector ), prevHovered ) ) {
        // ensure the correct value of the hoveredObject block
        _pGlob.hoveredObject = prevHovered;
        el.callbacks[ 1 ]( event );
      }
    } );

    _pGlob.objHoverInfo.forEach( function ( el ) {
      if ( objectsIncludeObj( retrieveObjectNames( el.objSelector ), currHovered ) ) {
        // ensure the correct value of the hoveredObject block
        _pGlob.hoveredObject = currHovered;
        el.callbacks[ 0 ]( event, currHovered );
      }
    } );

    _pGlob.hoveredObject = currHovered;
  }, 'mousemove', false );

  _pGlob.objHoverInfo = _pGlob.objHoverInfo || [];

  _pGlob.objHoverInfo.push( {
    objSelector: objSelector,
    callbacks: [ cbOver, cbOut ],
    xRay: xRay
  } );
}

export {
  onHover
}
