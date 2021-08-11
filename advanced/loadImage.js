import { ImageLoader } from '../v3d.module'

export function loadImage( url ) {
  return new Promise( (res, rej) => {
    new ImageLoader().load(
      url,
      ( img ) => res( img ),
      undefined,
      () => rej(console.error( `${ url }加载失败` ))
      
    );
  })
}
