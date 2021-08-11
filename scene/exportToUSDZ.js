/* 
e.g
exportToUSDZ('<none>');
 */
import {
  getObjectByName,
} from '../util/util'
import { _pGlob } from '../verge'


class USDZExporter {
  async parse( scene ) {
    const files = {};
    const modelFileName = 'model.usda'; // model file should be first in USDZ archive so we init it here
    files[ modelFileName ] = null;
    let output = buildHeader();
    const materials = {};
    const textures = {};
    scene.traverseVisible( object => {
      if ( object.isMesh && object.material.isMeshStandardMaterial ) {
        const geometry = object.geometry;
        const material = object.material;
        const geometryFileName = 'geometries/Geometry_' + geometry.id + '.usd';
        if ( !( geometryFileName in files ) ) {
          const meshObject = buildMeshObject( geometry );
          files[ geometryFileName ] = buildUSDFileAsString( meshObject );
        }
        if ( !( material.uuid in materials ) ) {
          materials[ material.uuid ] = material;
        }
        output += buildXform( object, geometry, material );
      }
    } );
    output += buildMaterials( materials, textures );
    files[ modelFileName ] = fflate.strToU8( output );
    output = null;
    for ( const id in textures ) {
      const texture = textures[ id ];
      const color = id.split( '_' )[ 1 ];
      files[ 'textures/Texture_' + id + '.jpg' ] = await imgToU8( texture.image, color );
    } // 64 byte alignment
    // https://github.com/101arrowz/fflate/issues/39#issuecomment-777263109
    let offset = 0;
    for ( const filename in files ) {
      const file = files[ filename ];
      const headerSize = 34 + filename.length;
      offset += headerSize;
      const offsetMod64 = offset & 63;
      if ( offsetMod64 !== 4 ) {
        const padLength = 64 - offsetMod64;
        const padding = new Uint8Array( padLength );
        files[ filename ] = [ file, {
          extra: {
            12345: padding
          }
        } ];
      }
      offset = file.length;
    }
    return fflate.zipSync( files, {
      level: 0
    } );
  }
}
async function imgToU8( image, color ) {
  if ( typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement || typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement || typeof OffscreenCanvas !== 'undefined' && image instanceof OffscreenCanvas || typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap ) {
    const scale = 1024 / Math.max( image.width, image.height );
    const canvas = document.createElement( 'canvas' );
    canvas.width = image.width * Math.min( 1, scale );
    canvas.height = image.height * Math.min( 1, scale );
    const context = canvas.getContext( '2d' );
    context.drawImage( image, 0, 0, canvas.width, canvas.height );
    if ( color !== undefined ) {
      context.globalCompositeOperation = 'multiply';
      context.fillStyle = `#${ color }`;
      context.fillRect( 0, 0, canvas.width, canvas.height );
    }
    const blob = await new Promise( resolve => canvas.toBlob( resolve, 'image/jpeg', 1 ) );
    return new Uint8Array( await blob.arrayBuffer() );
  }
} //
const PRECISION = 7;
function buildHeader() {
  return `#usda 1.0
(
    customLayerData = {
        string creator = "Three.js USDZExporter"
    }
    metersPerUnit = 1
    upAxis = "Y"
)
`;
}
function buildUSDFileAsString( dataToInsert ) {
  let output = buildHeader();
  output += dataToInsert;
  return fflate.strToU8( output );
} // Xform
function buildXform( object, geometry, material ) {
  const name = 'Object_' + object.id;
  const transform = buildMatrix( object.matrixWorld );
  return `def Xform "${ name }" (
    prepend references = @./geometries/Geometry_${ geometry.id }.usd@</Geometry>
)
{
    matrix4d xformOp:transform = ${ transform }
    uniform token[] xformOpOrder = ["xformOp:transform"]
    rel material:binding = </Materials/Material_${ material.id }>
}
`;
}
function buildMatrix( matrix ) {
  const array = matrix.elements;
  return `(${ buildMatrixRow( array, 0 ) }, ${ buildMatrixRow( array, 4 ) }, ${ buildMatrixRow( array, 8 ) }, ${ buildMatrixRow( array, 12 ) })`;
}
function buildMatrixRow( array, offset ) {
  return `(${ array[ offset + 0 ] }, ${ array[ offset + 1 ] }, ${ array[ offset + 2 ] }, ${ array[ offset + 3 ] })`;
} // Mesh
function buildMeshObject( geometry ) {
  const mesh = buildMesh( geometry );
  return `
def "Geometry"
{
  ${ mesh }
}
`;
}
function buildMesh( geometry ) {
  const name = 'Geometry';
  const attributes = geometry.attributes;
  const count = attributes.position.count;
  return `
    def Mesh "${ name }"
    {
        int[] faceVertexCounts = [${ buildMeshVertexCount( geometry ) }]
        int[] faceVertexIndices = [${ buildMeshVertexIndices( geometry ) }]
        normal3f[] normals = [${ buildVector3Array( attributes.normal, count ) }] (
            interpolation = "vertex"
        )
        point3f[] points = [${ buildVector3Array( attributes.position, count ) }]
        float2[] primvars:st = [${ buildVector2Array( attributes.uv, count ) }] (
            interpolation = "vertex"
        )
        uniform token subdivisionScheme = "none"
    }
`;
}
function buildMeshVertexCount( geometry ) {
  const count = geometry.index !== null ? geometry.index.array.length : geometry.attributes.position.count;
  return Array( count / 3 ).fill( 3 ).join( ', ' );
}
function buildMeshVertexIndices( geometry ) {
  if ( geometry.index !== null ) {
    return geometry.index.array.join( ', ' );
  }
  const array = [];
  const length = geometry.attributes.position.count;
  for ( let i = 0;i < length;i++ ) {
    array.push( i );
  }
  return array.join( ', ' );
}
function buildVector3Array( attribute, count ) {
  if ( attribute === undefined ) {
    console.warn( 'USDZExporter: Normals missing.' );
    return Array( count ).fill( '(0, 0, 0)' ).join( ', ' );
  }
  const array = [];
  const data = attribute.array;
  for ( let i = 0;i < data.length;i += 3 ) {
    array.push( `(${ data[ i + 0 ].toPrecision( PRECISION ) }, ${ data[ i + 1 ].toPrecision( PRECISION ) }, ${ data[ i + 2 ].toPrecision( PRECISION ) })` );
  }
  return array.join( ', ' );
}
function buildVector2Array( attribute, count ) {
  if ( attribute === undefined ) {
    console.warn( 'USDZExporter: UVs missing.' );
    return Array( count ).fill( '(0, 0)' ).join( ', ' );
  }
  const array = [];
  const data = attribute.array;
  for ( let i = 0;i < data.length;i += 2 ) {
    array.push( `(${ data[ i + 0 ].toPrecision( PRECISION ) }, ${ 1 - data[ i + 1 ].toPrecision( PRECISION ) })` );
  }
  return array.join( ', ' );
} // Materials
function buildMaterials( materials, textures ) {
  const array = [];
  for ( const uuid in materials ) {
    const material = materials[ uuid ];
    array.push( buildMaterial( material, textures ) );
  }
  return `def "Materials"
{
${ array.join( '' ) }
}
`;
}
function buildMaterial( material, textures ) {
  // https://graphics.pixar.com/usd/docs/UsdPreviewSurface-Proposal.html
  const pad = '            ';
  const inputs = [];
  const samplers = [];
  function buildTexture( texture, mapType, color ) {
    const id = texture.id + ( color ? '_' + color.getHexString() : '' );
    textures[ id ] = texture;
    return `
        def Shader "Transform2d_${ mapType }" (
            sdrMetadata = {
                string role = "math"
            }
        )
        {
            uniform token info:id = "UsdTransform2d"
            float2 inputs:in.connect = </Materials/Material_${ material.id }/uvReader_st.outputs:result>
            float2 inputs:scale = ${ buildVector2( texture.repeat ) }
            float2 inputs:translation = ${ buildVector2( texture.offset ) }
            float2 outputs:result
        }
        def Shader "Texture_${ texture.id }_${ mapType }"
        {
            uniform token info:id = "UsdUVTexture"
            asset inputs:file = @textures/Texture_${ id }.jpg@
            float2 inputs:st.connect = </Materials/Material_${ material.id }/Transform2d_${ mapType }.outputs:result>
            token inputs:wrapS = "repeat"
            token inputs:wrapT = "repeat"
            float outputs:r
            float outputs:g
            float outputs:b
            float3 outputs:rgb
        }`;
  }
  if ( material.map !== null ) {
    inputs.push( `${ pad }color3f inputs:diffuseColor.connect = </Materials/Material_${ material.id }/Texture_${ material.map.id }_diffuse.outputs:rgb>` );
    samplers.push( buildTexture( material.map, 'diffuse', material.color ) );
  } else {
    inputs.push( `${ pad }color3f inputs:diffuseColor = ${ buildColor( material.color ) }` );
  }
  if ( material.emissiveMap !== null ) {
    inputs.push( `${ pad }color3f inputs:emissiveColor.connect = </Materials/Material_${ material.id }/Texture_${ material.emissiveMap.id }_emissive.outputs:rgb>` );
    samplers.push( buildTexture( material.emissiveMap, 'emissive' ) );
  } else if ( material.emissive.getHex() > 0 ) {
    inputs.push( `${ pad }color3f inputs:emissiveColor = ${ buildColor( material.emissive ) }` );
  }
  if ( material.normalMap !== null ) {
    inputs.push( `${ pad }normal3f inputs:normal.connect = </Materials/Material_${ material.id }/Texture_${ material.normalMap.id }_normal.outputs:rgb>` );
    samplers.push( buildTexture( material.normalMap, 'normal' ) );
  }
  if ( material.aoMap !== null ) {
    inputs.push( `${ pad }float inputs:occlusion.connect = </Materials/Material_${ material.id }/Texture_${ material.aoMap.id }_occlusion.outputs:r>` );
    samplers.push( buildTexture( material.aoMap, 'occlusion' ) );
  }
  if ( material.roughnessMap !== null ) {
    inputs.push( `${ pad }float inputs:roughness.connect = </Materials/Material_${ material.id }/Texture_${ material.roughnessMap.id }_roughness.outputs:g>` );
    samplers.push( buildTexture( material.roughnessMap, 'roughness' ) );
  } else {
    inputs.push( `${ pad }float inputs:roughness = ${ material.roughness }` );
  }
  if ( material.metalnessMap !== null ) {
    inputs.push( `${ pad }float inputs:metallic.connect = </Materials/Material_${ material.id }/Texture_${ material.metalnessMap.id }_metallic.outputs:b>` );
    samplers.push( buildTexture( material.metalnessMap, 'metallic' ) );
  } else {
    inputs.push( `${ pad }float inputs:metallic = ${ material.metalness }` );
  }
  inputs.push( `${ pad }float inputs:opacity = ${ material.opacity }` );
  if ( material.isMeshPhysicalMaterial ) {
    inputs.push( `${ pad }float inputs:clearcoat = ${ material.clearcoat }` );
    inputs.push( `${ pad }float inputs:clearcoatRoughness = ${ material.clearcoatRoughness }` );
    inputs.push( `${ pad }float inputs:ior = ${ material.ior }` );
  }
  return `
    def Material "Material_${ material.id }"
    {
        def Shader "PreviewSurface"
        {
            uniform token info:id = "UsdPreviewSurface"
${ inputs.join( '\n' ) }
            int inputs:useSpecularWorkflow = 0
            token outputs:surface
        }
        token outputs:surface.connect = </Materials/Material_${ material.id }/PreviewSurface.outputs:surface>
        token inputs:frame:stPrimvarName = "st"
        def Shader "uvReader_st"
        {
            uniform token info:id = "UsdPrimvarReader_float2"
            token inputs:varname.connect = </Materials/Material_${ material.id }.inputs:frame:stPrimvarName>
            float2 inputs:fallback = (0.0, 0.0)
            float2 outputs:result
        }
${ samplers.join( '\n' ) }
    }
`;
}
function buildColor( color ) {
  return `(${ color.r }, ${ color.g }, ${ color.b })`;
}
function buildVector2( vector ) {
  return `(${ vector.x }, ${ vector.y })`;
}

