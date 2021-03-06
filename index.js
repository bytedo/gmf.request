/**
 * @author yutent<yutent.io@gmail.com>
 * @date 2020/09/16 16:05:57
 */

import 'es.shim'

import Parser from './lib/index.js'
import { parseCookie } from './lib/cookie.js'
import fs from 'iofs'
import URL from 'url'
import QS from 'querystring'
import PATH from 'path'

const DEFAULT_FORM_TYPE = 'application/x-www-form-urlencoded'

var __dirname = PATH.dirname(URL.fileURLToPath(import.meta.url))

var tmpdir = PATH.resolve(__dirname, './.tmp/')
var encode = encodeURIComponent
var decode = decodeURIComponent

function hideProperty(host, name, value) {
  Object.defineProperty(host, name, {
    value: value,
    writable: true,
    enumerable: false,
    configurable: true
  })
}

export default class Request {
  constructor(req, res) {
    this.method = req.method.toUpperCase()
    this.params = {}

    hideProperty(this, 'origin', { req, res })
    hideProperty(this, '__GET__', null)
    hideProperty(this, '__POST__', null)
    hideProperty(this, '__COOKIE__', parseCookie(this.header('cookie') || ''))

    this.__fixUrl()

    if (fs.isdir(tmpdir)) {
      fs.rm(tmpdir)
    } else {
      fs.mkdir(tmpdir)
    }
  }

  // 修正请求的url
  __fixUrl() {
    let _url = URL.parse(this.origin.req.url)
      .pathname.slice(1)
      .replace(/[\/]+$/, '')
    let app = '' // 将作为主控制器(即apps目录下的应用)
    let pathArr = []
    let tmpArr = []

    _url = decode(_url)

    // URL上不允许有非法字符
    if (/[^\w\-\/\.]/.test(_url)) {
      this.origin.res.rendered = true
      this.origin.res.writeHead(400, {
        'X-debug': `url [/${encode(_url)}] contains invalid characters`
      })
      return this.origin.res.end(`Invalid characters: /${_url}`)
    }

    // 修正url中可能出现的"多斜杠"
    _url = _url.replace(/[\/]+/g, '/').replace(/^\//, '')

    pathArr = _url.split('/')
    if (!pathArr[0] || pathArr[0] === '') {
      pathArr[0] = 'index'
    }

    if (pathArr[0].indexOf('.') !== -1) {
      app = pathArr[0].slice(0, pathArr[0].indexOf('.'))
      // 如果app为空(这种情况一般是url前面带了个"."造成的),则自动默认为index
      if (!app || app === '') {
        app = 'index'
      }
    } else {
      app = pathArr[0]
    }

    pathArr.shift()

    // 将path第3段之后的部分, 每2个一组转为key-val数据对象, 存入params中
    tmpArr = pathArr.slice(1).concat()
    while (tmpArr.length) {
      this.params[tmpArr.shift()] = tmpArr.shift() || null
    }
    tmpArr = undefined

    for (let i in this.params) {
      if (!this.params[i]) {
        continue
      }
      // 修正数字类型,把符合条件的数字字符串转为数字(也许会误转, 但总的来说是利大弊)
      this.params[i] = Number.parse(this.params[i])
    }

    this.app = app
    this.url = _url
    this.path = pathArr
  }

  /**
   * [get 同php的$_GET]
   */
  get(key = '', xss = true) {
    xss = !!xss
    if (!this.__GET__) {
      let para = URL.parse(this.origin.req.url).query
      para = Object.assign({}, QS.parse(para))
      if (xss) {
        for (let i in para) {
          if (!para[i]) {
            continue
          }

          if (Array.isArray(para[i])) {
            para[i] = para[i].map(it => {
              it = Number.parse(it.trim().xss())
              return it
            })
          } else {
            para[i] = Number.parse(para[i].trim().xss())
          }
        }
      }
      this.__GET__ = para
    }

    return key
      ? this.__GET__.hasOwnProperty(key)
        ? this.__GET__[key]
        : null
      : this.__GET__
  }

  /**
   * [post 接收post, 需要 await ]
   * @param  {Str}    key      [字段]
   */
  post(key = '', xss = true) {
    let para = {}
    let out = Promise.defer()
    let form, contentType
    xss = !!xss

    //如果之前已经缓存过,则直接从缓存读取
    if (this.__POST__) {
      if (key) {
        return this.__POST__.hasOwnProperty(key) ? this.__POST__[key] : null
      } else {
        return this.__POST__
      }
    }

    contentType = this.header('content-type') || DEFAULT_FORM_TYPE

    form = new Parser()
    form.uploadDir = tmpdir
    form.parse(this.origin.req)

    form.on('field', (name, value) => {
      if (name === false) {
        para = value
        return
      }
      if (~contentType.indexOf('urlencoded')) {
        if (
          name.slice(0, 2) === '{"' &&
          (name.slice(-2) === '"}' || value.slice(-2) === '"}')
        ) {
          name = name.replace(/\s/g, '+')

          if (value.slice(0, 1) === '=') value = '=' + value

          return Object.assign(para, JSON.parse(name + value))
        }
      }

      if (typeof value === 'string') {
        value = xss ? value.xss() : value
      }

      if (name.slice(-2) === '[]') {
        name = name.slice(0, -2)
        if (typeof value === 'string') {
          value = [value]
        }
      } else if (name.slice(-1) === ']') {
        let key = name.slice(name.lastIndexOf('[') + 1, -1)
        name = name.slice(0, name.lastIndexOf('['))

        //多解析一层对象(也仅支持到这一层)
        if (name.slice(-1) === ']') {
          let pkey = name.slice(name.lastIndexOf('[') + 1, -1)
          name = name.slice(0, name.lastIndexOf('['))

          if (!para.hasOwnProperty(name)) {
            para[name] = {}
          }

          if (!para[name].hasOwnProperty(pkey)) {
            para[name][pkey] = {}
          }

          para[name][pkey][key] = value
        } else {
          if (!para.hasOwnProperty(name)) {
            para[name] = {}
          }

          para[name][key] = value
        }
        return
      }

      para[name] = value
    })

    form.on('file', (name, file) => {
      if (name.slice(-2) === '[]') {
        name = name.slice(0, -2)
      }
      if (!para.hasOwnProperty(name)) {
        para[name] = file
      } else {
        if (!Array.isArray(para[name])) {
          para[name] = [para[name]]
        }
        para[name].push(file)
      }
    })

    form.on('error', out.reject)

    form.on('end', err => {
      if (~contentType.indexOf('urlencoded')) {
        for (let i in para) {
          if (typeof para[i] === 'string') {
            if (!para[i]) {
              continue
            }
            para[i] = Number.parse(para[i])
          }
        }
      }
      this._postParam = para
      if (key) {
        return out.resolve(para.hasOwnProperty(key) ? para[key] : null)
      } else {
        return out.resolve(para)
      }
    })
    return out.promise
  }

  //获取响应头
  header(key = '') {
    key = key ? (key + '').toLowerCase() : null
    return !!key ? this.origin.req.headers[key] : this.origin.req.headers
  }

  // 读取cookie
  cookie(key) {
    if (key) {
      return this.__COOKIE__[key]
    }
    return this.__COOKIE__
  }

  //获取客户端IP
  ip() {
    return (
      this.header('x-real-ip') ||
      this.header('x-forwarded-for') ||
      this.origin.req.connection.remoteAddress.replace('::ffff:', '')
    )
  }
}
