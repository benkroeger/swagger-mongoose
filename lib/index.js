'use strict';

var util = require('util');
var path = require('path');
var _ = require('lodash');
var async = require('async');
var Schema = require('mongoose').Schema;

var simpleSchemaTypes = ['integer', 'long', 'float', 'double', 'string', 'byte', 'binary', 'password', 'boolean', 'date', 'dateTime'];

var mapSimpleSchemaType = function (property) {
  if (['integer', 'long', 'float', 'double'].indexOf(property.type) > -1) {
    return Number;
  }

  if (['string', 'password', 'byte', 'binary'].indexOf(property.type) > -1) {
    return String;
  }

  if (['boolean'].indexOf(property.type) > -1) {
    return Boolean;
  }

  if (['date', 'dateTime'].indexOf(property.type) > -1) {
    return Date;
  }

  throw new Error('Unrecognized schema type: ' + property.type);
};

var swaggerSpecToPlainObject = function (data) {
  if (_.isPlainObject(data)) {
    // @TODO: might be better to return a clone of "data"
    return data;
  }

  if (Buffer.isBuffer(data)) {
    return JSON.parse(data);
  }

  if (_.isString(data)) {
    return JSON.parse(data);
  }

  // provided data is of invalid type
  throw new Error('Unknown or invalid data object');
};

var isSimpleSchemaType = function (schema) {
  return !!schema.type && simpleSchemaTypes.indexOf(schema.type) > -1;
};

// this means we don't support external references, yet
var refRegEx = /^#\/definitions\/(\w*)$/;

// options.db
// options.pluginsPath
function compile(swaggerSpec, options, callback) {
  if (!swaggerSpec) {
    return callback(new Error('Swagger spec not supplied'));
  }

  var spec = swaggerSpecToPlainObject(swaggerSpec);
  var definitions = spec.definitions || {};
  var schemas = {};
  var models = {};

  function getSchema(definition, callback) {
    var schemaProps = {};
    // return immediately if we have a simple top-level schema type
    if (isSimpleSchemaType(definition)) {
      schemaProps.type = mapSimpleSchemaType(definition);
      return callback(null, new Schema(schemaProps));
    }

    var defProps = definition.properties;

    return async.reduce(Object.keys(defProps), schemaProps, function (schemaProps, propName, iteratorCallback) {
      var property = defProps[propName];
      // simple data types
      if (isSimpleSchemaType(property)) {
        schemaProps[propName] = {
          type: mapSimpleSchemaType(property)
        };
        return iteratorCallback(null, schemaProps);
      }

      // arrays of simple data types
      if (property.type === 'array' && property.items && isSimpleSchemaType(property.items) && !property.items.$ref) {
        schemaProps[propName] = {
          type: [mapSimpleSchemaType(property.items)]
        };
        return iteratorCallback(null, schemaProps);
      }

      var refSchemaName;
      var isArray;
      if (property.$ref) { // resolve referenced data types
        if (!refRegEx.test(property.$ref)) {
          return callback(new TypeError(util.format('Unsupported schema reference %s', property.$ref)));
        }
        refSchemaName = property.$ref.match(refRegEx)[1];
        isArray = false;
      } else if (property.type === 'array' && property.items.$ref) { // resolve arrays of referenced data types
        if (!refRegEx.test(property.items.$ref)) {
          return callback(new TypeError(util.format('Unsupported schema reference %s', property.items.$ref)));
        }
        refSchemaName = property.items.$ref.match(refRegEx)[1];
        isArray = true;
      }

      // if the schema is parsed already, assign to prop and complete iterator
      if (schemas[refSchemaName] && schemas[refSchemaName] instanceof Schema) {
        schemaProps[propName] = {
          type: isArray ? [schemas[refSchemaName]] : schemas[refSchemaName]
        };
        return iteratorCallback(null, schemaProps);
      }

      // check if we have a definition for the schema in question
      // if yes, resolve definition to schema and continue
      if (definitions[refSchemaName] && _.isPlainObject(definitions[refSchemaName])) {
        return getSchema(definitions[refSchemaName], function (err, refSchema) {
          if (err) {
            iteratorCallback(err);
          }
          schemaProps[propName] = {
            type: isArray ? [refSchema] : refSchema
          };
          schemas[refSchemaName] = refSchema;
          return iteratorCallback(null, schemaProps);
        });
      }

      // report missing definition for referenced Schema
      callback(new TypeError(util.format('Missing schema definition for %s', refSchemaName)));
    }, function (err, schemaProps) {
      if (err) {
        return callback(err);
      }
      return callback(null, new Schema(schemaProps));
    });
  }

  async.reduce(Object.keys(definitions), schemas, function (schemas, definitionName, iteratorCallback) {
    if (schemas[definitionName]) {
      return iteratorCallback(null, schemas);
    }
    if (/Error/.test(definitionName)) {
      return iteratorCallback(null, schemas);
    }
    getSchema(definitions[definitionName], function (err, schema) {
      if (err) {
        return iteratorCallback(err);
      }
      schemas[definitionName] = schema;
      iteratorCallback(null, schemas);
    });
  }, function (err, schemas) {
    if (err) {
      return callback(err);
    }

    if (spec['x-persistence'] && spec['x-persistence'].type === 'mongoose') {
      // options.db must be a mongoose connection object
      var dbConnection = options.db;
      if (!dbConnection) {
        return callback(new Error('options.db must be a mongoose connection object'));
      }

      spec['x-persistence'].models = spec['x-persistence'].models || {};

      _.reduce(spec['x-persistence'].models, function (models, modelSpec, modelName) {
        // @TODO: Normalize modelName (start with UpperCase, singularize)
        // --> although this should be convention for the Swagger spec file
        if (!schemas[modelName]) {
          console.log('No schema with name `%s` found', modelName);
          return models;
        }

        var schema = schemas[modelName];

        if (options.pluginsPath && modelSpec.plugins && Array.isArray(modelSpec.plugins)) {
          modelSpec.plugins.forEach(function(pluginName){
            var plugin = require(path.join(options.pluginsPath, pluginName));
            schema.plugin(plugin, {});
          });
        }

        models[modelName] = dbConnection.model(modelName, schema);
        return models;
      }, models);
    }

    return callback(null, {
      schemas: schemas,
      models: models
    });
  });
}

module.exports = compile;

