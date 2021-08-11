
import {
  Cache,
  App,
  SimplePreloader,
  Preloader,
  Vector2,
  Vector3,
  Euler,
  Quaternion,
  Color,
  Matrix4,
  Plane,
  Raycaster,
  EventDispatcher
} from './v3d.module'

const _pGlob = {
  objCache: {},
  fadeAnnotations: true,
  pickedObject: '',
  hoveredObject: '',
  mediaElements: {},
  loadedFile: '',
  states: [],
  percentage: 0,
  openedFile: '',
  xrSessionAcquired: false,
  xrSessionCallbacks: [],
  screenCoords: new Vector2(),
  intervalTimers: {},

  AXIS_X: new Vector3( 1, 0, 0 ),
  AXIS_Y: new Vector3( 0, 1, 0 ),
  AXIS_Z: new Vector3( 0, 0, 1 ),
  MIN_DRAG_SCALE: 10e-4,
  SET_OBJ_ROT_EPS: 1e-8,

  vec2Tmp: new Vector2(),
  vec2Tmp2: new Vector2(),
  vec3Tmp: new Vector3(),
  vec3Tmp2: new Vector3(),
  vec3Tmp3: new Vector3(),
  vec3Tmp4: new Vector3(),
  eulerTmp: new Euler(),
  eulerTmp2: new Euler(),
  quatTmp: new Quaternion(),
  quatTmp2: new Quaternion(),
  colorTmp: new Color(),
  mat4Tmp: new Matrix4(),
  planeTmp: new Plane(),
  raycasterTmp: new Raycaster(),

  PL: {},
  _EVENT: new EventDispatcher(),
  appInstance: null
}

const CONTAINER_ID = 'v3d-container';

// 创建和初始化应用
function createApp(initOptions) {
  Cache.enabled = true;
  var ctxSettings = {};
  if ( initOptions.useBkgTransp ) ctxSettings.alpha = true;
  if ( initOptions.preserveDrawBuf ) ctxSettings.preserveDrawingBuffer = true;

  var preloader = initOptions.useCustomPreloader ?
    createCustomPreloader( initOptions.preloaderProgressCb,
      initOptions.preloaderEndCb ) :
    new SimplePreloader( {
      container: CONTAINER_ID
    } );

  var app = new App( CONTAINER_ID, ctxSettings, preloader );
  _pGlob.appInstance = app;

  if ( initOptions.useBkgTransp ) {
    app.clearBkgOnLoad = true;
    app.renderer.setClearColor( 0x000000, 0 );
    app.renderer.domElement.style.background = initOptions.containerBackground;
  }

  if ( initOptions.preloaderStartCb ) initOptions.preloaderStartCb();
  
  return app;
}

// 加载场景
function loadScene( sceneURL ) {
  const app = _pGlob.appInstance;
  app.loadScene( sceneURL, () => {
    app.enableControls();
    app.run();
    dispatchEvent( {
      type: 'sceneready'
    } );
  }, null, () => reject( new Error( '无法加载场景 ' + sceneURL ) ) );
}

/* 
场景加载完成后的钩子函数
 */
function onSceneReady( callback ) {
  _pGlob._EVENT.addEventListener( 'sceneready', callback )
}

/* 
派发事件 
参数：
event - object e.g { type: 'enableOutlne', message: 'some params' } 
*/
function dispatchEvent( event ) {
  _pGlob._EVENT.dispatchEvent( event )
}

/* 
添加事件监听函数
参数：
type - string e.g 'enableOutline'
listener - function 事件处理函数 
*/
function addEventListener( type, listener ) {
  _pGlob._EVENT.addEventListener( type, listener )
}

// 自定义默认加载器
function customSimplePreloader( options ) {
  const { background, logo, bar, border } = options;
  function $( className ) {
    var styles = document.styleSheets;
    for ( var i = 0;i < styles.length;i++ ) {
      /**
      * workaround for "DOMException: Failed to read the 'cssRules' property
      * from 'CSSStyleSheet': Cannot access rules"
      */
      try { var cssRules = styles[ i ].cssRules; }
      catch ( e ) { continue; }

      for ( var j = 0;j < cssRules.length;j++ ) {
        var cssRule = cssRules[ j ];
        if ( cssRule.selectorText == className )
          return cssRule.style;
      }
    }
  }

  $( '.v3d-simple-preloader-background' )[ 'background' ] = background;
  $( '.v3d-simple-preloader-logo' )[ 'background' ] = logo;
  $( '.v3d-simple-preloader-bar' )[ 'background' ] = bar;
  $( '.v3d-simple-preloader-bar' )[ 'border' ] = border;
}

function createCustomPreloader( updateCb, finishCb ) {
  function CustomPreloader() {
    Preloader.call( this );
  }

  CustomPreloader.prototype = Object.assign( Object.create( Preloader.prototype ), {
    onUpdate: function ( percentage ) {
      Preloader.prototype.onUpdate.call( this, percentage );
      if ( updateCb ) updateCb( percentage );
    },
    onFinish: function () {
      Preloader.prototype.onFinish.call( this );
      if ( finishCb ) finishCb();
    }
  } );

  return new CustomPreloader();
}

export {
  _pGlob,
  CONTAINER_ID,
  createApp,
  loadScene,
  onSceneReady,
  dispatchEvent,
  addEventListener,
  customSimplePreloader
}
