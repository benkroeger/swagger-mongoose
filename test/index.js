'use strict';
var swaggerMongoose = require('./../lib/index');

var fs = require('fs');
var path = require('path');
var mongoose = require('mongoose');
// var mockgoose = require('mockgoose');
// mockgoose(mongoose);
var assert = require('chai').assert;

function makeFluffy(PetModel, callback) {
  PetModel.create({
    id: 123,
    name: 'Fluffy',
    dob: new Date(),
    price: 99.99,
    sold: true,
    friends: ['Barney', 'Fido'],
    favoriteNumbers: [1, 3, 7, 9],
    address: [{
      addressLine1: '1 Main St.'
    }, {
      addressLine1: '2 Main St.'
    }],
    notAKey: 'test'
  }, function (err, fluffy) {
    if (err) {
      return callback(err);
    }

    assert.strictEqual(fluffy.id, 123, 'ID missmatch');
    assert.strictEqual(fluffy.name, 'Fluffy', 'Name mismatch');
    assert.strictEqual(fluffy.price, 99.99, 'Price mismatch');
    assert.strictEqual(fluffy.sold, true, 'Sold mismatch');
    assert.strictEqual(fluffy.friends.length, 2, 'Friends mismatch');
    assert.strictEqual(fluffy.favoriteNumbers.length, 4, 'Favorite numbers mismatch');
    assert.strictEqual(fluffy.address[0].addressLine1, '1 Main St.', 'Nested address mismatch');
    assert.strictEqual(fluffy.address[1].addressLine1, '2 Main St.', 'Nested address mismatch');
    assert(!fluffy.notAKey, 'Strict schema mismatch');

    callback();
  });
}

describe('swagger-mongoose tests', function () {

  beforeEach(function () {
    mongoose.connect('mongodb://localhost/schema-test');
  });

  afterEach(function () {
    mongoose.disconnect();
    delete mongoose.models.Pet;
  });

  it('should create an example pet and return all valid properties', function (done) {
    var swagger = fs.readFileSync('./test/petstore.json');
    swaggerMongoose(swagger, {
      db: mongoose,
      pluginsPath: path.join(__dirname, 'plugins')
    }, function (err, result) {
      if (err) {
        return done(err);
      }
      var PetModel = result.models.Pet;
      PetModel.on('index', function () {
        makeFluffy(PetModel, done);
      });
    });
  });

  it('should create an example pet from a file', function (done) {
    var swagger = fs.readFileSync('./test/petstore.json');
    swaggerMongoose(swagger, {
      db: mongoose,
      pluginsPath: path.join(__dirname, 'plugins')
    }, function (err, result) {
      if (err) {
        return done(err);
      }
      var PetModel = result.models.Pet;
      PetModel.on('index', function () {
        makeFluffy(PetModel, done);
      });
    });
  });

  it('should create an example pet from a JSON object', function (done) {
    var swagger = JSON.parse(fs.readFileSync('./test/petstore.json'));
    swaggerMongoose(swagger, {
      db: mongoose,
      pluginsPath: path.join(__dirname, 'plugins')
    }, function (err, result) {
      if (err) {
        return done(err);
      }
      var PetModel = result.models.Pet;
      PetModel.on('index', function () {
        makeFluffy(PetModel, done);
      });
    });
  });

  it('should create an example pet from a string', function (done) {
    var swagger = fs.readFileSync('./test/petstore.json').toString();
    swaggerMongoose(swagger, {
      db: mongoose,
      pluginsPath: path.join(__dirname, 'plugins')
    }, function (err, result) {
      if (err) {
        return done(err);
      }
      var PetModel = result.models.Pet;
      PetModel.on('index', function () {
        makeFluffy(PetModel, done);
      });
    });
  });
});

