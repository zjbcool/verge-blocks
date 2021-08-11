/* 当点击目标物体时，吸附当前物体到目标物体表面，需要配合onClick2或onHoverFace使用
参数：
objName - 当前物体名称
data - 包含point和normal
offset - 吸附到目标点的偏移值
e.g
snapToFace('<none>', data, 0); 

*/

import {
  getObjectByName,
  getCoordSystem
} from '../util/util'
import { _pGlob } from "../verge";
import { Vector3, Group } from '../v3d.module'

export function snapToFace( objName, data, offset ) {
  const obj = getObjectByName( objName );
  if ( !obj ) return;
  if ( !data ) return;

  const target = new Vector3().addVectors( data.point, data.normal );
  const offsetNormal = new Vector3().copy( data.normal ).multiplyScalar( offset );

  const empty = new Group();
  _pGlob.appInstance.scene.add( empty );
  empty.add( obj );
  obj.position.set( 0, 0, 0 );

  empty.position.copy( data.point ).add( offsetNormal );
  empty.lookAt( target );
  if ( getCoordSystem() == 'Z_UP_RIGHT' ) {
    obj.rotation.set( Math.PI / 2, 0, 0 );
  }
  empty.updateMatrixWorld( true );
}

