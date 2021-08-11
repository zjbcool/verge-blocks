import { _pGlob } from "../verge";
import {
  Raycaster,
  SceneUtils,
  Texture,
  DataTexture,
  VideoTexture,
} from '../v3d.module'

// utility function envoked by almost all V3D-specific puzzles
// filter off some non-mesh types
function notIgnoredObj( obj ) {
  return obj.type !== 'AmbientLight' &&
    obj.name !== '' &&
    !( obj.isMesh && obj.isMaterialGeneratedMesh ) &&
    !obj.isAuxClippingMesh;
}

// utility function envoked by almost all V3D-specific puzzles
// find first occurence of the object by its name
function getObjectByName( objName ) {
  var objFound;
  var runTime = _pGlob !== undefined;
  objFound = runTime ? _pGlob.objCache[ objName ] : null;

  if ( objFound && objFound.name === objName )
    return objFound;

  _pGlob.appInstance.scene.traverse( function ( obj ) {
    if ( !objFound && notIgnoredObj( obj ) && ( obj.name == objName ) ) {
      objFound = obj;
      if ( runTime ) {
        _pGlob.objCache[ objName ] = objFound;
      }
    }
  } );
  return objFound;
}

// utility function envoked by almost all V3D-specific puzzles
// retrieve all objects on the scene
function getAllObjectNames() {
  var objNameList = [];
  _pGlob.appInstance.scene.traverse( function ( obj ) {
    if ( notIgnoredObj( obj ) )
      objNameList.push( obj.name )
  } );
  return objNameList;
}

// utility function envoked by almost all V3D-specific puzzles
// retrieve all objects which belong to the group
function getObjectNamesByGroupName( targetGroupName ) {
  var objNameList = [];
  _pGlob.appInstance.scene.traverse( function ( obj ) {
    if ( notIgnoredObj( obj ) ) {
      var groupNames = obj.groupNames;
      if ( !groupNames )
        return;
      for ( var i = 0;i < groupNames.length;i++ ) {
        var groupName = groupNames[ i ];
        if ( groupName == targetGroupName ) {
          objNameList.push( obj.name );
        }
      }
    }
  } );
  return objNameList;
}

// utility function envoked by almost all V3D-specific puzzles
// process object input, which can be either single obj or array of objects, or a group
function retrieveObjectNames( objNames ) {
  var acc = [];
  retrieveObjectNamesAcc( objNames, acc );
  return acc.filter( function ( name ) {
    return name;
  } );
}

function retrieveObjectNamesAcc( currObjNames, acc ) {
  if ( typeof currObjNames == "string" ) {
    acc.push( currObjNames );
  } else if ( Array.isArray( currObjNames ) && currObjNames[ 0 ] == "GROUP" ) {
    var newObj = getObjectNamesByGroupName( currObjNames[ 1 ] );
    for ( var i = 0;i < newObj.length;i++ )
      acc.push( newObj[ i ] );
  } else if ( Array.isArray( currObjNames ) && currObjNames[ 0 ] == "ALL_OBJECTS" ) {
    var newObj = getAllObjectNames();
    for ( var i = 0;i < newObj.length;i++ )
      acc.push( newObj[ i ] );
  } else if ( Array.isArray( currObjNames ) ) {
    for ( var i = 0;i < currObjNames.length;i++ )
      retrieveObjectNamesAcc( currObjNames[ i ], acc );
  }
}

/**
 * Obtain a unique name from the given one. Names are tested with the given
 * callback function that should return a boolean "unique" flag. If the given
 * "name" is not considered unique, then "name2" is tested for uniqueness, then
 * "name3" and so on...
 */
function acquireUniqueName( name, isUniqueCb ) {
  var uniqueName = name;

  if ( isUniqueCb !== undefined ) {
    while ( !isUniqueCb( uniqueName ) ) {
      var r = uniqueName.match( /^(.*?)(\d+)$/ );
      if ( !r ) {
        uniqueName += "2";
      } else {
        uniqueName = r[ 1 ] + ( parseInt( r[ 2 ], 10 ) + 1 );
      }
    }
  }

  return uniqueName;
}

