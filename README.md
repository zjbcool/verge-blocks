# verge-blocks

verge3d+vue3+vite模块化开发

## 示例

App.vue: 
```html
<template>
  <div :id="containerId" class="v3d-container">
  </div>
</template>

<script setup>
import {onMounted, onBeforeUnmount} from 'vue'
import {CONTAINER_ID, createApp, loadScene, onSceneReady} from 'verge-blocks'
import {config} from './config'

const containerId = CONTAINER_ID;
const url = '/gltf/Cube.gltf'
const initOptions = config();
let app = null;
onMounted(()=>{
  app = createApp(initOptions);
  loadScene(url)
});
onBeforeUnmount(()=>{
  if (app) {
    app.dispose();
    app = null;
  }
});
onSceneReady(()=>{
  ...
})
</script>

<style>
@import "css/app.css";
</style>
```
## verge模块

### _pGlob

全局变量。

### CONTAINER_ID

用于挂载`canvas`元素的ID。

### createApp()

用于创建verge3d应用实例。

### loadScene(sceneURL)

用于加载.gltf场景。

参数：
- sceneURL - 要加载的.gltf地址

### onSceneReady(callback)

场景加载完成时的钩子函数，在这个函数中执行从`block`模块或其它模块导入的函数。

### dispatchEvent(event)

派发事件。

参数：

- event - object e.g {type:'animate', message:'1'}

### addEventListener(type, handler)

添加事件侦听器。

参数：

- type - string 事件类型 e.g 'animate'
- handler - function 回调函数 

## blocks模块

功能类似拼图模块。在钩子函数中调用。略。

## 相关库

### [tweenjs](https://github.com/tweenjs/tween.js/blob/master/docs/user_guide.md)

安装：
```bash
npm i @tweenjs/tween.js@^18
```
### [Tweakpane](https://cocopon.github.io/tweakpane/getting-started.html)

安装：
```bash
// npm
const pane = new Pane();
```
### [nipplejs](https://github.com/yoannmoinet/nipplejs)

安装
```bash
npm install nipplejs --save
```

### [colorPickr](https://github.com/Simonwep/pickr)

安装
```bash
npm install @simonwep/pickr
```

```js
// One of the following themes
import '@simonwep/pickr/dist/themes/classic.min.css';   // 'classic' theme
import '@simonwep/pickr/dist/themes/monolith.min.css';  // 'monolith' theme
import '@simonwep/pickr/dist/themes/nano.min.css';      // 'nano' theme

// Modern or es5 bundle (pay attention to the note below!)
import Pickr from '@simonwep/pickr';
import Pickr from '@simonwep/pickr/dist/pickr.es5.min';
```