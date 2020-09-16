import { EventEmitter } from 'events'
import util from 'util'

export function OctetParser() {
  EventEmitter.call(this)
}

util.inherits(OctetParser, EventEmitter)

OctetParser.prototype.write = function(buffer) {
  this.emit('data', buffer)
  return buffer.length
}

OctetParser.prototype.end = function() {
  this.emit('end')
}