function objectsIncludeObj( objNames, testedObjName ) {
  if ( !testedObjName ) return false;

  for ( var i = 0;i < objNames.length;i++ ) {
    if ( testedObjName == objNames[ i ] ) {
      return true;
    } else {
      // also check children which are auto-generated for multi-material objects
      var obj = getObjectByName( _pGlob.appInstance, objNames[ i ] );
      if ( obj && obj.type == "Group" ) {
        for ( var j = 0;j < obj.children.length;j++ ) {
          if ( testedObjName == obj.children[ j ].name ) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// utility function used by the whenClicked, whenHovered, whenDraggedOver, and raycast puzzles
function getPickedObjectName( obj ) {
  // auto-generated from a multi-material object, use parent name instead
  if ( obj.isMesh && obj.isMaterialGeneratedMesh && obj.parent ) {
    return obj.parent.name;
  } else {
    return obj.name;
  }
}

/**
 * Retrieve coordinate system from the loaded scene
 */
function getCoordSystem() {
  var scene = _pGlob.appInstance.scene;

  if ( scene && "v3d" in scene.userData && "coordSystem" in scene.userData.v3d ) {
    return scene.userData.v3d.coordSystem;
  } else {
    // COMPAT: <2.17, consider replacing to 'Y_UP_RIGHT' for scenes with unknown origin
    return 'Z_UP_RIGHT';
  }
}

/**
 * Transform coordinates from one space to another
 * Can be used with Vector3 or Euler.
 */
function coordsTransform( coords, from, to, noSignChange ) {

  if ( from == to )
    return coords;

  var y = coords.y,
    z = coords.z;

  if ( from == 'Z_UP_RIGHT' && to == 'Y_UP_RIGHT' ) {
    coords.y = z;
    coords.z = noSignChange ? y : -y;
  } else if ( from == 'Y_UP_RIGHT' && to == 'Z_UP_RIGHT' ) {
    coords.y = noSignChange ? z : -z;
    coords.z = y;
  } else {
    console.error( 'coordsTransform: Unsupported coordinate space' );
  }

  return coords;
}

// utility function used by the whenClicked, whenHovered and whenDraggedOver puzzles
function initObjectPicking( callback, eventType, mouseDownUseTouchStart, mouseButtons ) {
  var elem = _pGlob.appInstance.renderer.domElement;
  elem.addEventListener( eventType, pickListener );

  if ( eventType == 'mousedown' ) {
    var touchEventName = mouseDownUseTouchStart ? 'touchstart' : 'touchend';
    elem.addEventListener( touchEventName, pickListener );

  } else if ( eventType == 'dblclick' ) {
    var prevTapTime = 0;
    function doubleTapCallback( event ) {

      var now = new Date().getTime();
      var timesince = now - prevTapTime;

      if ( timesince < 600 && timesince > 0 ) {

        pickListener( event );
        prevTapTime = 0;
        return;

      }

      prevTapTime = new Date().getTime();
    }
    var touchEventName = mouseDownUseTouchStart ? 'touchstart' : 'touchend';
    elem.addEventListener( touchEventName, doubleTapCallback );
  }

  var raycaster = new Raycaster();
  function pickListener( event ) {
    // to handle unload in loadScene puzzle
    if ( !_pGlob.appInstance.getCamera() )
      return;
    event.preventDefault();
    var xNorm = 0,
      yNorm = 0;
    if ( event instanceof MouseEvent ) {
      if ( mouseButtons && mouseButtons.indexOf( event.button ) == -1 )
        return;
      xNorm = event.offsetX / elem.clientWidth;
      yNorm = event.offsetY / elem.clientHeight;
    } else if ( event instanceof TouchEvent ) {
      var rect = elem.getBoundingClientRect();
      xNorm = ( event.changedTouches[ 0 ].clientX - rect.left ) / rect.width;
      yNorm = ( event.changedTouches[ 0 ].clientY - rect.top ) / rect.height;
    }

    _pGlob.screenCoords.x = xNorm * 2 - 1;
    _pGlob.screenCoords.y = -yNorm * 2 + 1;
    raycaster.setFromCamera( _pGlob.screenCoords, _pGlob.appInstance.getCamera( true ) );
    var objList = [];
    _pGlob.appInstance.scene.traverse( function ( obj ) {
      objList.push( obj );
    } );
    var intersects = raycaster.intersectObjects( objList );
    
    callback( intersects, event );
  }
}

// utility function used by the whenClicked2 puzzles
function initObjectPicking2( callback, eventType, mouseDownUseTouchStart, mouseButtons, delay ) {
  var elem = _pGlob.appInstance.renderer.domElement;
  elem.addEventListener( eventType, pickListener );

  if ( eventType == 'mouseup' ) {
    var touchEventName = mouseDownUseTouchStart ? 'touchstart' : 'touchend';
    elem.addEventListener( touchEventName, pickListener );
  } else if ( eventType == 'dblclick' ) {
    var prevTapTime = 0;
    function doubleTapCallback( event ) {
      var now = new Date().getTime();
      var timesince = now - prevTapTime;
      if ( timesince < 600 && timesince > 0 ) {
        pickListener( event );
        prevTapTime = 0;
        return;
      }
      prevTapTime = new Date().getTime();
    }
    var touchEventName = mouseDownUseTouchStart ? 'touchstart' : 'touchend';
    elem.addEventListener( touchEventName, doubleTapCallback );
  }

  var raycaster = new Raycaster();
  var timeDelta;
  elem.addEventListener( 'mousedown', timeDeltaStart )
  elem.addEventListener( 'touchstart', timeDeltaStart )

  function timeDeltaStart() {
    timeDelta = _pGlob.appInstance.clock.elapsedTime;
  }

  function pickListener( event ) {
    timeDelta = _pGlob.appInstance.clock.elapsedTime - timeDelta;
    if ( timeDelta > delay ) return;

    // to handle unload in loadScene puzzle
    if ( !_pGlob.appInstance.getCamera() )
      return;

    event.preventDefault();

    var xNorm = 0,
      yNorm = 0;
    if ( event instanceof MouseEvent ) {
      if ( mouseButtons && mouseButtons.indexOf( event.button ) == -1 )
        return;
      xNorm = event.offsetX / elem.clientWidth;
      yNorm = event.offsetY / elem.clientHeight;
    } else if ( event instanceof TouchEvent ) {
      var rect = elem.getBoundingClientRect();
      xNorm = ( event.changedTouches[ 0 ].clientX - rect.left ) / rect.width;
      yNorm = ( event.changedTouches[ 0 ].clientY - rect.top ) / rect.height;
    }

    _pGlob.screenCoords.x = xNorm * 2 - 1;
    _pGlob.screenCoords.y = -yNorm * 2 + 1;
    raycaster.setFromCamera( _pGlob.screenCoords, _pGlob.appInstance.getCamera( true ) );
    var objList = [];
    _pGlob.appInstance.scene.traverse( function ( obj ) {
      objList.push( obj );
    } );
    var intersects = raycaster.intersectObjects( objList );
    callback( intersects, event );
  }

}

function intersectPlaneCSS( plane, cssX, cssY, dest ) {
  var coords = _pGlob.vec2Tmp;
  var rc = _pGlob.raycasterTmp;
  coords.x = ( cssX / _pGlob.appInstance.getWidth() ) * 2 - 1;
  coords.y = -( cssY / _pGlob.appInstance.getHeight() ) * 2 + 1;
  rc.setFromCamera( coords, _pGlob.appInstance.getCamera( true ) );
  return rc.ray.intersectPlane( plane, dest );
}


// onDrag('<none>', false, [0,1,2], function() {}, function() {}, function() {}, 'ID');
function eventGetOffsetCoords( e, touchId, dest ) {
  if ( e instanceof MouseEvent ) {
    dest.set( e.offsetX, e.offsetY );
  } else if ( window.TouchEvent && e instanceof TouchEvent ) {
    var rect = e.target.getBoundingClientRect();
    var touches = e.touches;
    if ( e.type == "touchstart" || e.type == "touchend" || e.type == "touchmove" ) {
      touches = e.changedTouches;
    }

    var touch = touches[ 0 ];
    for ( var i = 0;i < touches.length;i++ ) {
      if ( touches[ i ].identifier == touchId ) {
        touch = touches[ i ];
        break;
      }
    }

    dest.set( touch.clientX - rect.left, touch.clientY - rect.top );
  }
  return dest;
}

function eventTouchIdGetFirst( e ) {
  if ( e instanceof MouseEvent ) {
    return -1;
  } else if ( window.TouchEvent && e instanceof TouchEvent ) {
    if ( e.type == "touchstart" || e.type == "touchend" || e.type == "touchmove" ) {
      return e.changedTouches[ 0 ].identifier;
    } else {
      return e.touches[ 0 ].identifier;
    }
  }
  return -1;
}

/**
 * For "touchstart", "touchend" and "touchmove" events returns true if a touch
 * object with the provided touch id is in the changedTouches array, otherwise
 * - false. For other events returns true.
 */
function eventTouchIdChangedFilter( e, touchId ) {
  if ( window.TouchEvent && e instanceof TouchEvent ) {
    if ( e.type == "touchstart" || e.type == "touchend" || e.type == "touchmove" ) {
      var isChanged = false;
      for ( var i = 0;i < e.changedTouches.length;i++ ) {
        if ( e.changedTouches[ i ].identifier == touchId ) {
          isChanged = true;
          break;
        }
      }
      return isChanged;
    }
  }

  return true;
}

function initDragOverInfo() {
  return {
    draggedObjName: '',
    downX: 0,
    downY: 0,
    prevX: 0,
    prevY: 0,
    currX: 0,
    currY: 0,
    isDowned: false,
    isMoved: false,
    touchId: -1
  };
}
/**
 * Retreive standard accessible textures for MeshNodeMaterial or MeshStandardMaterial.
 * If "collectSameNameMats" is true then all materials in the scene with the given name will
 * be used for collecting textures, otherwise will be used only the first found material (default behavior).
 */
function matGetEditableTextures( matName, collectSameNameMats ) {

  var mats = [];
  if ( collectSameNameMats ) {
    mats = SceneUtils.getMaterialsByName( _pGlob.appInstance, matName );
  } else {
    var firstMat = SceneUtils.getMaterialByName( _pGlob.appInstance, matName );
    if ( firstMat !== null ) {
      mats = [ firstMat ];
    }
  }

  var textures = mats.reduce( function ( texArray, mat ) {
    var matTextures = [];
    switch ( mat.type ) {
      case 'MeshNodeMaterial':
        matTextures = Object.values( mat.nodeTextures );
        break;

      case 'MeshStandardMaterial':
        matTextures = [
          mat.map, mat.lightMap, mat.aoMap, mat.emissiveMap,
          mat.bumpMap, mat.normalMap, mat.displacementMap,
          mat.roughnessMap, mat.metalnessMap, mat.alphaMap, mat.envMap
        ]
        break;

      default:
        console.error( 'matGetEditableTextures: Unknown material type ' + mat.type );
        break;
    }

    Array.prototype.push.apply( texArray, matTextures );
    return texArray;
  }, [] );

  return textures.filter( function ( elem ) {
    // check Texture type exactly
    return elem && ( elem.constructor == Texture ||
      elem.constructor == DataTexture ||
      elem.constructor == VideoTexture );
  } );
}

/**
 * Replace accessible textures for MeshNodeMaterial or MeshStandardMaterial
 */
function matReplaceEditableTexture( mat, oldTex, newTex ) {

  switch ( mat.type ) {
    case 'MeshNodeMaterial':
      for ( var name in mat.nodeTextures ) {
        if ( mat.nodeTextures[ name ] == oldTex ) {
          mat.nodeTextures[ name ] = newTex;
        }
      }

      break;

    case 'MeshStandardMaterial':

      var texNames = [ 'map', 'lightMap', 'aoMap', 'emissiveMap',
        'bumpMap', 'normalMap', 'displacementMap', 'roughnessMap',
        'metalnessMap', 'alphaMap', 'envMap'
      ];

      texNames.forEach( function ( name ) {
        if ( mat[ name ] == oldTex ) {
          mat[ name ] = newTex;
        }
      } );

      break;

    default:
      console.error( 'matReplaceEditableTexture: Unsupported material type ' + mat.type );
      break;
  }

  // inherit some save params
  newTex.encoding = oldTex.encoding;
  newTex.wrapS = oldTex.wrapS;
  newTex.wrapT = oldTex.wrapT;

}

function matGetColors( matName ) {
  var mat = SceneUtils.getMaterialByName( _pGlob.appInstance, matName );
  if ( !mat )
    return [];

  if ( mat.isMeshNodeMaterial )
    return Object.keys( mat.nodeRGBMap );
  else if ( mat.isMeshStandardMaterial )
    return [ 'color', 'emissive' ];
  else
    return [];
}

/**
 * Check if the given material name is already used by materials on the scene.
 */
function matNameUsed(name) {
  return SceneUtils.getMaterialByName(_pGlob.appInstance, name) !== null;
}

var parseDataUriRe = /^data:(.+\/.+);base64,(.*)$/;

/**
 * Check if object is a Data URI string
 */
function checkDataUri( obj ) {
  return ( typeof obj === 'string' && parseDataUriRe.test( obj ) );
}

/**
 * Check if object is a URI to a Blob object
 */
function checkBlobUri( obj ) {
  return ( typeof obj === 'string' && obj.indexOf( 'blob:' ) == 0 );
}

/**
 * First we use encodeURIComponent to get percent-encoded UTF-8,
 * then we convert the percent encodings into raw bytes which can be fed into btoa
 * https://bit.ly/3dvpq60
 */
function base64EncodeUnicode( str ) {
  return btoa( encodeURIComponent( str ).replace( /%([0-9A-F]{2})/g,
    function toSolidBytes( match, p1 ) {
      return String.fromCharCode( '0x' + p1 );
    } ) );
}

/**
 * Going backwards: from bytestream, to percent-encoding, to original string
 * https://bit.ly/3dvpq60
 */
function base64DecodeUnicode( str ) {
  return decodeURIComponent( atob( str ).split( '' ).map( function ( c ) {
    return '%' + ( '00' + c.charCodeAt( 0 ).toString( 16 ) ).slice( -2 );
  } ).join( '' ) );
}

/**
 * Convert object or string to application/json Data URI
 */
function toJSONDataUri( obj ) {
  if ( typeof obj !== 'string' )
    obj = JSON.stringify( obj );
  return 'data:application/json;base64,' + base64EncodeUnicode( obj );
}

/**
 * Convert object or string to application/json Data URI
 */
function toTextDataUri( obj ) {
  if ( typeof obj !== 'string' )
    obj = JSON.stringify( obj );
  return 'data:text/plain;base64,' + base64EncodeUnicode( obj );
}

/**
 * Extract text data from Data URI
 */
function extractDataUriData( str ) {
  var matches = str.match( parseDataUriRe );
  return base64DecodeUnicode( matches[ 2 ] );
}

export {
  notIgnoredObj,
  getObjectByName,
  getAllObjectNames,
  getObjectNamesByGroupName,
  retrieveObjectNames,
  retrieveObjectNamesAcc,
  acquireUniqueName,
  objectsIncludeObj,
  getPickedObjectName,
  getCoordSystem,
  coordsTransform,
  initObjectPicking,
  initObjectPicking2,
  intersectPlaneCSS,
  eventGetOffsetCoords,
  eventTouchIdGetFirst,
  eventTouchIdChangedFilter,
  initDragOverInfo,
  matGetEditableTextures,
  matReplaceEditableTexture,
  matGetColors,
  matNameUsed,
  checkDataUri,
  checkBlobUri,
  base64EncodeUnicode,
  base64DecodeUnicode,
  toJSONDataUri,
  toTextDataUri,
  extractDataUriData,
}
