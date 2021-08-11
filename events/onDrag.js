/* 
onDrag( 'PlaneA', false, [ 0, 1, 2 ],
    () => {
      // 开始拖拽
    },
    () => {
      // 拖拽中
    },
    () => {
      // 结束
    }, 'ID' )
 */
import { _pGlob } from "../verge";
import {
  retrieveObjectNames,
  objectsIncludeObj,
  getPickedObjectName,
  initObjectPicking,
  eventGetOffsetCoords,
  eventTouchIdGetFirst,
  eventTouchIdChangedFilter,
  initDragOverInfo,
} from '../util/util'

_pGlob.objDragOverInfoGlobal = [];
_pGlob.objDragOverInfoByBlock = {};

// onDrag puzzle
export function onDrag( objSelector, xRay, mouseButtons, cbStart, cbMove, cbDrop, blockId ) {
  initObjectPicking( function ( intersects, downEvent ) {
    _pGlob.objDragOverInfoGlobal.forEach( function ( el ) {

      if ( downEvent instanceof MouseEvent )
        if ( el.mouseButtons.indexOf( downEvent.button ) == -1 )
          return;
      var maxIntersects = el.xRay ? intersects.length : Math.min( 1, intersects.length );

      for ( var i = 0;i < maxIntersects;i++ ) {
        var obj = intersects[ i ].object;
        var objName = getPickedObjectName( obj );

        if ( objectsIncludeObj( [ el.objName ], objName ) ) {
          el.callback( {
            downEvent: downEvent,
            draggedObjName: objName
          } );
        }

      }

    } );

  }, 'mousedown', true );

  var cb = function ( cbParam ) {
    if ( _pGlob.appInstance.controls ) {
      _pGlob.appInstance.controls.enabled = false;
    }
    if ( !( blockId in _pGlob.objDragOverInfoByBlock ) ) {
      _pGlob.objDragOverInfoByBlock[ blockId ] = initDragOverInfo();
    }
    var info = _pGlob.objDragOverInfoByBlock[ blockId ];
    // NOTE: don't use more than one pointing event, e.g. don't process
    // some events related to multitouch actions
    if ( info.isDowned ) {
      return;
    }

    var touchId = eventTouchIdGetFirst( cbParam.downEvent );
    var coords = eventGetOffsetCoords( cbParam.downEvent, touchId,
      _pGlob.vec2Tmp );

    info.downX = info.prevX = info.currX = coords.x;
    info.downY = info.prevY = info.currY = coords.y;
    info.touchId = touchId;
    info.isDowned = true;
    info.isMoved = false;
    info.draggedObjName = cbParam.draggedObjName;

    cbStart( cbParam.downEvent );

    var elem = _pGlob.appInstance.container;

    var moveCb = function ( e ) {
      if ( !eventTouchIdChangedFilter( e, info.touchId ) ) {
        // don't handle events not intended for this particular touch
        return;
      }

      var coords = eventGetOffsetCoords( e, info.touchId, _pGlob.vec2Tmp );
      info.prevX = info.currX;
      info.prevY = info.currY;
      info.currX = coords.x;
      info.currY = coords.y;
      cbMove( e );
      info.isMoved = true;
    }
    var upCb = function ( e ) {
      if ( !eventTouchIdChangedFilter( e, info.touchId ) ) {
        // don't handle events not intended for this particular touch
        return;
      }

      var coords = eventGetOffsetCoords( e, info.touchId, _pGlob.vec2Tmp );
      info.currX = coords.x;
      info.currY = coords.y;
      info.prevX = info.currX;
      info.prevY = info.currY;
      cbDrop( e );
      info.isDowned = false;

      elem.removeEventListener( 'mousemove', moveCb );
      elem.removeEventListener( 'touchmove', moveCb );
      elem.removeEventListener( 'mouseup', upCb );
      elem.removeEventListener( 'touchend', upCb );
      if ( _pGlob.appInstance.controls ) {
        _pGlob.appInstance.controls.enabled = true;
      }
    }

    elem.addEventListener( 'mousemove', moveCb );
    elem.addEventListener( 'touchmove', moveCb );
    elem.addEventListener( 'mouseup', upCb );
    elem.addEventListener( 'touchend', upCb );
  }

  var objNames = retrieveObjectNames( objSelector );

  for ( var i = 0;i < objNames.length;i++ ) {
    var objName = objNames[ i ];
    _pGlob.objDragOverInfoGlobal.push( {
      objName: objName,
      callback: cb,
      xRay: xRay,
      mouseButtons: mouseButtons
    } );
  }
}

