import { _pGlob } from "../verge";
import {
  retrieveObjectNames,
  getObjectByName,
} from '../util/util'


// objSelector - 物体名称
// velocity - 速度
// cbStart - 开始运动时回调
// cbMove - 运动时回调
// cbStop - 停止时回调

// whenMoved( '<none>', 0.01, function () { }, function () { }, function () { } );

// whenMoved puzzle
export function whenMoved( objSelector, velocity, cbStart, cbMove, cbStop ) {

  _pGlob.objMovementInfos = _pGlob.objMovementInfos || {};

  function savePreviousCoords( objName, obj, prevIsMoving ) {
    // GC optimization
    if ( _pGlob.objMovementInfos[ objName ] ) {
      var info = _pGlob.objMovementInfos[ objName ];

      info.prevPosX = obj.position.x;
      info.prevPosY = obj.position.y;
      info.prevPosZ = obj.position.z;
      info.prevRotX = obj.rotation.x;
      info.prevRotY = obj.rotation.y;
      info.prevRotZ = obj.rotation.z;
      info.prevScaX = obj.scale.x;
      info.prevScaY = obj.scale.y;
      info.prevScaZ = obj.scale.z;
      info.prevIsMoving = prevIsMoving;
    } else {
      var info = {
        prevPosX: obj.position.x,
        prevPosY: obj.position.y,
        prevPosZ: obj.position.z,
        prevRotX: obj.rotation.x,
        prevRotY: obj.rotation.y,
        prevRotZ: obj.rotation.z,
        prevScaX: obj.scale.x,
        prevScaY: obj.scale.y,
        prevScaZ: obj.scale.z,
        prevIsMoving: prevIsMoving
      };
      _pGlob.objMovementInfos[ objName ] = info;
    }

    return info;
  }

  function checkMoving( objName, obj, elapsed ) {

    var info = _pGlob.objMovementInfos[ objName ] ||
      savePreviousCoords( objName, obj, false );

    var delta = velocity * elapsed;

    var isMoving =
      Math.abs( obj.position.x - info.prevPosX ) > delta ||
      Math.abs( obj.position.y - info.prevPosY ) > delta ||
      Math.abs( obj.position.z - info.prevPosZ ) > delta ||
      Math.abs( obj.rotation.x - info.prevRotX ) > delta ||
      Math.abs( obj.rotation.y - info.prevRotY ) > delta ||
      Math.abs( obj.rotation.z - info.prevRotZ ) > delta ||
      Math.abs( obj.scale.x - info.prevScaX ) > delta ||
      Math.abs( obj.scale.y - info.prevScaY ) > delta ||
      Math.abs( obj.scale.z - info.prevScaZ ) > delta;

    if ( !info.prevIsMoving && isMoving ) {
      cbStart( objName );
      savePreviousCoords( objName, obj, true );
    } else if ( info.prevIsMoving && isMoving ) {
      cbMove( objName );
      savePreviousCoords( objName, obj, true );
    } else if ( info.prevIsMoving && !isMoving ) {
      cbStop( objName );
      savePreviousCoords( objName, obj, false );
    } else {
      savePreviousCoords( objName, obj, false );
    }
  }

  function addToRender( objSelector ) {

    function renderCb( elapsed, timeline ) {

      var objNames = retrieveObjectNames( objSelector );

      for ( var i = 0;i < objNames.length;i++ ) {
        var objName = objNames[ i ];

        var obj = getObjectByName( objName );
        if ( !obj )
          return;

        checkMoving( objName, obj, elapsed );
      }
    }

    _pGlob.appInstance.renderCallbacks.push( renderCb );
    if ( v3d.PL.editorRenderCallbacks )
      v3d.PL.editorRenderCallbacks.push( [ _pGlob.appInstance, renderCb ] );

  }

  addToRender( objSelector );

}
