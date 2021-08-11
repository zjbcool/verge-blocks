import { _pGlob } from "../verge";
import { Raycaster, Scene } from "../v3d.module";
import { CSS3DRenderer } from "./CSS3DRenderer";

// 创建CSS3D场景、渲染器
const raycaster = new Raycaster();
const css3dApp = {
  scene: null,
  renderer: null,
  container: null,
  render: function () {
    if ( this.renderer && this.scene ) {
      this.renderer.render( this.scene, _pGlob.appInstance.camera );
    }
  },
  dispose: function () {
    this.scene && ( this.scene = null );
    this.renderer && ( this.container.removeChild( this.renderer.domElement ), this.renderer = null );
    window.removeEventListener( "resize", resize );
  }
}

function resize() {
  css3dApp.renderer.setSize( _pGlob.appInstance.getWidth(), _pGlob.appInstance.getHeight() );
}

function createCss3dApp( CSS3D_CONTAINER_ID ) {
  css3dApp.scene = new Scene();
  css3dApp.renderer = new CSS3DRenderer();
  css3dApp.renderer.setSize( window.innerWidth, window.innerHeight );

  window.addEventListener( "resize", resize );
  document.addEventListener( "webkitfullscreenchange", resize );
  document.addEventListener( "mozfullscreenchange", resize );
  document.addEventListener( "msfullscreenchange", resize );
  document.addEventListener( "fullscreenchange", resize );

  css3dApp.container = document.getElementById( CSS3D_CONTAINER_ID );
  if ( css3dApp.container ) css3dApp.container.appendChild( css3dApp.renderer.domElement );
  return css3dApp;
}

// css3dOnHoverEvent puzzle
function css3dOnHoverEvent( css3dObj, cbOver, cbOut ) {
  const v3dContainer = _pGlob.appInstance.container;
  const v3dCanvas = _pGlob.appInstance.renderer.domElement;
  
  // 针对桌面设置，鼠标离开CSS3D物体事件
  css3dObj.element.addEventListener( "mouseleave", function ( event ) {
    event.preventDefault();
    cbOut();
  } );
  // 针对移动设备，指针离开CSS3D物体事件
  v3dContainer.addEventListener( "touchstart", function ( event ) {
    event.preventDefault();
    if ( event.target.children[0] && event.target.children[0].children[0] === css3dObj.element ) {
      cbOut();
    }
  } );
  // 指针经过CSS3D物体事件
  v3dCanvas.addEventListener( "mousemove", v3dListener );
  v3dCanvas.addEventListener( "touchstart", v3dListener );

  function v3dListener( event ) {
    // to handle unload in loadScene puzzle
    if ( !_pGlob.appInstance.getCamera() ) return;

    event.preventDefault();

    let xNorm = 0,
      yNorm = 0;
    if ( event instanceof MouseEvent ) {
      //if (mouseButtons && mouseButtons.indexOf(event.button) == -1)
      //    return;
      xNorm = event.offsetX / v3dContainer.clientWidth;
      yNorm = event.offsetY / v3dContainer.clientHeight;
    } else if ( event instanceof TouchEvent ) {
      const rect = v3dContainer.getBoundingClientRect();
      xNorm = ( event.changedTouches[ 0 ].clientX - rect.left ) / rect.width;
      yNorm = ( event.changedTouches[ 0 ].clientY - rect.top ) / rect.height;
    }

    _pGlob.screenCoords.x = xNorm * 2 - 1;
    _pGlob.screenCoords.y = -yNorm * 2 + 1;
    raycaster.setFromCamera(
      _pGlob.screenCoords,
      _pGlob.appInstance.getCamera( true )
    );
    let objList = [];
    _pGlob.appInstance.scene.traverse( function ( obj ) {
      objList.push( obj );
    } );
    const intersects = raycaster.intersectObjects( objList );

    if ( intersects.length && intersects[ 0 ].object.name == css3dObj.name ) {
      cbOver();
    }
  }
}

// css3dControlsEnabled puzzle
function css3dControlsEnabled( flag ) {
  if ( flag ) {
    _pGlob.appInstance.renderer.domElement.style.pointerEvents = "none";
    css3dApp.container.style.pointerEvents = "auto";
  } else {
    _pGlob.appInstance.renderer.domElement.style.pointerEvents = "auto";
    css3dApp.container.style.pointerEvents = "none";
  }
}

export {
  createCss3dApp,
  css3dOnHoverEvent,
  css3dControlsEnabled
}
