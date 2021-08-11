/* 
tweenCamera puzzle修改
1. 去掉坐标空间转换，使用WebGL坐标系
2. position target参数不支持物体，只支持数组

参数：
position - array 相机位置
target - array 目标点的位置
duration - 单位秒， 运动时长
doSlot - 完成时的回调函数
movementType - 运动类型，0|1 或者 'LINEAR' | 'SPHERICAL'

e.g
tweenCamera( [ 0, 0, 6 ], [ 0, 0, 0 ], 1, function () { }, 0) 
*/

import { _pGlob } from "../verge";

export function tweenCamera(position, target, duration, doSlot, movementType) {
  var camera = _pGlob.appInstance.getCamera();

  if (Array.isArray(position)) {
      var worldPos = _pGlob.vec3Tmp.fromArray(position);
  } else {
    // 保持空白表示相机不运动
      var worldPos = camera.getWorldPosition(_pGlob.vec3Tmp);
  }

  if (Array.isArray(target)) {
      var worldTarget = _pGlob.vec3Tmp2.fromArray(target);
  }

  duration = Math.max(0, duration);

  if (_pGlob.appInstance.controls && _pGlob.appInstance.controls.tween) {
      // orbit and flying cameras
      if (!_pGlob.appInstance.controls.inTween) {
          _pGlob.appInstance.controls.tween(worldPos, worldTarget, duration, doSlot,
                  movementType);
      }
  } else {
      // TODO: static camera, just position it for now
      if (camera.parent) {
          camera.parent.worldToLocal(worldPos);
      }
      camera.position.copy(worldPos);
      camera.lookAt(worldTarget);
      doSlot();
  }
}
