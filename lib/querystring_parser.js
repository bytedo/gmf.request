// This is a buffering parser, not quite as nice as the multipart one.
// If I find time I'll rewrite this to be fully streaming as well
import querystring from 'querystring'

export class QuerystringParser {
  constructor(maxKeys) {
    this.maxKeys = maxKeys
    this.buffer = ''
  }

  write(buffer) {
    this.buffer += buffer.toString('ascii')
    return buffer.length
  }

  end() {
    var fields = querystring.parse(this.buffer, '&', '=', {
      maxKeys: this.maxKeys
    })
    for (var field in fields) {
      this.onField(field, fields[field])
    }
    this.buffer = ''

    this.onEnd()
  }
}
