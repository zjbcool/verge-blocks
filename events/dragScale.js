import { _pGlob } from "../verge";
import {
  getObjectByName,
  retrieveObjectNames,
} from '../util/util'

// 修改：
// 1. 不做坐标转换，使用WebGL坐标系

// 参数：
// objSelector - 要拖拽的物体名称
// mode - 沿轴或平面的拖拽模式 'X'
// blockId - 自身id
// parentDragOverBlockId - 父ID，与onDrag ID一致

// dragScale('Cube', 'Y', 'id', 'parentID');


// dragScale puzzle
_pGlob.dragScaleOrigins = {};

export function dragScale(objSelector, mode, blockId, parentDragOverBlockId) {
    var camera = _pGlob.appInstance.getCamera(true);
    if (!camera)
        return;

    if (!_pGlob.objDragOverInfoByBlock)
        return;

    var objNames = retrieveObjectNames(objSelector);

    var info = _pGlob.objDragOverInfoByBlock[parentDragOverBlockId];
    if (!info) return;

    if (!(blockId in _pGlob.dragScaleOrigins)) {
        _pGlob.dragScaleOrigins[blockId] = [];
    }
    var scaleOrigins = _pGlob.dragScaleOrigins[blockId];
    var lenDiff = objNames.length - scaleOrigins.length;
    for (var i = 0; i < lenDiff; i++) {
        scaleOrigins.push(new v3d.Vector3());
    }


    for (var i = 0; i < objNames.length; i++) {
        var obj = getObjectByName(objNames[i]);
        if (!obj) {
            continue;
        }

        var scaleOrigin = scaleOrigins[i];

        if (!info.isMoved) {
            // the object scale before the first move is used as an initial value
            scaleOrigin.copy(obj.scale);
        }

        if (mode == "X" || mode == "Y" || mode == "Z") {

                var coord = mode == "X" ? "x" : (mode == "Y" ? "y" : "z");

            var objPos = obj.getWorldPosition(_pGlob.vec3Tmp);
            objPos.project(camera);

            var objX = (objPos.x + 1) / 2 * _pGlob.appInstance.getWidth();
            var objY = (-objPos.y + 1) / 2 * _pGlob.appInstance.getHeight();

            var vecFrom = _pGlob.vec2Tmp.set(info.downX - objX, objY - info.downY);
            var vecTo = _pGlob.vec2Tmp2.set(info.currX - objX, objY - info.currY);

            obj.scale[coord] = Math.max(scaleOrigin[coord]
                    * vecTo.dot(vecFrom) / vecFrom.lengthSq(), _pGlob.MIN_DRAG_SCALE);
            obj.updateMatrixWorld(true);
        }
    }
}
