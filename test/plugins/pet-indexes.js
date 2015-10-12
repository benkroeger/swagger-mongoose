'use strict'

module.exports = function (schema, options) {
  schema.index({
    _id: 1,
    friends: 1
  }, {
    unique: true
  });
}

