/* 
当点击目标物体时，使相机传送到目标位置

teleport( {
    gazeLevel: 1.8,
    movementType: 'LINEAR',
    seconds: 1,
    doSlot: function () { }
} );

参数：
gazeLevel - 相机的垂直高度；
movementType - 运动类型，'LINEAR' 或 'SPHERICAL'；
seconds - 运动时长，单位为秒；
doSlot -运动结束的回调。 
*/

import { _pGlob } from "../verge";
import {
    Vector2,
    Vector3,
    Raycaster
} from '../v3d.module'

export function teleport( prop ) {
    const { gazeLevel, movementType, seconds, doSlot } = prop
    let worldPos, worldTarget;
    if ( !_pGlob.pickedPoint ) {
        return;
    }
    worldPos = new Vector3().copy( _pGlob.pickedPoint );
    worldPos.setY( gazeLevel );

    var camDir = getCameraDirection2( true, false );
    worldTarget = new Vector3().addVectors( worldPos, camDir );

    const duration = Math.max( 0, seconds );

    if ( _pGlob.appInstance.controls && _pGlob.appInstance.controls.tween ) {
        // orbit and flying cameras
        if ( !_pGlob.appInstance.controls.inTween ) {
            _pGlob.appInstance.controls.tween( worldPos, worldTarget, duration, doSlot, movementType == 'LINEAR' ? 0 : 1 );
        }
    } else {
        // TODO: static camera, just position it for now
        if ( _pGlob.appInstance.camera.parent ) {
            _pGlob.appInstance.camera.parent.worldToLocal( worldPos );
        }
        _pGlob.appInstance.camera.position.copy( worldPos );
        _pGlob.appInstance.camera.lookAt( worldTarget );
        doSlot();
    }
    /* 
    
     */
    function initGetCameraDirection( currObjNames, acc ) {
        var coordsCallback = function ( event ) {
            event.preventDefault();

            var xNorm = 0, yNorm = 0;
            if ( event instanceof MouseEvent ) {
                xNorm = event.offsetX / elem.clientWidth;
                yNorm = event.offsetY / elem.clientHeight;
            } else if ( event instanceof TouchEvent ) {
                var rect = elem.getBoundingClientRect();
                xNorm = ( event.changedTouches[ 0 ].clientX - rect.left ) / rect.width;
                yNorm = ( event.changedTouches[ 0 ].clientY - rect.top ) / rect.height;
            }

            _pGlob.screenCoords.x = xNorm * 2 - 1;
            _pGlob.screenCoords.y = -yNorm * 2 + 1;
        }

        var elem = _pGlob.appInstance.container;
        elem.addEventListener( 'mousemove', coordsCallback );
        elem.addEventListener( 'mousedown', coordsCallback );
        elem.addEventListener( 'mouseup', coordsCallback );
        elem.addEventListener( 'touchstart', coordsCallback );
        elem.addEventListener( 'touchend', coordsCallback );

    }

    initGetCameraDirection();

    // getCameraDirection2 puzzle
    var getCameraDirection2 = function () {
        var coords = new Vector2();
        var raycaster = new Raycaster();
        var vec = new Vector3();
        return function getCameraDirection2( useMouseTouch, inverted ) {
            var camera = _pGlob.appInstance.camera;
            if ( useMouseTouch ) {

                if ( inverted ) {
                    coords.x = -_pGlob.screenCoords.x;
                    coords.y = -_pGlob.screenCoords.y;
                } else {
                    coords.x = _pGlob.screenCoords.x;
                    coords.y = _pGlob.screenCoords.y;
                }

                raycaster.setFromCamera( coords, camera );
                var dir = raycaster.ray.direction;

            } else {
                var dir = camera.getWorldDirection( vec );
            }

            return dir;
        }
    }();

    getCameraDirection2();
}


