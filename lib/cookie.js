/**
 * @author yutent<yutent.io@gmail.com>
 * @date 2020/09/20 15:08:50
 */

// var KEY_REGEXP = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/
var SPLIT_REGEXP = /; */
// var encode = encodeURIComponent
var decode = decodeURIComponent

/**
 * [parse 格式化字符串]
 */
export function parseCookie(str) {
  var obj = {}
  var pairs

  if (typeof str !== 'string') {
    return {}
  }

  pairs = str.split(SPLIT_REGEXP)

  for (let item of pairs) {
    item = item.split('=')
    if (item.length < 2) {
      continue
    }

    var key = item[0].trim()
    var val = item[1].trim()

    obj[key] = decode(val)
  }
  return obj
}
