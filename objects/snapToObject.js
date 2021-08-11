
import { getObjectByName } from "../util/util";

// snapToObject('<none>', '<none>');
// snapToObject puzzle
export function snapToObject(objName, targetObjName) {
  if (!objName || !targetObjName)
      return;
  var obj = getObjectByName(objName);
  var targetObj = getObjectByName(targetObjName);
  if (!obj || !targetObj)
      return;
  obj.copyTransform(targetObj);
  obj.updateMatrixWorld(true);
}



