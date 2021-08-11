/* 
onClick2(
  'Cube', 
  (event, data)=>{
    console.log(data.object, data.point, data.normal)
  },
  ()=>{ }
);

 */

import {
  retrieveObjectNames,
  objectsIncludeObj,
  getPickedObjectName,
  initObjectPicking2
} from '../util/util'

import { _pGlob } from "../verge";

export function onClick2( objSelector, cbDo, cbIfMissedDo ) {
  // 其它参数
  const xRay = false;
  const doubleClick = false;
  const mouseDownUseTouchStart = false;
  const mouseButtons = [ 0, 1, 2 ];
  const delay = 0.2;

  // mouseButtons = mouseButtons.split( ',' ).filter( item => item.length != 0 ).map( item => Number( item ) );

  // for AR/VR
  _pGlob.objClickInfo = _pGlob.objClickInfo || [];

  _pGlob.objClickInfo.push( {
    objSelector: objSelector,
    callbacks: [ cbDo, cbIfMissedDo ]
  } );

  initObjectPicking2( function ( intersects, event ) {
    var isPicked = false;
    var maxIntersects = xRay ? intersects.length : Math.min( 1, intersects.length );
    // 在cbdo回调中返回的数据
    const data = {};
    for ( var i = 0;i < maxIntersects;i++ ) {
      var obj = intersects[ i ].object;
      var objName = getPickedObjectName( obj );
      var objNames = retrieveObjectNames( objSelector );
      // save the point and normal for the pickedObject2 block
      data.point = intersects[ i ].point;
      data.normal = intersects[ i ].face ? intersects[ i ].face.normal : null;

      if ( objectsIncludeObj( objNames, objName ) ) {
        // save the object for the pickedObject block
        data.object = objName;
        isPicked = true;
        cbDo( event, data );
      }
    }
    if ( !isPicked ) {
      data.object = '';
      cbIfMissedDo( event );
    }
  }, doubleClick ? 'dblclick' : 'mouseup', mouseDownUseTouchStart, mouseButtons, delay );
}

