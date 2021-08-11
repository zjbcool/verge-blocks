/*Verge3D插件DraggableTexture 作者：宅家呗  网站：zjbcool.com
 *功能：纹理移动、旋转、缩放，重复纹理，贴图尺寸适配，需要与onDrag()一起使用。
 方法：
  update() - texture属性改变时执行更新，静态绘制方法
  drawTexture() - 动态绘制方法
  clearTexture() - 
  startDrag(X,Y)
  moveTo(endX, endY)
  scaleTo(endX, endY)
  rotateTo( endX, endY )
  endDrag()
  getTransform( mode )
  setTransform( mode, value )
  resetTransform()
 */
import { _pGlob } from '../verge'
import { getObjectByName } from '../util/util'
import { Vector2, MathUtils } from '../v3d.module'

class DraggableTexture {
  constructor ( prop ) {
    this.canvas = document.createElement( 'canvas' );
    this.width = 1024;
    this.height = 1024;
    this.id = MathUtils.generateUUID();
    this.image = null; // ImageElement
    this.repeat = 'no-repeat'; // 'no-repeat'|'repeat'|'repeat-x'|'repeat-y'
    this.size = 'contain'; // 'contain'|'cover'|'orgin'|'fill'
    this.background = 'transparent';
    this._ctx;
    this._start = {
      x: 0,
      y: 0,
    };
    this._pre = {
      x: 0,
      y: 0,
      scale: 1
    };
    this._pos = {
      x: 0,
      y: 0
    };
    this._scale = 1;
    this._rotate = 0;
    this._pattern = {};
    this._matrix = {};
    Object.assign( this, prop );
    this.init();
  }

  init() {
    this.canvas.id = this.id;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this._ctx = this.canvas.getContext( '2d' );
  }

  update() {
    this._setBackground();
    if ( !this.image ) return;
    // 初始化图案
    if ( this.image instanceof Image && this.repeat !== 'no-repeat' ) {
      this._pattern = this._ctx.createPattern( this.image, this.repeat );
      this._matrix = new DOMMatrix();
    }

    this.drawTexture();
  }

  drawTexture() {
    if ( this.image ) this.repeat === 'no-repeat' ? this._drawImage() : this._drawPattern();
  }

  clearTexture() {
    this.image = null;
    this._setBackground();
    this._update();
  }

  startDrag( X, Y ) {
    this._start.x = X;
    this._start.y = Y;
  }

  moveTo( endX, endY ) {
    this._pos.x = this._pre.x + ( endX - this._start.x );
    this._pos.y = this._pre.y + ( endY - this._start.y );
  }

  scaleTo( endX, endY ) {
    let vecFrom = new Vector2().set( this._start.x, this._start.y );
    let vecTo = new Vector2().set( endX, endY );
    this._scale = Math.max( this._pre.scale * vecTo.dot( vecFrom ) / vecFrom.lengthSq(), _pGlob.MIN_DRAG_SCALE );
  }

  rotateTo( endX, endY ) {
    let vecFrom = new Vector2().set( this._start.x, this._start.y );
    let vecTo = new Vector2().set( endX, endY );
    this._rotate = new Vector2().subVectors( vecTo, vecFrom ).normalize().angle();
  }

  endDrag() {
    this._pre.x = this._pos.x;
    this._pre.y = this._pos.y;
    this._pre.scale = this._scale;
  }

  getTransform( mode ) {
    switch ( mode ) {
      case 'translateX':
        return this._pos.x;
      case 'translateY':
        return this._pos.y;
      case 'rotate':
        return this._rotate * 180 / Math.PI;
      case 'scale':
        return this._scale;
    }
  }

  setTransform( mode, value ) {
    switch ( mode ) {
      case 'translateX':
        this._pos.x = value;
        break;
      case 'translateY':
        this._pos.y = value;
        break;
      case 'rotate':
        this._rotate = value * Math.PI / 180;
        break;
      case 'scale':
        this._scale = value;
        break;
    }
    return this;
  }

  resetTransform() {
    this._start.x = 0;
    this._start.y = 0;
    this._pre.x = 0;
    this._pre.y = 0;
    this._pre.rotate = 0;
    this._pre.scale = 1;
    this._pos.x = 0;
    this._pos.y = 0;
    this._rotate = 0;
    this._scale = 1;
    return this;
  }

  _getImageSize() {
    let sx = 0,
      sy = 0,
      sw = this.image.width,
      sh = this.image.height,
      dx = 0,
      dy = 0,
      dw = this.width,
      dh = this.height;

    const aspect = this.image.width / this.image.height;
    switch ( this.size ) {
      case 'contain':
        dw = aspect > 1 ? this.width : this.height * aspect;
        dx = aspect > 1 ? 0 : ( this.width - dw ) / 2;
        dh = aspect > 1 ? this.width / aspect : this.height;
        dy = aspect > 1 ? ( this.height - dh ) / 2 : 0;
        break;
      case 'cover':
        dw = aspect > 1 ? this.height * aspect : this.width;
        dx = aspect > 1 ? ( this.width - dw ) / 2 : 0;
        dh = aspect > 1 ? this.height : this.height / aspect;
        dy = aspect > 1 ? 0 : ( this.height - dh ) / 2;
        break;
      case 'orgin':
        dw = sw;
        dh = sh;
        break;
      case 'fill':
        break;
    };

    return {
      sx,
      sy,
      sw,
      sh,
      dx,
      dy,
      dw,
      dh
    };
  }

