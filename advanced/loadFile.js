/* 

loadFile('./mydata.txt', function() {});
_pGlob.loadedFile;
 */

import { FileLoader } from '../v3d.module'

export function loadFile( url ) {
  return new Promise( ( res, rej ) => {
    new FileLoader().load( url,
      ( data ) => {
        res( data )
      },
      () => { },
      () => {
        rej( new Error( `${url}加载失败`) )
      }
    );
  } )
}
