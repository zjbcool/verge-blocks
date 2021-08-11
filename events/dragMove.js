import { _pGlob } from "../verge";
import {
    getObjectByName,
    retrieveObjectNames,
    intersectPlaneCSS
} from '../util/util'

/* 
修改：
1. 不做坐标转换，使用WebGL坐标系
参数：
objSelector - 要拖拽的物体名称
mode - 沿轴或平面的拖拽模式 'X'
blockId - 自身id
parentDragOverBlockId - 父ID，与onDrag ID一致

dragMove('objSelector', 'XY', 'id', 'parentID');
 */

_pGlob.dragMoveOrigins = {};

export function dragMove( objSelector, mode, blockId, parentDragOverBlockId ) {
    var camera = _pGlob.appInstance.getCamera();
    if ( !camera )
        return;

    if ( !_pGlob.objDragOverInfoByBlock )
        return;

    var objNames = retrieveObjectNames( objSelector );

    var info = _pGlob.objDragOverInfoByBlock[ parentDragOverBlockId ];
    if ( !info ) return;

    var draggedObj = getObjectByName( info.draggedObjName );
    if ( !draggedObj ) return;

    if ( !( blockId in _pGlob.dragMoveOrigins ) ) {
        _pGlob.dragMoveOrigins[ blockId ] = [];
    }
    var posOrigins = _pGlob.dragMoveOrigins[ blockId ];
    var lenDiff = objNames.length - posOrigins.length;
    for ( var i = 0;i < lenDiff;i++ ) {
        posOrigins.push( new v3d.Vector3() );
    }

    for ( var i = 0;i < objNames.length;i++ ) {
        var obj = getObjectByName( objNames[ i ] );
        if ( !obj ) {
            continue;
        }

        var posOrigin = posOrigins[ i ];

        if ( !info.isMoved ) {
            // the object position before the first move is used as an initial value
            posOrigin.copy( obj.position );
        }

        if ( mode == "X" || mode == "Y" || mode == "Z" ) {
            var axis = mode == "X" ? _pGlob.AXIS_X : ( mode == "Y" ? _pGlob.AXIS_Y : _pGlob.AXIS_Z );
            var coord = mode == "X" ? "x" : ( mode == "Y" ? "y" : "z" );

            var planeNor = camera.getWorldDirection( _pGlob.vec3Tmp );
            planeNor.cross( axis ).cross( axis );
            var plane = _pGlob.planeTmp.setFromNormalAndCoplanarPoint( planeNor, draggedObj.position );

            var p0 = intersectPlaneCSS( plane, info.downX, info.downY, _pGlob.vec3Tmp );
            var p1 = intersectPlaneCSS( plane, info.currX, info.currY, _pGlob.vec3Tmp2 );
            if ( p0 && p1 ) {
                obj.position[ coord ] = posOrigin[ coord ] + p1[ coord ] - p0[ coord ];
            }
        } else if ( mode == "XY" || mode == "XZ" || mode == "YZ" ) {
            var normal = mode == "XY" ? _pGlob.AXIS_Z : ( mode == "XZ" ? _pGlob.AXIS_Y : _pGlob.AXIS_X );
            var coord0 = mode == "XY" ? "x" : ( mode == "XZ" ? "x" : "y" );
            var coord1 = mode == "XY" ? "y" : ( mode == "XZ" ? "z" : "z" );

            var plane = _pGlob.planeTmp.setFromNormalAndCoplanarPoint( normal, draggedObj.position );

            var p0 = intersectPlaneCSS( plane, info.downX, info.downY, _pGlob.vec3Tmp );
            var p1 = intersectPlaneCSS( plane, info.currX, info.currY, _pGlob.vec3Tmp2 );
            if ( p0 && p1 ) {
                obj.position[ coord0 ] = posOrigin[ coord0 ] + p1[ coord0 ] - p0[ coord0 ];
                obj.position[ coord1 ] = posOrigin[ coord1 ] + p1[ coord1 ] - p0[ coord1 ];
            }
        } else if ( mode == "XYZ" ) {
            var planeNor = camera.getWorldDirection( _pGlob.vec3Tmp );
            var plane = _pGlob.planeTmp.setFromNormalAndCoplanarPoint( planeNor, draggedObj.position );

            var p0 = intersectPlaneCSS( plane, info.downX, info.downY, _pGlob.vec3Tmp );
            var p1 = intersectPlaneCSS( plane, info.currX, info.currY, _pGlob.vec3Tmp2 );
            if ( p0 && p1 ) {
                obj.position.addVectors( posOrigin, p1 ).sub( p0 );
            }
        }
        obj.updateMatrixWorld( true );
    }
}




