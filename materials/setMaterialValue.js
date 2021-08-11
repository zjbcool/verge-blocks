import { _pGlob } from "../verge";
import { SceneUtils } from '../v3d.module'

function matGetValues( matName ) {
  var mat = SceneUtils.getMaterialByName( _pGlob.appInstance, matName );
  if ( !mat )
    return [];

  if ( mat.isMeshNodeMaterial )
    return Object.keys( mat.nodeValueMap );
  else if ( mat.isMeshStandardMaterial )
    return [ 'metalness', 'roughness', 'bumpScale', 'emissiveIntensity', 'envMapIntensity' ];
  else
    return [];
}

function setMaterialValue( matName, valName, value ) {

  var values = matGetValues( matName );
  if ( values.indexOf( valName ) < 0 )
    return;

  var mats = SceneUtils.getMaterialsByName( _pGlob.appInstance, matName );

  for ( var i = 0;i < mats.length;i++ ) {
    var mat = mats[ i ];

    if ( mat.isMeshNodeMaterial ) {
      var valIdx = mat.nodeValueMap[ valName ];
      mat.nodeValue[ valIdx ] = Number( value );
    } else
      mat[ valName ] = Number( value );

    if ( _pGlob.appInstance.scene !== null ) {
      if ( mat === _pGlob.appInstance.scene.worldMaterial ) {
        _pGlob.appInstance.updateEnvironment( mat );
      }
    }
  }
}

function getMaterialValue(matName, valName) {

  var values = matGetValues(matName);
  if (values.indexOf(valName) < 0)
      return;

  var mats = SceneUtils.getMaterialsByName(_pGlob.appInstance, matName);

  if (mats.length) {
      var mat = mats[0];

      if (mat.isMeshNodeMaterial) {
          var valIdx = mat.nodeValueMap[valName];
          return mat.nodeValue[valIdx];
      } else
          return mat[valName];
  }
}


export {
  getMaterialValue,
  setMaterialValue
}
