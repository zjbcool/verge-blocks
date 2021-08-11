import { Vector3 } from "../v3d.module";
import { tweenCamera } from "./tweenCamera";
import { _pGlob } from "../verge";
/* 
自动注视到点击位置，需要与onClick2配合使用
focus(1,1,function(){ },0) 
参数：
distanceFactor - 与点击位置的距离系数
duration - 单位秒， 运动时长
doSlot - 完成时的回调函数
movementType - 运动类型，0|1 或者 'LINEAR' | 'SPHERICAL'
*/

export function focus(distanceFactor, duration, doSlot, movementType) {
  distanceFactor = Math.max( 0, distanceFactor );
  duration = Math.max( 0, duration );
  const pos = new Vector3().addVectors(_pGlob.pickedPoint, _pGlob.pickedNormal.clone().multiplyScalar(distanceFactor))
  tweenCamera( pos.toArray(), _pGlob.pickedPoint.toArray(), duration, doSlot, movementType );
}
