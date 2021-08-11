
import { retrieveObjectNames, getObjectByName, acquireUniqueName, matNameUsed } from '../util/util'
import { SceneUtils } from '../v3d.module'
import { _pGlob } from '../verge'
/* 
assignMat(["GROUP", "groupName"], "matName");
assignMat("objName", "matName");
 */

export function assignMat( objNames, matName ) {
  objNames = retrieveObjectNames( objNames );
  if ( !objNames || !matName )
    return;
  var mat = SceneUtils.getMaterialByName( _pGlob.appInstance, matName );
  if ( !mat )
    return;
  for ( var i = 0;i < objNames.length;i++ ) {
    var objName = objNames[ i ];
    if ( !objName )
      continue;
    var obj = getObjectByName( objName );
    if ( obj ) {
      var firstSubmesh = obj.resolveMultiMaterial()[ 0 ];
      if ( firstSubmesh.isSkinnedMesh ) {
        var newMat = mat.clone();
        newMat.name = acquireUniqueName( mat.name, function ( name ) {
          return !matNameUsed( name );
        } );
        newMat.skinning = true;
        firstSubmesh.material = newMat;
        _pGlob.appInstance.materials.push( newMat );
      } else {
        firstSubmesh.material = mat;
      }

      _pGlob.appInstance.updateMaterials();
    }
  }
}
