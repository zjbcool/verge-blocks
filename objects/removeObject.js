import {
  retrieveObjectNames,
  getObjectByName
} from '../util/util'
import { _pGlob } from "../verge";

// removeObject puzzles
export function removeObject(objSelector) {
  var objNames = retrieveObjectNames(objSelector);

  for (var i = 0; i < objNames.length; i++) {
      var objName = objNames[i]
      if (!objName)
          continue;
      var obj = getObjectByName(objName);
      if (!obj || !obj.parent)
          continue;

      obj.parent.remove(obj);

      // clean object cache
      _pGlob.objCache = {};
  }
}
