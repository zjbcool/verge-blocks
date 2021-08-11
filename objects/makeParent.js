
/* 参数：
objName - 子物体
targetObjName - 父物体
makeParent('<none>', '<none>'); 
将子物体P到父物体，保持子物体的变换
parentObjTo( obj, targetObj );
*/
import { getObjectByName } from '../util/util'
import { Matrix4 } from '../v3d.module'

// makeParent puzzle
function makeParent( objName, targetObjName ) {
  if ( !objName )
    return;
  var obj = getObjectByName( objName );
  if ( !obj )
    return;
  if ( targetObjName ) {
    var targetObj = getObjectByName( targetObjName );
    if ( !targetObj )
      return;
  } else {
    obj.traverseAncestors( function ( ancObj ) {
      if ( ancObj.type == "Scene" )
        targetObj = ancObj;
    } );
  }
  parentObjTo( obj, targetObj );
}

function parentObjTo( obj, targetObj ) {
  var matOffset = new Matrix4();
  matOffset.copy( targetObj.matrixWorld ).invert();
  matOffset.multiply( obj.matrixWorld );
  matOffset.decompose( obj.position, obj.quaternion, obj.scale );
  targetObj.add( obj );

  obj.updateMatrixWorld( true );
}

export { makeParent, parentObjTo }


