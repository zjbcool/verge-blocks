import {
  PlaneBufferGeometry,
  Mesh,
  MeshBasicMaterial,
  NoBlending,
  FrontSide,
  DoubleSide
} from '../v3d.module'
import { CSS3DObject } from './CSS3DRenderer'

export class CSS3DPlane extends CSS3DObject {
  constructor ( option ) {
    super();
    this.mask = null;
    this.iframe = "";
    this.width = 540;
    this.height = 360;
    Object.assign( this, option );
    this._init();
  }

  _init() {
    let geometry, material;
    const _this = this;
    // mask
    geometry = new PlaneBufferGeometry( _this.width, _this.height, 1, 1 );
    material = new MeshBasicMaterial( {
      color: 'black',
      opacity: 0,
      blending: NoBlending,
      side: DoubleSide
    } );
    _this.mask = new Mesh( geometry, material );
    _this.mask.name = _this.name;

    // iframe
    _this.element.style.overflow = 'hidden';
    _this.element.style.pointerEvents = 'auto';
    _this.element.style.backfaceVisibility = 'hidden';
    _this.element.style.background = 'transparent';
    _this.element.style.width = _this.width + 'px';
    _this.element.style.height = _this.height + 'px';
    _this.element.style.cursor = 'pointer';

    _this.element.innerHTML = _this.iframe;
    _this.element.children[ 0 ].style.height = '100%';
    _this.element.children[ 0 ].style.width = '100%';
    _this.element.children[ 0 ].style.padding = '0';
    _this.element.children[ 0 ].style.margin = '0';
    _this.element.children[ 0 ].style.lineHeight = _this.height + 'px';
  }

  update() {
    const _this = this;
    _this.position.copy( _this.mask.position );
    _this.rotation.copy( _this.mask.rotation );
    _this.scale.copy( _this.mask.scale );
    _this.updateMatrixWorld( true );
    _this.mask.updateMatrixWorld( true );
    if ( _this.mask.visible ) {
      _this.element.style.display = "block";
    } else {
      _this.element.style.display = "none";
    }
  }
}
