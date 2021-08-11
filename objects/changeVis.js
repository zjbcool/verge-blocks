import {
  retrieveObjectNames,
  getObjectByName
} from '../util/util'

 // show and hide puzzles
export function changeVis(objSelector, bool) {
    var objNames = retrieveObjectNames(objSelector);
    for (var i = 0; i < objNames.length; i++) {
      var objName = objNames[i]
      if (!objName)
      continue;
      var obj = getObjectByName(objName);
      if (!obj)
      continue;
        obj.visible = bool;
    }
}
