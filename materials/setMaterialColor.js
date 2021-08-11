import {
  Color,
  SceneUtils
} from "../v3d.module"
import { _pGlob } from "../verge";
import { matGetColors } from '../util/util'


// setMaterialColor
function setMaterialColor( matName, colName, cssCode ) {
  var colors = matGetColors( matName );
  if ( colors.indexOf( colName ) < 0 )
    return;
  let r, g, b;
  if ( cssCode ) {
    var color = new Color( cssCode );
    color.convertSRGBToLinear();
    r = color.r;
    g = color.g;
    b = color.b;
  }

  var mats = SceneUtils.getMaterialsByName( _pGlob.appInstance, matName );

  for ( var i = 0;i < mats.length;i++ ) {
    var mat = mats[ i ];

    if ( mat.isMeshNodeMaterial ) {
      var rgbIdx = mat.nodeRGBMap[ colName ];
      mat.nodeRGB[ rgbIdx ].x = r;
      mat.nodeRGB[ rgbIdx ].y = g;
      mat.nodeRGB[ rgbIdx ].z = b;
    } else {
      mat[ colName ].r = r;
      mat[ colName ].g = g;
      mat[ colName ].b = b;
    }
    mat.needsUpdate = true;

    if ( _pGlob.appInstance.scene !== null ) {
      if ( mat === _pGlob.appInstance.scene.worldMaterial ) {
        _pGlob.appInstance.updateEnvironment( mat );
      }
    }
  }
}

export {
  setMaterialColor
}
// setMaterialColor('cube_material', "Principled BSDF Color", '#ff0000');
