import {
  retrieveObjectNames,
  getObjectByName
} from '../util/util'

import { _pGlob } from "../verge";

/* 
outline('<none>', true) 

*/
export function outline( objSelector, doWhat ) {
  var objNames = retrieveObjectNames( objSelector );

  if ( !_pGlob.appInstance.postprocessing || !_pGlob.appInstance.postprocessing.outlinePass )
    return;
  var outlineArray = _pGlob.appInstance.postprocessing.outlinePass.selectedObjects;

  for ( var i = 0;i < objNames.length;i++ ) {
    var objName = objNames[ i ];
    var obj = getObjectByName( objName );
    if ( !obj )
      continue;
    if ( doWhat ) {
      if ( outlineArray.indexOf( obj ) == -1 )
        outlineArray.push( obj );
    } else {
      var index = outlineArray.indexOf( obj );
      if ( index > -1 )
        outlineArray.splice( index, 1 );
    }
  }
}
