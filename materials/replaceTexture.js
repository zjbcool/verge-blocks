/* 

replaceTexture('<matName>', '<texName>', './newTexture.png', function() {});
 */
import { _pGlob } from "../verge";
import {
    SceneUtils,
    VideoTexture,
    ImageLoader,
    FileLoader,
    RGBELoader,
    UnsignedByteType,
    RGBEEncoding,
    LinearFilter,
    RGBFormat,
    RGBAFormat,
    CanvasTexture
} from '../v3d.module'
import {matGetEditableTextures, matReplaceEditableTexture} from '../util/util'


// replaceTexture puzzle
function replaceTexture( matName, texName, texUrlOrElem, doCb ) {

    var textures = matGetEditableTextures( matName, true ).filter( function ( elem ) {
        return elem.name == texName;
    } );

    if ( !textures.length )
        return;

    if ( texUrlOrElem instanceof Promise ) {

        texUrlOrElem.then( function ( response ) {
            processImageUrl( response );
        }, function ( error ) { } );

    } else if ( typeof texUrlOrElem == 'string' ) {

        processImageUrl( texUrlOrElem );

        /**
         * NOTE: not checking for the MediaHTML5 constructor, because otherwise this
         * puzzle would always provide the code that's not needed most of the time
         */
    } else if ( texUrlOrElem instanceof Object && texUrlOrElem.source
        instanceof HTMLVideoElement ) {

        processVideo( texUrlOrElem.source );

    } else if ( texUrlOrElem instanceof HTMLCanvasElement ) {

        processCanvas( texUrlOrElem );

    } else {

        return;

    }

    function processImageUrl( url ) {

        var isHDR = ( url.search( /\.hdr$/ ) > 0 );

        if ( !isHDR ) {
            var loader = new ImageLoader();
            loader.setCrossOrigin( 'Anonymous' );
        } else {
            var loader = new FileLoader();
            loader.setResponseType( 'arraybuffer' );
        }

        loader.load( url, function ( image ) {
            // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
            var isJPEG = url.search( /\.(jpg|jpeg)$/ ) > 0 || url.search( /^data\:image\/jpeg/ ) === 0;

            textures.forEach( function ( elem ) {

                if ( !isHDR ) {
                    elem.image = image;
                } else {
                    // parse loaded HDR buffer
                    var rgbeLoader = new RGBELoader();
                    var texData = rgbeLoader.parse( image );

                    // NOTE: reset params since the texture may be converted to float
                    elem.type = UnsignedByteType;
                    elem.encoding = RGBEEncoding;

                    elem.image = {
                        data: texData.data,
                        width: texData.width,
                        height: texData.height
                    }

                    elem.magFilter = LinearFilter;
                    elem.minFilter = LinearFilter;
                    elem.generateMipmaps = false;
                    elem.isDataTexture = true;

                }

                elem.format = isJPEG ? RGBFormat : RGBAFormat;
                elem.needsUpdate = true;

                // update world material if it is using this texture
                if ( _pGlob.appInstance.scene !== null && _pGlob.appInstance.scene.worldMaterial !== null ) {
                    var wMat = _pGlob.appInstance.scene.worldMaterial;
                    for ( var texName in wMat.nodeTextures ) {
                        if ( wMat.nodeTextures[ texName ] == elem ) {
                            _pGlob.appInstance.updateEnvironment( wMat );
                        }
                    }
                }
            } );

            // exec once
            doCb();

        } );
    }

    function processVideo( elem ) {
        var videoTex = new VideoTexture( elem );
        videoTex.flipY = false;
        videoTex.name = texName;

        var videoAssigned = false;

        var mats = SceneUtils.getMaterialsByName( _pGlob.appInstance, matName );
        mats.forEach( function ( mat ) {

            textures.forEach( function ( tex ) {
                matReplaceEditableTexture( mat, tex, videoTex );
            } );

            mat.needsUpdate = true;
            videoAssigned = true;
        } );

        if ( videoAssigned )
            doCb();

    }

    function processCanvas( elem ) {
        var canvasTex = new CanvasTexture( elem );
        canvasTex.flipY = false;
        canvasTex.name = texName;

        var canvasAssigned = false;

        var mats = SceneUtils.getMaterialsByName( _pGlob.appInstance, matName );
        mats.forEach( function ( mat ) {

            textures.forEach( function ( tex ) {
                matReplaceEditableTexture( mat, tex, canvasTex );
            } );

            mat.needsUpdate = true;
            canvasAssigned = true;
        } );

        if ( canvasAssigned ) {

            if ( _pGlob.PL ) {
                _pGlob.PL.canvasTextures = _pGlob.PL.canvasTextures || {};
                _pGlob.PL.canvasTextures[ canvasTex.image.id ] = canvasTex;
            }

            doCb();
        }

    }
}

export {
    replaceTexture
}