/*!
fflate - fast JavaScript compression/decompression
<https://101arrowz.github.io/fflate>
Licensed under MIT. https://github.com/101arrowz/fflate/blob/master/LICENSE
version 0.6.9
*/

!function ( f ) { typeof module != 'undefined' && typeof exports == 'object' ? module.exports = f() : typeof define != 'undefined' && define.amd ? define( [ 'fflate', f ] ) : ( typeof self != 'undefined' ? self : this ).fflate = f() }( function () { var _e = {}; "use strict"; var t = ( typeof module != 'undefined' && typeof exports == 'object' ? function ( _f ) { "use strict"; var e, t = ";var __w=require('worker_threads');__w.parentPort.on('message',function(m){onmessage({data:m})}),postMessage=function(m,t){__w.parentPort.postMessage(m,t)},close=process.exit;self=global"; try { e = require( "worker_threads" ).Worker } catch ( e ) { } exports.default = e ? function ( r, n, o, a, s ) { var u = !1, i = new e( r + t, { eval: !0 } ).on( "error", ( function ( e ) { return s( e, null ) } ) ).on( "message", ( function ( e ) { return s( null, e ) } ) ).on( "exit", ( function ( e ) { e && !u && s( Error( "exited with code " + e ), null ) } ) ); return i.postMessage( o, a ), i.terminate = function () { return u = !0, e.prototype.terminate.call( i ) }, i } : function ( e, t, r, n, o ) { setImmediate( ( function () { return o( Error( "async operations unsupported - update to Node 12+ (or Node 10-11 with the --experimental-worker CLI flag)" ), null ) } ) ); var a = function () { }; return { terminate: a, postMessage: a } }; return _f } : function ( _f ) { "use strict"; var e = {}, r = function ( e ) { return URL.createObjectURL( new Blob( [ e ], { type: "text/javascript" } ) ) }, t = function ( e ) { return new Worker( e ) }; try { URL.revokeObjectURL( r( "" ) ) } catch ( e ) { r = function ( e ) { return "data:application/javascript;charset=UTF-8," + encodeURI( e ) }, t = function ( e ) { return new Worker( e, { type: "module" } ) } } _f.default = function ( n, o, u, a, c ) { var i = t( e[ o ] || ( e[ o ] = r( n ) ) ); return i.onerror = function ( e ) { return c( e.error, null ) }, i.onmessage = function ( e ) { return c( null, e.data ) }, i.postMessage( u, a ), i }; return _f } )( {} ), n = Uint8Array, r = Uint16Array, e = Uint32Array, i = new n( [ 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 0, 0, 0 ] ), o = new n( [ 0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 0, 0 ] ), a = new n( [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ] ), s = function ( t, n ) { for ( var i = new r( 31 ), o = 0;o < 31;++o )i[ o ] = n += 1 << t[ o - 1 ]; var a = new e( i[ 30 ] ); for ( o = 1;o < 30;++o )for ( var s = i[ o ];s < i[ o + 1 ];++s )a[ s ] = s - i[ o ] << 5 | o; return [ i, a ] }, f = s( i, 2 ), u = f[ 0 ], h = f[ 1 ]; u[ 28 ] = 258, h[ 258 ] = 28; for ( var c = s( o, 0 ), l = c[ 0 ], p = c[ 1 ], v = new r( 32768 ), d = 0;d < 32768;++d ) { var g = ( 43690 & d ) >>> 1 | ( 21845 & d ) << 1; v[ d ] = ( ( 65280 & ( g = ( 61680 & ( g = ( 52428 & g ) >>> 2 | ( 13107 & g ) << 2 ) ) >>> 4 | ( 3855 & g ) << 4 ) ) >>> 8 | ( 255 & g ) << 8 ) >>> 1 } var w = function ( t, n, e ) { for ( var i = t.length, o = 0, a = new r( n );o < i;++o )++a[ t[ o ] - 1 ]; var s, f = new r( n ); for ( o = 0;o < n;++o )f[ o ] = f[ o - 1 ] + a[ o - 1 ] << 1; if ( e ) { s = new r( 1 << n ); var u = 15 - n; for ( o = 0;o < i;++o )if ( t[ o ] ) for ( var h = o << 4 | t[ o ], c = n - t[ o ], l = f[ t[ o ] - 1 ]++ << c, p = l | ( 1 << c ) - 1;l <= p;++l )s[ v[ l ] >>> u ] = h } else for ( s = new r( i ), o = 0;o < i;++o )t[ o ] && ( s[ o ] = v[ f[ t[ o ] - 1 ]++ ] >>> 15 - t[ o ] ); return s }, y = new n( 288 ); for ( d = 0;d < 144;++d )y[ d ] = 8; for ( d = 144;d < 256;++d )y[ d ] = 9; for ( d = 256;d < 280;++d )y[ d ] = 7; for ( d = 280;d < 288;++d )y[ d ] = 8; var m = new n( 32 ); for ( d = 0;d < 32;++d )m[ d ] = 5; var b = w( y, 9, 0 ), x = w( y, 9, 1 ), z = w( m, 5, 0 ), k = w( m, 5, 1 ), M = function ( t ) { for ( var n = t[ 0 ], r = 1;r < t.length;++r )t[ r ] > n && ( n = t[ r ] ); return n }, A = function ( t, n, r ) { var e = n / 8 | 0; return ( t[ e ] | t[ e + 1 ] << 8 ) >> ( 7 & n ) & r }, S = function ( t, n ) { var r = n / 8 | 0; return ( t[ r ] | t[ r + 1 ] << 8 | t[ r + 2 ] << 16 ) >> ( 7 & n ) }, D = function ( t ) { return ( t / 8 | 0 ) + ( 7 & t && 1 ) }, C = function ( t, i, o ) { ( null == i || i < 0 ) && ( i = 0 ), ( null == o || o > t.length ) && ( o = t.length ); var a = new ( t instanceof r ? r : t instanceof e ? e : n )( o - i ); return a.set( t.subarray( i, o ) ), a }, U = function ( t, r, e ) { var s = t.length; if ( !s || e && !e.l && s < 5 ) return r || new n( 0 ); var f = !r || e, h = !e || e.i; e || ( e = {} ), r || ( r = new n( 3 * s ) ); var c = function ( t ) { var e = r.length; if ( t > e ) { var i = new n( Math.max( 2 * e, t ) ); i.set( r ), r = i } }, p = e.f || 0, v = e.p || 0, d = e.b || 0, g = e.l, y = e.d, m = e.m, b = e.n, z = 8 * s; do { if ( !g ) { e.f = p = A( t, v, 1 ); var U = A( t, v + 1, 3 ); if ( v += 3, !U ) { var O = t[ ( Y = D( v ) + 4 ) - 4 ] | t[ Y - 3 ] << 8, T = Y + O; if ( T > s ) { if ( h ) throw "unexpected EOF"; break } f && c( d + O ), r.set( t.subarray( Y, T ), d ), e.b = d += O, e.p = v = 8 * T; continue } if ( 1 == U ) g = x, y = k, m = 9, b = 5; else { if ( 2 != U ) throw "invalid block type"; var Z = A( t, v, 31 ) + 257, I = A( t, v + 10, 15 ) + 4, F = Z + A( t, v + 5, 31 ) + 1; v += 14; for ( var E = new n( F ), G = new n( 19 ), P = 0;P < I;++P )G[ a[ P ] ] = A( t, v + 3 * P, 7 ); v += 3 * I; var j = M( G ), q = ( 1 << j ) - 1, H = w( G, j, 1 ); for ( P = 0;P < F; ) { var Y, B = H[ A( t, v, q ) ]; if ( v += 15 & B, ( Y = B >>> 4 ) < 16 ) E[ P++ ] = Y; else { var J = 0, K = 0; for ( 16 == Y ? ( K = 3 + A( t, v, 3 ), v += 2, J = E[ P - 1 ] ) : 17 == Y ? ( K = 3 + A( t, v, 7 ), v += 3 ) : 18 == Y && ( K = 11 + A( t, v, 127 ), v += 7 );K--; )E[ P++ ] = J } } var L = E.subarray( 0, Z ), N = E.subarray( Z ); m = M( L ), b = M( N ), g = w( L, m, 1 ), y = w( N, b, 1 ) } if ( v > z ) { if ( h ) throw "unexpected EOF"; break } } f && c( d + 131072 ); for ( var Q = ( 1 << m ) - 1, R = ( 1 << b ) - 1, V = v;;V = v ) { var W = ( J = g[ S( t, v ) & Q ] ) >>> 4; if ( ( v += 15 & J ) > z ) { if ( h ) throw "unexpected EOF"; break } if ( !J ) throw "invalid length/literal"; if ( W < 256 ) r[ d++ ] = W; else { if ( 256 == W ) { V = v, g = null; break } var X = W - 254; W > 264 && ( X = A( t, v, ( 1 << ( tt = i[ P = W - 257 ] ) ) - 1 ) + u[ P ], v += tt ); var $ = y[ S( t, v ) & R ], _ = $ >>> 4; if ( !$ ) throw "invalid distance"; if ( v += 15 & $, N = l[ _ ], _ > 3 ) { var tt = o[ _ ]; N += S( t, v ) & ( 1 << tt ) - 1, v += tt } if ( v > z ) { if ( h ) throw "unexpected EOF"; break } f && c( d + 131072 ); for ( var nt = d + X;d < nt;d += 4 )r[ d ] = r[ d - N ], r[ d + 1 ] = r[ d + 1 - N ], r[ d + 2 ] = r[ d + 2 - N ], r[ d + 3 ] = r[ d + 3 - N ]; d = nt } } e.l = g, e.p = V, e.b = d, g && ( p = 1, e.m = m, e.d = y, e.n = b ) } while ( !p ); return d == r.length ? r : C( r, 0, d ) }, O = function ( t, n, r ) { var e = n / 8 | 0; t[ e ] |= r <<= 7 & n, t[ e + 1 ] |= r >>> 8 }, T = function ( t, n, r ) { var e = n / 8 | 0; t[ e ] |= r <<= 7 & n, t[ e + 1 ] |= r >>> 8, t[ e + 2 ] |= r >>> 16 }, Z = function ( t, e ) { for ( var i = [], o = 0;o < t.length;++o )t[ o ] && i.push( { s: o, f: t[ o ] } ); var a = i.length, s = i.slice(); if ( !a ) return [ q, 0 ]; if ( 1 == a ) { var f = new n( i[ 0 ].s + 1 ); return f[ i[ 0 ].s ] = 1, [ f, 1 ] } i.sort( ( function ( t, n ) { return t.f - n.f } ) ), i.push( { s: -1, f: 25001 } ); var u = i[ 0 ], h = i[ 1 ], c = 0, l = 1, p = 2; for ( i[ 0 ] = { s: -1, f: u.f + h.f, l: u, r: h };l != a - 1; )u = i[ i[ c ].f < i[ p ].f ? c++ : p++ ], h = i[ c != l && i[ c ].f < i[ p ].f ? c++ : p++ ], i[ l++ ] = { s: -1, f: u.f + h.f, l: u, r: h }; var v = s[ 0 ].s; for ( o = 1;o < a;++o )s[ o ].s > v && ( v = s[ o ].s ); var d = new r( v + 1 ), g = I( i[ l - 1 ], d, 0 ); if ( g > e ) { o = 0; var w = 0, y = g - e, m = 1 << y; for ( s.sort( ( function ( t, n ) { return d[ n.s ] - d[ t.s ] || t.f - n.f } ) );o < a;++o ) { var b = s[ o ].s; if ( !( d[ b ] > e ) ) break; w += m - ( 1 << g - d[ b ] ), d[ b ] = e } for ( w >>>= y;w > 0; ) { var x = s[ o ].s; d[ x ] < e ? w -= 1 << e - d[ x ]++ - 1 : ++o } for ( ;o >= 0 && w;--o ) { var z = s[ o ].s; d[ z ] == e && ( --d[ z ], ++w ) } g = e } return [ new n( d ), g ] }, I = function ( t, n, r ) { return -1 == t.s ? Math.max( I( t.l, n, r + 1 ), I( t.r, n, r + 1 ) ) : n[ t.s ] = r }, F = function ( t ) { for ( var n = t.length;n && !t[ --n ]; ); for ( var e = new r( ++n ), i = 0, o = t[ 0 ], a = 1, s = function ( t ) { e[ i++ ] = t }, f = 1;f <= n;++f )if ( t[ f ] == o && f != n ) ++a; else { if ( !o && a > 2 ) { for ( ;a > 138;a -= 138 )s( 32754 ); a > 2 && ( s( a > 10 ? a - 11 << 5 | 28690 : a - 3 << 5 | 12305 ), a = 0 ) } else if ( a > 3 ) { for ( s( o ), --a;a > 6;a -= 6 )s( 8304 ); a > 2 && ( s( a - 3 << 5 | 8208 ), a = 0 ) } for ( ;a--; )s( o ); a = 1, o = t[ f ] } return [ e.subarray( 0, i ), n ] }, E = function ( t, n ) { for ( var r = 0, e = 0;e < n.length;++e )r += t[ e ] * n[ e ]; return r }, G = function ( t, n, r ) { var e = r.length, i = D( n + 2 ); t[ i ] = 255 & e, t[ i + 1 ] = e >>> 8, t[ i + 2 ] = 255 ^ t[ i ], t[ i + 3 ] = 255 ^ t[ i + 1 ]; for ( var o = 0;o < e;++o )t[ i + o + 4 ] = r[ o ]; return 8 * ( i + 4 + e ) }, P = function ( t, n, e, s, f, u, h, c, l, p, v ) { O( n, v++, e ), ++f[ 256 ]; for ( var d = Z( f, 15 ), g = d[ 0 ], x = d[ 1 ], k = Z( u, 15 ), M = k[ 0 ], A = k[ 1 ], S = F( g ), D = S[ 0 ], C = S[ 1 ], U = F( M ), I = U[ 0 ], P = U[ 1 ], j = new r( 19 ), q = 0;q < D.length;++q )j[ 31 & D[ q ] ]++; for ( q = 0;q < I.length;++q )j[ 31 & I[ q ] ]++; for ( var H = Z( j, 7 ), Y = H[ 0 ], B = H[ 1 ], J = 19;J > 4 && !Y[ a[ J - 1 ] ];--J ); var K, L, N, Q, R = p + 5 << 3, V = E( f, y ) + E( u, m ) + h, W = E( f, g ) + E( u, M ) + h + 14 + 3 * J + E( j, Y ) + ( 2 * j[ 16 ] + 3 * j[ 17 ] + 7 * j[ 18 ] ); if ( R <= V && R <= W ) return G( n, v, t.subarray( l, l + p ) ); if ( O( n, v, 1 + ( W < V ) ), v += 2, W < V ) { K = w( g, x, 0 ), L = g, N = w( M, A, 0 ), Q = M; var X = w( Y, B, 0 ); for ( O( n, v, C - 257 ), O( n, v + 5, P - 1 ), O( n, v + 10, J - 4 ), v += 14, q = 0;q < J;++q )O( n, v + 3 * q, Y[ a[ q ] ] ); v += 3 * J; for ( var $ = [ D, I ], _ = 0;_ < 2;++_ ) { var tt = $[ _ ]; for ( q = 0;q < tt.length;++q )O( n, v, X[ nt = 31 & tt[ q ] ] ), v += Y[ nt ], nt > 15 && ( O( n, v, tt[ q ] >>> 5 & 127 ), v += tt[ q ] >>> 12 ) } } else K = b, L = y, N = z, Q = m; for ( q = 0;q < c;++q )if ( s[ q ] > 255 ) { var nt; T( n, v, K[ 257 + ( nt = s[ q ] >>> 18 & 31 ) ] ), v += L[ nt + 257 ], nt > 7 && ( O( n, v, s[ q ] >>> 23 & 31 ), v += i[ nt ] ); var rt = 31 & s[ q ]; T( n, v, N[ rt ] ), v += Q[ rt ], rt > 3 && ( T( n, v, s[ q ] >>> 5 & 8191 ), v += o[ rt ] ) } else T( n, v, K[ s[ q ] ] ), v += L[ s[ q ] ]; return T( n, v, K[ 256 ] ), v + L[ 256 ] }, j = new e( [ 65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632 ] ), q = new n( 0 ), H = function ( t, a, s, f, u, c ) { var l = t.length, v = new n( f + l + 5 * ( 1 + Math.ceil( l / 7e3 ) ) + u ), d = v.subarray( f, v.length - u ), g = 0; if ( !a || l < 8 ) for ( var w = 0;w <= l;w += 65535 ) { var y = w + 65535; y < l ? g = G( d, g, t.subarray( w, y ) ) : ( d[ w ] = c, g = G( d, g, t.subarray( w, l ) ) ) } else { for ( var m = j[ a - 1 ], b = m >>> 13, x = 8191 & m, z = ( 1 << s ) - 1, k = new r( 32768 ), M = new r( z + 1 ), A = Math.ceil( s / 3 ), S = 2 * A, U = function ( n ) { return ( t[ n ] ^ t[ n + 1 ] << A ^ t[ n + 2 ] << S ) & z }, O = new e( 25e3 ), T = new r( 288 ), Z = new r( 32 ), I = 0, F = 0, E = ( w = 0, 0 ), H = 0, Y = 0;w < l;++w ) { var B = U( w ), J = 32767 & w, K = M[ B ]; if ( k[ J ] = K, M[ B ] = J, H <= w ) { var L = l - w; if ( ( I > 7e3 || E > 24576 ) && L > 423 ) { g = P( t, d, 0, O, T, Z, F, E, Y, w - Y, g ), E = I = F = 0, Y = w; for ( var N = 0;N < 286;++N )T[ N ] = 0; for ( N = 0;N < 30;++N )Z[ N ] = 0 } var Q = 2, R = 0, V = x, W = J - K & 32767; if ( L > 2 && B == U( w - W ) ) for ( var X = Math.min( b, L ) - 1, $ = Math.min( 32767, w ), _ = Math.min( 258, L );W <= $ && --V && J != K; ) { if ( t[ w + Q ] == t[ w + Q - W ] ) { for ( var tt = 0;tt < _ && t[ w + tt ] == t[ w + tt - W ];++tt ); if ( tt > Q ) { if ( Q = tt, R = W, tt > X ) break; var nt = Math.min( W, tt - 2 ), rt = 0; for ( N = 0;N < nt;++N ) { var et = w - W + N + 32768 & 32767, it = et - k[ et ] + 32768 & 32767; it > rt && ( rt = it, K = et ) } } } W += ( J = K ) - ( K = k[ J ] ) + 32768 & 32767 } if ( R ) { O[ E++ ] = 268435456 | h[ Q ] << 18 | p[ R ]; var ot = 31 & h[ Q ], at = 31 & p[ R ]; F += i[ ot ] + o[ at ], ++T[ 257 + ot ], ++Z[ at ], H = w + Q, ++I } else O[ E++ ] = t[ w ], ++T[ t[ w ] ] } } g = P( t, d, c, O, T, Z, F, E, Y, w - Y, g ), !c && 7 & g && ( g = G( d, g + 1, q ) ) } return C( v, 0, f + D( g ) + u ) }, Y = function () { for ( var t = new e( 256 ), n = 0;n < 256;++n ) { for ( var r = n, i = 9;--i; )r = ( 1 & r && 3988292384 ) ^ r >>> 1; t[ n ] = r } return t }(), B = function () { var t = -1; return { p: function ( n ) { for ( var r = t, e = 0;e < n.length;++e )r = Y[ 255 & r ^ n[ e ] ] ^ r >>> 8; t = r }, d: function () { return ~t } } }, J = function () { var t = 1, n = 0; return { p: function ( r ) { for ( var e = t, i = n, o = r.length, a = 0;a != o; ) { for ( var s = Math.min( a + 2655, o );a < s;++a )i += e += r[ a ]; e = ( 65535 & e ) + 15 * ( e >> 16 ), i = ( 65535 & i ) + 15 * ( i >> 16 ) } t = e, n = i }, d: function () { return ( 255 & ( t %= 65521 ) ) << 24 | t >>> 8 << 16 | ( 255 & ( n %= 65521 ) ) << 8 | n >>> 8 } } }, K = function ( t, n, r, e, i ) { return H( t, null == n.level ? 6 : n.level, null == n.mem ? Math.ceil( 1.5 * Math.max( 8, Math.min( 13, Math.log( t.length ) ) ) ) : 12 + n.mem, r, e, !i ) }, L = function ( t, n ) { var r = {}; for ( var e in t ) r[ e ] = t[ e ]; for ( var e in n ) r[ e ] = n[ e ]; return r }, N = function ( t, n, r ) { for ( var e = t(), i = "" + t, o = i.slice( i.indexOf( "[" ) + 1, i.lastIndexOf( "]" ) ).replace( / /g, "" ).split( "," ), a = 0;a < e.length;++a ) { var s = e[ a ], f = o[ a ]; if ( "function" == typeof s ) { n += ";" + f + "="; var u = "" + s; if ( s.prototype ) if ( -1 != u.indexOf( "[native code]" ) ) { var h = u.indexOf( " ", 8 ) + 1; n += u.slice( h, u.indexOf( "(", h ) ) } else for ( var c in n += u, s.prototype ) n += ";" + f + ".prototype." + c + "=" + s.prototype[ c ]; else n += u } else r[ f ] = s } return [ n, r ] }, Q = [], R = function ( t ) { var i = []; for ( var o in t ) ( t[ o ] instanceof n || t[ o ] instanceof r || t[ o ] instanceof e ) && i.push( ( t[ o ] = new t[ o ].constructor( t[ o ] ) ).buffer ); return i }, V = function ( n, r, e, i ) { var o; if ( !Q[ e ] ) { for ( var a = "", s = {}, f = n.length - 1, u = 0;u < f;++u )a = ( o = N( n[ u ], a, s ) )[ 0 ], s = o[ 1 ]; Q[ e ] = N( n[ f ], a, s ) } var h = L( {}, Q[ e ][ 1 ] ); return t.default( Q[ e ][ 0 ] + ";onmessage=function(e){for(var k in e.data)self[k]=e.data[k];onmessage=" + r + "}", e, h, R( h ), i ) }, W = function () { return [ n, r, e, i, o, a, u, l, x, k, v, w, M, A, S, D, C, U, At, rt, et ] }, X = function () { return [ n, r, e, i, o, a, h, p, b, y, z, m, v, j, q, w, O, T, Z, I, F, E, G, P, D, C, H, K, xt, rt ] }, $ = function () { return [ ct, vt, ht, B, Y ] }, _ = function () { return [ lt, pt ] }, tt = function () { return [ dt, ht, J ] }, nt = function () { return [ gt ] }, rt = function ( t ) { return postMessage( t, [ t.buffer ] ) }, et = function ( t ) { return t && t.size && new n( t.size ) }, it = function ( t, n, r, e, i, o ) { var a = V( r, e, i, ( function ( t, n ) { a.terminate(), o( t, n ) } ) ); return a.postMessage( [ t, n ], n.consume ? [ t.buffer ] : [] ), function () { a.terminate() } }, ot = function ( t ) { return t.ondata = function ( t, n ) { return postMessage( [ t, n ], [ t.buffer ] ) }, function ( n ) { return t.push( n.data[ 0 ], n.data[ 1 ] ) } }, at = function ( t, n, r, e, i ) { var o, a = V( t, e, i, ( function ( t, r ) { t ? ( a.terminate(), n.ondata.call( n, t ) ) : ( r[ 1 ] && a.terminate(), n.ondata.call( n, t, r[ 0 ], r[ 1 ] ) ) } ) ); a.postMessage( r ), n.push = function ( t, r ) { if ( o ) throw "stream finished"; if ( !n.ondata ) throw "no stream handler"; a.postMessage( [ t, o = r ], [ t.buffer ] ) }, n.terminate = function () { a.terminate() } }, st = function ( t, n ) { return t[ n ] | t[ n + 1 ] << 8 }, ft = function ( t, n ) { return ( t[ n ] | t[ n + 1 ] << 8 | t[ n + 2 ] << 16 | t[ n + 3 ] << 24 ) >>> 0 }, ut = function ( t, n ) { return ft( t, n ) + 4294967296 * ft( t, n + 4 ) }, ht = function ( t, n, r ) { for ( ;r;++n )t[ n ] = r, r >>>= 8 }, ct = function ( t, n ) { var r = n.filename; if ( t[ 0 ] = 31, t[ 1 ] = 139, t[ 2 ] = 8, t[ 8 ] = n.level < 2 ? 4 : 9 == n.level ? 2 : 0, t[ 9 ] = 3, 0 != n.mtime && ht( t, 4, Math.floor( new Date( n.mtime || Date.now() ) / 1e3 ) ), r ) { t[ 3 ] = 8; for ( var e = 0;e <= r.length;++e )t[ e + 10 ] = r.charCodeAt( e ) } }, lt = function ( t ) { if ( 31 != t[ 0 ] || 139 != t[ 1 ] || 8 != t[ 2 ] ) throw "invalid gzip data"; var n = t[ 3 ], r = 10; 4 & n && ( r += t[ 10 ] | 2 + ( t[ 11 ] << 8 ) ); for ( var e = ( n >> 3 & 1 ) + ( n >> 4 & 1 );e > 0;e -= !t[ r++ ] ); return r + ( 2 & n ) }, pt = function ( t ) { var n = t.length; return ( t[ n - 4 ] | t[ n - 3 ] << 8 | t[ n - 2 ] << 16 | t[ n - 1 ] << 24 ) >>> 0 }, vt = function ( t ) { return 10 + ( t.filename && t.filename.length + 1 || 0 ) }, dt = function ( t, n ) { var r = n.level, e = 0 == r ? 0 : r < 6 ? 1 : 9 == r ? 3 : 2; t[ 0 ] = 120, t[ 1 ] = e << 6 | ( e ? 32 - 2 * e : 1 ) }, gt = function ( t ) { if ( 8 != ( 15 & t[ 0 ] ) || t[ 0 ] >>> 4 > 7 || ( t[ 0 ] << 8 | t[ 1 ] ) % 31 ) throw "invalid zlib data"; if ( 32 & t[ 1 ] ) throw "invalid zlib data: preset dictionaries not supported" }; function wt( t, n ) { return n || "function" != typeof t || ( n = t, t = {} ), this.ondata = n, t } var yt = function () { function t( t, n ) { n || "function" != typeof t || ( n = t, t = {} ), this.ondata = n, this.o = t || {} } return t.prototype.p = function ( t, n ) { this.ondata( K( t, this.o, 0, 0, !n ), n ) }, t.prototype.push = function ( t, n ) { if ( this.d ) throw "stream finished"; if ( !this.ondata ) throw "no stream handler"; this.d = n, this.p( t, n || !1 ) }, t }(); _e.Deflate = yt; var mt = function () { return function ( t, n ) { at( [ X, function () { return [ ot, yt ] } ], this, wt.call( this, t, n ), ( function ( t ) { var n = new yt( t.data ); onmessage = ot( n ) } ), 6 ) } }(); function bt( t, n, r ) { if ( r || ( r = n, n = {} ), "function" != typeof r ) throw "no callback"; return it( t, n, [ X ], ( function ( t ) { return rt( xt( t.data[ 0 ], t.data[ 1 ] ) ) } ), 0, r ) } function xt( t, n ) { return K( t, n || {}, 0, 0 ) } _e.AsyncDeflate = mt, _e.deflate = bt, _e.deflateSync = xt; var zt = function () { function t( t ) { this.s = {}, this.p = new n( 0 ), this.ondata = t } return t.prototype.e = function ( t ) { if ( this.d ) throw "stream finished"; if ( !this.ondata ) throw "no stream handler"; var r = this.p.length, e = new n( r + t.length ); e.set( this.p ), e.set( t, r ), this.p = e }, t.prototype.c = function ( t ) { this.d = this.s.i = t || !1; var n = this.s.b, r = U( this.p, this.o, this.s ); this.ondata( C( r, n, this.s.b ), this.d ), this.o = C( r, this.s.b - 32768 ), this.s.b = this.o.length, this.p = C( this.p, this.s.p / 8 | 0 ), this.s.p &= 7 }, t.prototype.push = function ( t, n ) { this.e( t ), this.c( n ) }, t }(); _e.Inflate = zt; var kt = function () { return function ( t ) { this.ondata = t, at( [ W, function () { return [ ot, zt ] } ], this, 0, ( function () { var t = new zt; onmessage = ot( t ) } ), 7 ) } }(); function Mt( t, n, r ) { if ( r || ( r = n, n = {} ), "function" != typeof r ) throw "no callback"; return it( t, n, [ W ], ( function ( t ) { return rt( At( t.data[ 0 ], et( t.data[ 1 ] ) ) ) } ), 1, r ) } function At( t, n ) { return U( t, n ) } _e.AsyncInflate = kt, _e.inflate = Mt, _e.inflateSync = At; var St = function () { function t( t, n ) { this.c = B(), this.l = 0, this.v = 1, yt.call( this, t, n ) } return t.prototype.push = function ( t, n ) { yt.prototype.push.call( this, t, n ) }, t.prototype.p = function ( t, n ) { this.c.p( t ), this.l += t.length; var r = K( t, this.o, this.v && vt( this.o ), n && 8, !n ); this.v && ( ct( r, this.o ), this.v = 0 ), n && ( ht( r, r.length - 8, this.c.d() ), ht( r, r.length - 4, this.l ) ), this.ondata( r, n ) }, t }(); _e.Gzip = St, _e.Compress = St; var Dt = function () { return function ( t, n ) { at( [ X, $, function () { return [ ot, yt, St ] } ], this, wt.call( this, t, n ), ( function ( t ) { var n = new St( t.data ); onmessage = ot( n ) } ), 8 ) } }(); function Ct( t, n, r ) { if ( r || ( r = n, n = {} ), "function" != typeof r ) throw "no callback"; return it( t, n, [ X, $, function () { return [ Ut ] } ], ( function ( t ) { return rt( Ut( t.data[ 0 ], t.data[ 1 ] ) ) } ), 2, r ) } function Ut( t, n ) { n || ( n = {} ); var r = B(), e = t.length; r.p( t ); var i = K( t, n, vt( n ), 8 ), o = i.length; return ct( i, n ), ht( i, o - 8, r.d() ), ht( i, o - 4, e ), i } _e.AsyncGzip = Dt, _e.AsyncCompress = Dt, _e.gzip = Ct, _e.compress = Ct, _e.gzipSync = Ut, _e.compressSync = Ut; var Ot = function () { function t( t ) { this.v = 1, zt.call( this, t ) } return t.prototype.push = function ( t, n ) { if ( zt.prototype.e.call( this, t ), this.v ) { var r = this.p.length > 3 ? lt( this.p ) : 4; if ( r >= this.p.length && !n ) return; this.p = this.p.subarray( r ), this.v = 0 } if ( n ) { if ( this.p.length < 8 ) throw "invalid gzip stream"; this.p = this.p.subarray( 0, -8 ) } zt.prototype.c.call( this, n ) }, t }(); _e.Gunzip = Ot; var Tt = function () { return function ( t ) { this.ondata = t, at( [ W, _, function () { return [ ot, zt, Ot ] } ], this, 0, ( function () { var t = new Ot; onmessage = ot( t ) } ), 9 ) } }(); function Zt( t, n, r ) { if ( r || ( r = n, n = {} ), "function" != typeof r ) throw "no callback"; return it( t, n, [ W, _, function () { return [ It ] } ], ( function ( t ) { return rt( It( t.data[ 0 ] ) ) } ), 3, r ) } function It( t, r ) { return U( t.subarray( lt( t ), -8 ), r || new n( pt( t ) ) ) } _e.AsyncGunzip = Tt, _e.gunzip = Zt, _e.gunzipSync = It; var Ft = function () { function t( t, n ) { this.c = J(), this.v = 1, yt.call( this, t, n ) } return t.prototype.push = function ( t, n ) { yt.prototype.push.call( this, t, n ) }, t.prototype.p = function ( t, n ) { this.c.p( t ); var r = K( t, this.o, this.v && 2, n && 4, !n ); this.v && ( dt( r, this.o ), this.v = 0 ), n && ht( r, r.length - 4, this.c.d() ), this.ondata( r, n ) }, t }(); _e.Zlib = Ft; var Et = function () { return function ( t, n ) { at( [ X, tt, function () { return [ ot, yt, Ft ] } ], this, wt.call( this, t, n ), ( function ( t ) { var n = new Ft( t.data ); onmessage = ot( n ) } ), 10 ) } }(); function Gt( t, n, r ) { if ( r || ( r = n, n = {} ), "function" != typeof r ) throw "no callback"; return it( t, n, [ X, tt, function () { return [ Pt ] } ], ( function ( t ) { return rt( Pt( t.data[ 0 ], t.data[ 1 ] ) ) } ), 4, r ) } function Pt( t, n ) { n || ( n = {} ); var r = J(); r.p( t ); var e = K( t, n, 2, 4 ); return dt( e, n ), ht( e, e.length - 4, r.d() ), e } _e.AsyncZlib = Et, _e.zlib = Gt, _e.zlibSync = Pt; var jt = function () { function t( t ) { this.v = 1, zt.call( this, t ) } return t.prototype.push = function ( t, n ) { if ( zt.prototype.e.call( this, t ), this.v ) { if ( this.p.length < 2 && !n ) return; this.p = this.p.subarray( 2 ), this.v = 0 } if ( n ) { if ( this.p.length < 4 ) throw "invalid zlib stream"; this.p = this.p.subarray( 0, -4 ) } zt.prototype.c.call( this, n ) }, t }(); _e.Unzlib = jt; var qt = function () { return function ( t ) { this.ondata = t, at( [ W, nt, function () { return [ ot, zt, jt ] } ], this, 0, ( function () { var t = new jt; onmessage = ot( t ) } ), 11 ) } }(); function Ht( t, n, r ) { if ( r || ( r = n, n = {} ), "function" != typeof r ) throw "no callback"; return it( t, n, [ W, nt, function () { return [ Yt ] } ], ( function ( t ) { return rt( Yt( t.data[ 0 ], et( t.data[ 1 ] ) ) ) } ), 5, r ) } function Yt( t, n ) { return U( ( gt( t ), t.subarray( 2, -4 ) ), n ) } _e.AsyncUnzlib = qt, _e.unzlib = Ht, _e.unzlibSync = Yt; var Bt = function () { function t( t ) { this.G = Ot, this.I = zt, this.Z = jt, this.ondata = t } return t.prototype.push = function ( t, r ) { if ( !this.ondata ) throw "no stream handler"; if ( this.s ) this.s.push( t, r ); else { if ( this.p && this.p.length ) { var e = new n( this.p.length + t.length ); e.set( this.p ), e.set( t, this.p.length ) } else this.p = t; if ( this.p.length > 2 ) { var i = this, o = function () { i.ondata.apply( i, arguments ) }; this.s = 31 == this.p[ 0 ] && 139 == this.p[ 1 ] && 8 == this.p[ 2 ] ? new this.G( o ) : 8 != ( 15 & this.p[ 0 ] ) || this.p[ 0 ] >> 4 > 7 || ( this.p[ 0 ] << 8 | this.p[ 1 ] ) % 31 ? new this.I( o ) : new this.Z( o ), this.s.push( this.p, r ), this.p = null } } }, t }(); _e.Decompress = Bt; var Jt = function () { function t( t ) { this.G = Tt, this.I = kt, this.Z = qt, this.ondata = t } return t.prototype.push = function ( t, n ) { Bt.prototype.push.call( this, t, n ) }, t }(); function Kt( t, n, r ) { if ( r || ( r = n, n = {} ), "function" != typeof r ) throw "no callback"; return 31 == t[ 0 ] && 139 == t[ 1 ] && 8 == t[ 2 ] ? Zt( t, n, r ) : 8 != ( 15 & t[ 0 ] ) || t[ 0 ] >> 4 > 7 || ( t[ 0 ] << 8 | t[ 1 ] ) % 31 ? Mt( t, n, r ) : Ht( t, n, r ) } function Lt( t, n ) { return 31 == t[ 0 ] && 139 == t[ 1 ] && 8 == t[ 2 ] ? It( t, n ) : 8 != ( 15 & t[ 0 ] ) || t[ 0 ] >> 4 > 7 || ( t[ 0 ] << 8 | t[ 1 ] ) % 31 ? At( t, n ) : Yt( t, n ) } _e.AsyncDecompress = Jt, _e.decompress = Kt, _e.decompressSync = Lt; var Nt = function ( t, r, e, i ) { for ( var o in t ) { var a = t[ o ], s = r + o; a instanceof n ? e[ s ] = [ a, i ] : Array.isArray( a ) ? e[ s ] = [ a[ 0 ], L( i, a[ 1 ] ) ] : Nt( a, s + "/", e, i ) } }, Qt = "undefined" != typeof TextEncoder && new TextEncoder, Rt = "undefined" != typeof TextDecoder && new TextDecoder, Vt = 0; try { Rt.decode( q, { stream: !0 } ), Vt = 1 } catch ( t ) { } var Wt = function ( t ) { for ( var n = "", r = 0;; ) { var e = t[ r++ ], i = ( e > 127 ) + ( e > 223 ) + ( e > 239 ); if ( r + i > t.length ) return [ n, C( t, r - 1 ) ]; i ? 3 == i ? ( e = ( ( 15 & e ) << 18 | ( 63 & t[ r++ ] ) << 12 | ( 63 & t[ r++ ] ) << 6 | 63 & t[ r++ ] ) - 65536, n += String.fromCharCode( 55296 | e >> 10, 56320 | 1023 & e ) ) : n += String.fromCharCode( 1 & i ? ( 31 & e ) << 6 | 63 & t[ r++ ] : ( 15 & e ) << 12 | ( 63 & t[ r++ ] ) << 6 | 63 & t[ r++ ] ) : n += String.fromCharCode( e ) } }, Xt = function () { function t( t ) { this.ondata = t, Vt ? this.t = new TextDecoder : this.p = q } return t.prototype.push = function ( t, r ) { if ( !this.ondata ) throw "no callback"; if ( r = !!r, this.t ) { if ( this.ondata( this.t.decode( t, { stream: !0 } ), r ), r ) { if ( this.t.decode().length ) throw "invalid utf-8 data"; this.t = null } } else { if ( !this.p ) throw "stream finished"; var e = new n( this.p.length + t.length ); e.set( this.p ), e.set( t, this.p.length ); var i = Wt( e ), o = i[ 0 ], a = i[ 1 ]; if ( r ) { if ( a.length ) throw "invalid utf-8 data"; this.p = null } else this.p = a; this.ondata( o, r ) } }, t }(); _e.DecodeUTF8 = Xt; var $t = function () { function t( t ) { this.ondata = t } return t.prototype.push = function ( t, n ) { if ( !this.ondata ) throw "no callback"; if ( this.d ) throw "stream finished"; this.ondata( _t( t ), this.d = n || !1 ) }, t }(); function _t( t, r ) { if ( r ) { for ( var e = new n( t.length ), i = 0;i < t.length;++i )e[ i ] = t.charCodeAt( i ); return e } if ( Qt ) return Qt.encode( t ); var o = t.length, a = new n( t.length + ( t.length >> 1 ) ), s = 0, f = function ( t ) { a[ s++ ] = t }; for ( i = 0;i < o;++i ) { if ( s + 5 > a.length ) { var u = new n( s + 8 + ( o - i << 1 ) ); u.set( a ), a = u } var h = t.charCodeAt( i ); h < 128 || r ? f( h ) : h < 2048 ? ( f( 192 | h >> 6 ), f( 128 | 63 & h ) ) : h > 55295 && h < 57344 ? ( f( 240 | ( h = 65536 + ( 1047552 & h ) | 1023 & t.charCodeAt( ++i ) ) >> 18 ), f( 128 | h >> 12 & 63 ), f( 128 | h >> 6 & 63 ), f( 128 | 63 & h ) ) : ( f( 224 | h >> 12 ), f( 128 | h >> 6 & 63 ), f( 128 | 63 & h ) ) } return C( a, 0, s ) } function tn( t, n ) { if ( n ) { for ( var r = "", e = 0;e < t.length;e += 16384 )r += String.fromCharCode.apply( null, t.subarray( e, e + 16384 ) ); return r } if ( Rt ) return Rt.decode( t ); var i = Wt( t ); if ( i[ 1 ].length ) throw "invalid utf-8 data"; return i[ 0 ] } _e.EncodeUTF8 = $t, _e.strToU8 = _t, _e.strFromU8 = tn; var nn = function ( t ) { return 1 == t ? 3 : t < 6 ? 2 : 9 == t ? 1 : 0 }, rn = function ( t, n ) { return n + 30 + st( t, n + 26 ) + st( t, n + 28 ) }, en = function ( t, n, r ) { var e = st( t, n + 28 ), i = tn( t.subarray( n + 46, n + 46 + e ), !( 2048 & st( t, n + 8 ) ) ), o = n + 46 + e, a = ft( t, n + 20 ), s = r && 4294967295 == a ? on( t, o ) : [ a, ft( t, n + 24 ), ft( t, n + 42 ) ], f = s[ 0 ], u = s[ 1 ], h = s[ 2 ]; return [ st( t, n + 10 ), f, u, i, o + st( t, n + 30 ) + st( t, n + 32 ), h ] }, on = function ( t, n ) { for ( ;1 != st( t, n );n += 4 + st( t, n + 2 ) ); return [ ut( t, n + 12 ), ut( t, n + 4 ), ut( t, n + 20 ) ] }, an = function ( t ) { var n = 0; if ( t ) for ( var r in t ) { var e = t[ r ].length; if ( e > 65535 ) throw "extra field too long"; n += e + 4 } return n }, sn = function ( t, n, r, e, i, o, a, s ) { var f = e.length, u = r.extra, h = s && s.length, c = an( u ); ht( t, n, null != a ? 33639248 : 67324752 ), n += 4, null != a && ( t[ n++ ] = 20, t[ n++ ] = r.os ), t[ n ] = 20, n += 2, t[ n++ ] = r.flag << 1 | ( null == o && 8 ), t[ n++ ] = i && 8, t[ n++ ] = 255 & r.compression, t[ n++ ] = r.compression >> 8; var l = new Date( null == r.mtime ? Date.now() : r.mtime ), p = l.getFullYear() - 1980; if ( p < 0 || p > 119 ) throw "date not in range 1980-2099"; if ( ht( t, n, p << 25 | l.getMonth() + 1 << 21 | l.getDate() << 16 | l.getHours() << 11 | l.getMinutes() << 5 | l.getSeconds() >>> 1 ), n += 4, null != o && ( ht( t, n, r.crc ), ht( t, n + 4, o ), ht( t, n + 8, r.size ) ), ht( t, n + 12, f ), ht( t, n + 14, c ), n += 16, null != a && ( ht( t, n, h ), ht( t, n + 6, r.attrs ), ht( t, n + 10, a ), n += 14 ), t.set( e, n ), n += f, c ) for ( var v in u ) { var d = u[ v ], g = d.length; ht( t, n, +v ), ht( t, n + 2, g ), t.set( d, n + 4 ), n += 4 + g } return h && ( t.set( s, n ), n += h ), n }, fn = function ( t, n, r, e, i ) { ht( t, n, 101010256 ), ht( t, n + 8, r ), ht( t, n + 10, r ), ht( t, n + 12, e ), ht( t, n + 16, i ) }, un = function () { function t( t ) { this.filename = t, this.c = B(), this.size = 0, this.compression = 0 } return t.prototype.process = function ( t, n ) { this.ondata( null, t, n ) }, t.prototype.push = function ( t, n ) { if ( !this.ondata ) throw "no callback - add to ZIP archive before pushing"; this.c.p( t ), this.size += t.length, n && ( this.crc = this.c.d() ), this.process( t, n || !1 ) }, t }(); _e.ZipPassThrough = un; var hn = function () { function t( t, n ) { var r = this; n || ( n = {} ), un.call( this, t ), this.d = new yt( n, ( function ( t, n ) { r.ondata( null, t, n ) } ) ), this.compression = 8, this.flag = nn( n.level ) } return t.prototype.process = function ( t, n ) { try { this.d.push( t, n ) } catch ( t ) { this.ondata( t, null, n ) } }, t.prototype.push = function ( t, n ) { un.prototype.push.call( this, t, n ) }, t }(); _e.ZipDeflate = hn; var cn = function () { function t( t, n ) { var r = this; n || ( n = {} ), un.call( this, t ), this.d = new mt( n, ( function ( t, n, e ) { r.ondata( t, n, e ) } ) ), this.compression = 8, this.flag = nn( n.level ), this.terminate = this.d.terminate } return t.prototype.process = function ( t, n ) { this.d.push( t, n ) }, t.prototype.push = function ( t, n ) { un.prototype.push.call( this, t, n ) }, t }(); _e.AsyncZipDeflate = cn; var ln = function () { function t( t ) { this.ondata = t, this.u = [], this.d = 1 } return t.prototype.add = function ( t ) { var r = this; if ( 2 & this.d ) throw "stream finished"; var e = _t( t.filename ), i = e.length, o = t.comment, a = o && _t( o ), s = i != t.filename.length || a && o.length != a.length, f = i + an( t.extra ) + 30; if ( i > 65535 ) throw "filename too long"; var u = new n( f ); sn( u, 0, t, e, s ); var h = [ u ], c = function () { for ( var t = 0, n = h;t < n.length;t++ )r.ondata( null, n[ t ], !1 ); h = [] }, l = this.d; this.d = 0; var p = this.u.length, v = L( t, { f: e, u: s, o: a, t: function () { t.terminate && t.terminate() }, r: function () { if ( c(), l ) { var t = r.u[ p + 1 ]; t ? t.r() : r.d = 1 } l = 1 } } ), d = 0; t.ondata = function ( e, i, o ) { if ( e ) r.ondata( e, i, o ), r.terminate(); else if ( d += i.length, h.push( i ), o ) { var a = new n( 16 ); ht( a, 0, 134695760 ), ht( a, 4, t.crc ), ht( a, 8, d ), ht( a, 12, t.size ), h.push( a ), v.c = d, v.b = f + d + 16, v.crc = t.crc, v.size = t.size, l && v.r(), l = 1 } else l && c() }, this.u.push( v ) }, t.prototype.end = function () { var t = this; if ( 2 & this.d ) { if ( 1 & this.d ) throw "stream finishing"; throw "stream finished" } this.d ? this.e() : this.u.push( { r: function () { 1 & t.d && ( t.u.splice( -1, 1 ), t.e() ) }, t: function () { } } ), this.d = 3 }, t.prototype.e = function () { for ( var t = 0, r = 0, e = 0, i = 0, o = this.u;i < o.length;i++ )e += 46 + ( u = o[ i ] ).f.length + an( u.extra ) + ( u.o ? u.o.length : 0 ); for ( var a = new n( e + 22 ), s = 0, f = this.u;s < f.length;s++ ) { var u; sn( a, t, u = f[ s ], u.f, u.u, u.c, r, u.o ), t += 46 + u.f.length + an( u.extra ) + ( u.o ? u.o.length : 0 ), r += u.b } fn( a, t, this.u.length, e, r ), this.ondata( null, a, !0 ), this.d = 2 }, t.prototype.terminate = function () { for ( var t = 0, n = this.u;t < n.length;t++ )n[ t ].t(); this.d = 2 }, t }(); function pn( t, r, e ) { if ( e || ( e = r, r = {} ), "function" != typeof e ) throw "no callback"; var i = {}; Nt( t, "", i, r ); var o = Object.keys( i ), a = o.length, s = 0, f = 0, u = a, h = Array( a ), c = [], l = function () { for ( var t = 0;t < c.length;++t )c[ t ]() }, p = function () { var t = new n( f + 22 ), r = s, i = f - s; f = 0; for ( var o = 0;o < u;++o ) { var a = h[ o ]; try { var c = a.c.length; sn( t, f, a, a.f, a.u, c ); var l = 30 + a.f.length + an( a.extra ), p = f + l; t.set( a.c, p ), sn( t, s, a, a.f, a.u, c, f, a.m ), s += 16 + l + ( a.m ? a.m.length : 0 ), f = p + c } catch ( t ) { return e( t, null ) } } fn( t, s, h.length, i, r ), e( null, t ) }; a || p(); for ( var v = function ( t ) { var n = o[ t ], r = i[ n ], u = r[ 0 ], v = r[ 1 ], d = B(), g = u.length; d.p( u ); var w = _t( n ), y = w.length, m = v.comment, b = m && _t( m ), x = b && b.length, z = an( v.extra ), k = 0 == v.level ? 0 : 8, M = function ( r, i ) { if ( r ) l(), e( r, null ); else { var o = i.length; h[ t ] = L( v, { size: g, crc: d.d(), c: i, f: w, m: b, u: y != n.length || b && m.length != x, compression: k } ), s += 30 + y + z + o, f += 76 + 2 * ( y + z ) + ( x || 0 ) + o, --a || p() } }; if ( y > 65535 && M( "filename too long", null ), k ) if ( g < 16e4 ) try { M( null, xt( u, v ) ) } catch ( t ) { M( t, null ) } else c.push( bt( u, v, M ) ); else M( null, u ) }, d = 0;d < u;++d )v( d ); return l } function vn( t, r ) { r || ( r = {} ); var e = {}, i = []; Nt( t, "", e, r ); var o = 0, a = 0; for ( var s in e ) { var f = e[ s ], u = f[ 0 ], h = f[ 1 ], c = 0 == h.level ? 0 : 8, l = ( M = _t( s ) ).length, p = h.comment, v = p && _t( p ), d = v && v.length, g = an( h.extra ); if ( l > 65535 ) throw "filename too long"; var w = c ? xt( u, h ) : u, y = w.length, m = B(); m.p( u ), i.push( L( h, { size: u.length, crc: m.d(), c: w, f: M, m: v, u: l != s.length || v && p.length != d, o: o, compression: c } ) ), o += 30 + l + g + y, a += 76 + 2 * ( l + g ) + ( d || 0 ) + y } for ( var b = new n( a + 22 ), x = o, z = a - o, k = 0;k < i.length;++k ) { var M; sn( b, ( M = i[ k ] ).o, M, M.f, M.u, M.c.length ); var A = 30 + M.f.length + an( M.extra ); b.set( M.c, M.o + A ), sn( b, o, M, M.f, M.u, M.c.length, M.o, M.m ), o += 16 + A + ( M.m ? M.m.length : 0 ) } return fn( b, o, i.length, z, x ), b } _e.Zip = ln, _e.zip = pn, _e.zipSync = vn; var dn = function () { function t() { } return t.prototype.push = function ( t, n ) { this.ondata( null, t, n ) }, t.compression = 0, t }(); _e.UnzipPassThrough = dn; var gn = function () { function t() { var t = this; this.i = new zt( ( function ( n, r ) { t.ondata( null, n, r ) } ) ) } return t.prototype.push = function ( t, n ) { try { this.i.push( t, n ) } catch ( r ) { this.ondata( r, t, n ) } }, t.compression = 8, t }(); _e.UnzipInflate = gn; var wn = function () { function t( t, n ) { var r = this; n < 32e4 ? this.i = new zt( ( function ( t, n ) { r.ondata( null, t, n ) } ) ) : ( this.i = new kt( ( function ( t, n, e ) { r.ondata( t, n, e ) } ) ), this.terminate = this.i.terminate ) } return t.prototype.push = function ( t, n ) { this.i.terminate && ( t = C( t, 0 ) ), this.i.push( t, n ) }, t.compression = 8, t }(); _e.AsyncUnzipInflate = wn; var yn = function () { function t( t ) { this.onfile = t, this.k = [], this.o = { 0: dn }, this.p = q } return t.prototype.push = function ( t, r ) { var e = this; if ( !this.onfile ) throw "no callback"; if ( !this.p ) throw "stream finished"; if ( this.c > 0 ) { var i = Math.min( this.c, t.length ), o = t.subarray( 0, i ); if ( this.c -= i, this.d ? this.d.push( o, !this.c ) : this.k[ 0 ].push( o ), ( t = t.subarray( i ) ).length ) return this.push( t, r ) } else { var a = 0, s = 0, f = void 0, u = void 0; this.p.length ? t.length ? ( ( u = new n( this.p.length + t.length ) ).set( this.p ), u.set( t, this.p.length ) ) : u = this.p : u = t; for ( var h = u.length, c = this.c, l = c && this.d, p = function () { var t, n = ft( u, s ); if ( 67324752 == n ) { a = 1, f = s, v.d = null, v.c = 0; var r = st( u, s + 6 ), i = st( u, s + 8 ), o = 2048 & r, l = 8 & r, p = st( u, s + 26 ), d = st( u, s + 28 ); if ( h > s + 30 + p + d ) { var g = []; v.k.unshift( g ), a = 2; var w, y = ft( u, s + 18 ), m = ft( u, s + 22 ), b = tn( u.subarray( s + 30, s += 30 + p ), !o ); 4294967295 == y ? ( t = l ? [ -2 ] : on( u, s ), y = t[ 0 ], m = t[ 1 ] ) : l && ( y = -1 ), s += d, v.c = y; var x = { name: b, compression: i, start: function () { if ( !x.ondata ) throw "no callback"; if ( y ) { var t = e.o[ i ]; if ( !t ) throw "unknown compression type " + i; ( w = y < 0 ? new t( b ) : new t( b, y, m ) ).ondata = function ( t, n, r ) { x.ondata( t, n, r ) }; for ( var n = 0, r = g;n < r.length;n++ )w.push( r[ n ], !1 ); e.k[ 0 ] == g && e.c ? e.d = w : w.push( q, !0 ) } else x.ondata( null, q, !0 ) }, terminate: function () { w && w.terminate && w.terminate() } }; y >= 0 && ( x.size = y, x.originalSize = m ), v.onfile( x ) } return "break" } if ( c ) { if ( 134695760 == n ) return f = s += 12 + ( -2 == c && 8 ), a = 3, v.c = 0, "break"; if ( 33639248 == n ) return f = s -= 4, a = 3, v.c = 0, "break" } }, v = this;s < h - 4 && "break" !== p();++s ); if ( this.p = q, c < 0 ) { var d = u.subarray( 0, a ? f - 12 - ( -2 == c && 8 ) - ( 134695760 == ft( u, f - 16 ) && 4 ) : s ); l ? l.push( d, !!a ) : this.k[ +( 2 == a ) ].push( d ) } if ( 2 & a ) return this.push( u.subarray( s ), r ); this.p = u.subarray( s ) } if ( r ) { if ( this.c ) throw "invalid zip file"; this.p = null } }, t.prototype.register = function ( t ) { this.o[ t.compression ] = t }, t }(); function mn( t, r ) { if ( "function" != typeof r ) throw "no callback"; for ( var e = [], i = function () { for ( var t = 0;t < e.length;++t )e[ t ]() }, o = {}, a = t.length - 22;101010256 != ft( t, a );--a )if ( !a || t.length - a > 65558 ) return void r( "invalid zip file", null ); var s = st( t, a + 8 ); s || r( null, {} ); var f = s, u = ft( t, a + 16 ), h = 4294967295 == u; if ( h ) { if ( a = ft( t, a - 12 ), 101075792 != ft( t, a ) ) return void r( "invalid zip file", null ); f = s = ft( t, a + 32 ), u = ft( t, a + 48 ) } for ( var c = function ( a ) { var f = en( t, u, h ), c = f[ 0 ], l = f[ 1 ], p = f[ 2 ], v = f[ 3 ], d = f[ 4 ], g = rn( t, f[ 5 ] ); u = d; var w = function ( t, n ) { t ? ( i(), r( t, null ) ) : ( o[ v ] = n, --s || r( null, o ) ) }; if ( c ) if ( 8 == c ) { var y = t.subarray( g, g + l ); if ( l < 32e4 ) try { w( null, At( y, new n( p ) ) ) } catch ( t ) { w( t, null ) } else e.push( Mt( y, { size: p }, w ) ) } else w( "unknown compression type " + c, null ); else w( null, C( t, g, g + l ) ) }, l = 0;l < f;++l )c(); return i } function bn( t ) { for ( var r = {}, e = t.length - 22;101010256 != ft( t, e );--e )if ( !e || t.length - e > 65558 ) throw "invalid zip file"; var i = st( t, e + 8 ); if ( !i ) return {}; var o = ft( t, e + 16 ), a = 4294967295 == o; if ( a ) { if ( e = ft( t, e - 12 ), 101075792 != ft( t, e ) ) throw "invalid zip file"; i = ft( t, e + 32 ), o = ft( t, e + 48 ) } for ( var s = 0;s < i;++s ) { var f = en( t, o, a ), u = f[ 0 ], h = f[ 1 ], c = f[ 2 ], l = f[ 3 ], p = f[ 4 ], v = rn( t, f[ 5 ] ); if ( o = p, u ) { if ( 8 != u ) throw "unknown compression type " + u; r[ l ] = At( t.subarray( v, v + h ), new n( c ) ) } else r[ l ] = C( t, v, v + h ) } return r } _e.Unzip = yn, _e.unzip = mn, _e.unzipSync = bn; return _e } )


// exportToUSDZ puzzle
export function exportToUSDZ( objSelector ) {
  if ( objSelector === '' ) {
    var obj = _pGlob.appInstance.scene;
  } else {
    var obj = getObjectByName( objSelector );
  }
  if ( !obj )
    return;
  var usdzExporter = new USDZExporter();
  return new Promise( function ( resolve, reject ) {
    usdzExporter.parse( obj ).then( function ( value ) {
      var dataUrl = URL.createObjectURL( new Blob( [ value ], { type: 'application/octet-stream' } ) );
      resolve( dataUrl );
    }, function ( reason ) {
      console.error( 'exportToUSDZ: export failed: ' + reason );
      reject( reason );
    } );
  } );
}
