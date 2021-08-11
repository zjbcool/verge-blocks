// cloneObject('<none>');

import { getObjectByName } from '../util/util'
import { _pGlob } from "../verge";

// cloneObject puzzle
function findUniqueObjectName( name ) {
  function objNameUsed( name ) {
    return Boolean( getObjectByName( name ) );
  }
  while ( objNameUsed( name ) ) {
    var r = name.match( /^(.*?)(\d+)$/ );
    if ( !r ) {
      name += "2";
    } else {
      name = r[ 1 ] + ( parseInt( r[ 2 ], 10 ) + 1 );
    }
  }
  return name;
}
// 修改：返回值从name修改为object
// cloneObject puzzle
export function cloneObject( objName ) {
  if ( !objName )
    return;
  var obj = getObjectByName( objName );
  if ( !obj )
    return;
  var newObj = obj.clone();
  newObj.name = findUniqueObjectName( obj.name );
  _pGlob.appInstance.scene.add( newObj );
  return newObj;
}

