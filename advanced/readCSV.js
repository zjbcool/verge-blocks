import {
  CSVParser
}from '../v3d.module'
/*
参数：
data - 要读取的文本
options
  - delimiter - 分隔符
  - skipinitialrows - 从哪行开始

e.g 
readCSV(data,',', 0)
 */

export function readCSV(data, delimit, from) {
  return CSVParser.parse(data,
      {delimiter: delimit, skipinitialrows: from});
}
