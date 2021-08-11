/* 
蒙板渲染：
参数：
background - Color 背景
regularObj - 正常物体，支持物体、组
scopedObj - 局部物体，支持物体、组
maskObjs - 蒙板物体，支持物体、组

e.g
maskRender( {
  background: '#dddddd' ,
  regularObjs: [ 'GROUP', 'regularObjs' ],
  scopedObjs: [ 'GROUP', 'scopedObjs' ],
  maskObjs: [ 'GROUP', 'maskObjs' ],
} )

 */
import { _pGlob } from '../verge'
import { Color } from '../v3d.module'
import { retrieveObjectNames, getObjectByName } from '../util/util'

export function maskRender( options ) {
  const { background, regularObjs, scopedObjs, maskObjs } = options;
  const { renderer, scene, camera, renderCallbacks } = _pGlob.appInstance;

  const LY_REGULAR = 0;
  const LY_SCOPED = 2;
  const LY_MASK = 3;

  scene.background = new Color( background );

  function setLayer( objSelctor, layer ) {
    const objNames = retrieveObjectNames( objSelctor );
    for ( let i = 0;i < objNames.length;i++ ) {
      const objName = objNames[ i ]
      if ( !objName )
        continue;
      getObjectByName( objName ).layers.set( layer );
    }
  }

  setLayer( regularObjs, LY_REGULAR );
  setLayer( scopedObjs, LY_SCOPED );
  setLayer( maskObjs, LY_MASK );

  const gl = renderer.getContext();
  renderer.autoClear = false;
  renderer.autoClearColor = false;

  renderCallbacks.push( () => {
    renderer.clear( true, true, true );

    // ---- regular objs
    camera.layers.set( LY_REGULAR );
    _pGlob.appInstance.render();

    // ----
    gl.enable( gl.STENCIL_TEST );

    // ---- viewplane
    gl.stencilFunc( gl.ALWAYS, 0, 0xFF );
    gl.stencilOp( gl.KEEP, gl.KEEP, gl.INCR );
    gl.stencilMask( 0xFF );
    gl.depthMask( false );
    gl.colorMask( false, false, false, false );
    camera.layers.set( LY_MASK );
    _pGlob.appInstance.render();

    // ---- scoped objs
    gl.stencilFunc( gl.NOTEQUAL, 0, 0xFF );
    gl.stencilOp( gl.KEEP, gl.KEEP, gl.KEEP );
    gl.stencilMask( 0x00 );
    gl.depthMask( true );
    gl.colorMask( true, true, true, true );
    camera.layers.set( LY_SCOPED );
    _pGlob.appInstance.render();

    // ----
    gl.disable( gl.STENCIL_TEST );
    camera.layers.set( LY_REGULAR );
  }
  );
}
