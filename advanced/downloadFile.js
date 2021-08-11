/* 
downloadFile( 'data:,', 'screenshot.png' );

e.g 截屏
const screenshot = _pGlob.appInstance.renderer.domElement.toDataURL('image/png');
downloadFile(screenshot, 'screenshot.png')

*/

import {
  checkDataUri,
  checkBlobUri,
  toJSONDataUri,
  toTextDataUri,
} from '../util/util'

function downloadFile(contents, filename) {
  if (!filename)
      return;
  if (contents instanceof Promise) {
      contents.then(function(response) {
          doDownload(response, filename);
      }, function(error) {});
  } else {
      doDownload(contents, filename);
  }
  function doDownload(contents, filename) {
      if (typeof contents !== 'string') {
          contents = toJSONDataUri(contents);
      } else if (!checkDataUri(contents) && !checkBlobUri(contents)) {
          contents = toTextDataUri(contents);
      }
      var link = document.createElement('a');
      link.href = contents;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
  }
}

export {
  downloadFile
}


