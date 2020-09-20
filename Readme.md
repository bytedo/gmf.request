![module info](https://nodei.co/npm/@gm5/request.png?downloads=true&downloadRank=true&stars=true)

# @gm5/equest
> 对Http的request进一步封装, 提供常用的API.

## Install

```bash
    npm i @gm5/request
```

## Usage

```javascript
import Request  from '@gm5/request'
import http from 'http'

http
  .createServer((req, res) => {
    let request = new Request(req, res)

    console.log(request.origin) // {req, res}

    // print the fixed url
    console.log(request.url)

    request.ip() // get client ip address

    // http://test.com/?foo=bar
    request.get('foo') // bar
  })
  .listen(3000)
```

## API

### origin 
> 返回原始的response & request对象

```js
console.log(request.origin) // {req: request, res: response}
```


### app
> 返回一级路由的名字

```js
// abc.com/foo/bar
console.log(request.app) // foo
```


### path
> 以数组形式,返回除一级路由之外剩下的路径

```js
// abc.com/foo/bar/aa/bb
console.log(request.path) // ['bar', 'aa', 'bb']
```

### url
> 返回修正过的url路径

```js
// abc.com/foo/bar/aa/bb
// abc.com////foo///bar/aa/bb
console.log(request.url) // foo/bar/aa/bb
```



### get([key[,xss]])

* key `<String>` 字段名 [可选], 不则返回全部参数
* xss `<Boolean>` 是否进行xss过滤 [可选], 默认为ture

> 返回URL上的query参数, 类似于`$_GET[]`;


```javascript
// http://test.com?name=foo&age=18
request.get('name') // foo
request.get('age') // 18

request.get() // {name: 'foo', age: 18}
request.get('weight') // return null if not exists
```

### post([key[,xss]])

* key `<String>` optional
* xss `<Boolean>` optional

> 读取post请求的body, 类似于 `$_POST[]`.

> **该方法返回的是Promise对象**

```javascript
// http://test.com
await request.post('name') // foo
await request.post('age') // 18

// return all if not yet argument given
await request.post() // {name: 'foo', age: 18}
await request.post('weight') // return null if not exists
```

### header([key])

* key `<String>` 字段名[可选], 不传则返回全部

> 返回请求头

```javascript
request.header('user-agent') // Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ...

// return all if not yet argument given
request.header() // {'user-agent': '...'[, ...]}
```

### ip()

> 获取客户端IP地址.
>
> It would return '127.0.0.1' maybe if in local area network.
