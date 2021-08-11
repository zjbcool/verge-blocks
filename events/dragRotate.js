import { _pGlob } from "../verge";
import {
  getObjectByName,
  retrieveObjectNames,
} from '../util/util'

// 修改：
// 1. 不做坐标转换，使用WebGL坐标系

// 参数：
// objSelector - 要拖拽的物体名称
// mode - 沿轴或平面的拖拽模式 'X'
// isParentSpace
// blockId - 自身id
// parentDragOverBlockId - 父ID，与onDrag ID一致

// dragRotate('objSelector', 'X', true, 'id', 'parentID');


// dragRotate puzzle
export function dragRotate( objSelector, mode, isParentSpace, blockId, parentDragOverBlockId ) {
  var camera = _pGlob.appInstance.getCamera( true );
  if ( !camera )
    return;

  if ( !_pGlob.objDragOverInfoByBlock )
    return;

  var objNames = retrieveObjectNames( objSelector );

  var info = _pGlob.objDragOverInfoByBlock[ parentDragOverBlockId ];
  if ( !info ) return;

  for ( var i = 0;i < objNames.length;i++ ) {
    var obj = getObjectByName( objNames[ i ] );
    if ( !obj ) {
      continue;
    }

    if ( mode == "X" || mode == "Y" || mode == "Z" ) {
      var objPos = obj.getWorldPosition( _pGlob.vec3Tmp );
      objPos.project( camera );

      var objX = ( objPos.x + 1 ) / 2 * _pGlob.appInstance.getWidth();
      var objY = ( -objPos.y + 1 ) / 2 * _pGlob.appInstance.getHeight();
      var vecFrom = _pGlob.vec2Tmp.set( info.prevX - objX, objY - info.prevY );
      var vecTo = _pGlob.vec2Tmp2.set( info.currX - objX, objY - info.currY );


      var axis = _pGlob.vec3Tmp.copy( mode == "X" ? _pGlob.AXIS_X
        : ( mode == "Y" ? _pGlob.AXIS_Y : _pGlob.AXIS_Z ) );

      var quat = _pGlob.quatTmp.setFromAxisAngle( axis, vecTo.angle() - vecFrom.angle() );

      // a rotation axis pointing backwards (i.e. co-directionally
      // aligned with the view vector) should have inverted rotation
      var objToCalcSpace = isParentSpace && obj.parent ? obj.parent : obj;
      axis.applyQuaternion( objToCalcSpace.getWorldQuaternion( _pGlob.quatTmp2 ) );

      var viewVec = camera.getWorldDirection( _pGlob.vec3Tmp2 );
      if ( viewVec.dot( axis ) > 0 ) {
        quat.conjugate();
      }

      if ( isParentSpace ) {
        obj.quaternion.premultiply( quat );
      } else {
        obj.quaternion.multiply( quat );
      }
      obj.updateMatrixWorld( true );
    }
  }
}
