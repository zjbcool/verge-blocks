/* 
v3d应用的配置选项，用于createApp函数
import {createApp} from 'verge-blocks'
import {config} from './config'
const initOptions = config();
onMounted(() => {
  let app = createApp(initOptions);
  ...
});
*/
import { customSimplePreloader } from 'verge-blocks';

export function config() {
  // 自定义默认加载器外观
  customSimplePreloader( {
    background: 'radial-gradient(#eee, #888)',
    logo: 'center / contain no-repeat url(media/theater-masks.svg)',
    bar: 'linear-gradient(90deg, #333, #666)',
    border: '1px solid black'
  } );
  // app初始化设置
  return {
    fadeAnnotations: true,
    useBkgTransp: true,
    containerBackground: 'radial-gradient(#272934, #0e0818)', // 背景，前提是开启背景透明
    preserveDrawBuf: true,
    useCustomPreloader: false,
    preloaderStartCb: function () { },
    preloaderProgressCb: function () { },
    preloaderEndCb: function () { },
  }
}