  _drawImage() {
    this._setBackground();
    this._ctx.save();
    this._ctx.translate( this.width / 2, this.height / 2 );
    this._ctx.translate( this._pos.x, this._pos.y );
    this._ctx.scale( this._scale, this._scale );
    this._ctx.rotate( this._rotate );
    this._ctx.translate( -this.width / 2, -this.height / 2 );

    const size = this._getImageSize();
    this._ctx.drawImage( this.image, size.sx, size.sy, size.sw, size.sh, size.dx, size.dy, size.dw, size.dh );
    this._ctx.restore();
    this._update();
  }

  _drawPattern() {
    this._setBackground();
    this._pattern.setTransform( this._matrix
      .translate( this.width / 2, this.height / 2 )
      .translate( this._pos.x, this._pos.y )
      .scale( this._scale )
      .rotate( this._rotate / Math.PI * 180 ) );
    this._ctx.fillStyle = this._pattern;
    this._ctx.fillRect( 0, 0, this.width, this.height );
    this._update();
  }

  _setBackground() {
    this._ctx.clearRect( 0, 0, this.width, this.height );
    this._ctx.fillStyle = this.background;
    this._ctx.fillRect( 0, 0, this.width, this.height );
  }

  _update() {
    const canvasTex = _pGlob.PL.canvasTextures[ this.id ];
    if ( canvasTex ) canvasTex.needsUpdate = true;
  }
};

// find draggable object.
function getObjectDragOver() {
  const keys = Object.keys( _pGlob.objDragOverInfoByBlock );
  const objName = _pGlob.objDragOverInfoByBlock[ keys[ 0 ] ].draggedObjName;
  return getObjectByName( objName );
}

// startDragTexture puzzle
function startDragTexture( texture ) {
  const mesh = getObjectDragOver();
  dragStart( event );

  function dragStart( event ) {
    event.preventDefault();
    const elem = _pGlob.appInstance.container;
    let xNorm = 0, yNorm = 0;
    if ( event instanceof MouseEvent ) {
      //if (mouseButtons && mouseButtons.indexOf(event.button) == -1) return;
      xNorm = event.offsetX / elem.clientWidth;
      yNorm = event.offsetY / elem.clientHeight;
    } else if ( event instanceof TouchEvent ) {
      const rect = elem.getBoundingClientRect();
      xNorm = ( event.changedTouches[ 0 ].clientX - rect.left ) / rect.width;
      yNorm = ( event.changedTouches[ 0 ].clientY - rect.top ) / rect.height;
    }

    _pGlob.screenCoords.x = xNorm * 2 - 1;
    _pGlob.screenCoords.y = -yNorm * 2 + 1;
    _pGlob.raycasterTmp.setFromCamera( _pGlob.screenCoords, _pGlob.appInstance.camera );

    const intersects = _pGlob.raycasterTmp.intersectObject( mesh );
    if ( intersects.length > 0 ) {
      const startX = intersects[ 0 ].uv.x * texture.width;
      const startY = intersects[ 0 ].uv.y * texture.height;
      texture.startDrag( startX, startY );
    }
  }

}

// dragTexutre puzzle
function dragTexutre( texture, mode ) {
  const mesh = getObjectDragOver();
  drag( event );
  function drag( event ) {
    event.preventDefault();
    const elem = _pGlob.appInstance.container;
    let xNorm = 0, yNorm = 0;
    if ( event instanceof MouseEvent ) {
      //if (mouseButtons && mouseButtons.indexOf(event.button) == -1) return;
      xNorm = event.offsetX / elem.clientWidth;
      yNorm = event.offsetY / elem.clientHeight;
    } else if ( event instanceof TouchEvent ) {
      const rect = elem.getBoundingClientRect();
      xNorm = ( event.changedTouches[ 0 ].clientX - rect.left ) / rect.width;
      yNorm = ( event.changedTouches[ 0 ].clientY - rect.top ) / rect.height;
    }

    _pGlob.screenCoords.x = xNorm * 2 - 1;
    _pGlob.screenCoords.y = -yNorm * 2 + 1;
    _pGlob.raycasterTmp.setFromCamera( _pGlob.screenCoords, _pGlob.appInstance.camera );
    const intersects = _pGlob.raycasterTmp.intersectObject( mesh );
    if ( intersects.length > 0 ) {
      const endX = intersects[ 0 ].uv.x * texture.width;
      const endY = intersects[ 0 ].uv.y * texture.height;
      switch ( mode ) {
        case 'translate':
          texture.moveTo( endX, endY );
          break;
        case 'scale':
          texture.scaleTo( endX, endY );
          break;
        case 'rotate':
          texture.rotateTo( endX, endY );
          break;
      }
      texture.drawTexture();
    }
  }

}

// dropTexture puzzle
function dropTexture( texture ) {
  texture.endDrag();
  const keys = Object.keys( _pGlob.objDragOverInfoByBlock );
  delete _pGlob.objDragOverInfoByBlock[ keys[ 0 ] ];
}


export {
  DraggableTexture,
  startDragTexture,
  dragTexutre,
  dropTexture,
}
