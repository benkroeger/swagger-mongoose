
# swagger-mongoose

Generate mongoose schemas and models from swagger documents

## Installation

```js
npm install swagger-mongoose
```

## Usage

Simply pass your swagger document to the compile method, and then dynamically access the underlying mongoose models.

```js
var swaggerMongoose = require('swagger-mongoose');

var swagger = fs.readFileSync('./petstore.json');
swaggerMongoose(swagger, {db: mongoose, pluginsPath: __dirname}, function(err, result){
  var Pet = result.models.Pet;
  Pet.create({
    id: 123,
    name: 'Fluffy'
  }, function(err, fluffy){
    // do error handling and other stuff with fluffy here
  });
});
```

## Swagger vendor extension

SwaggerMongoose now adds support for a vendor extension on top-level of the swagger spec file (in parallel to "definitions").
The extension `x-persistence` allows you to define which of the `definitions` should actually be turned in to `models`.
As of today, only the type `mongoose` is supported.
Additionally, you can define mongoose plugins to be loaded for each model. The array `plugins` must contain strings only.
These strings are joined with the global `options.pluginsPath` and loaded via `require` and the generic mongoose `Schema.plugin()` method.
**In a future version, we want to support plugin options as well**

```
  {
    "x-persistence": {
      "type": "mongoose",
      "models": {
        "Pet": {
          plugins: [
            "my-plugin"
          ]
        }
      }
    }
  }
```

## Limitations

swagger-mongoose supports the following attributes:

  integer, long, float, double, string, password, boolean, date, dateTime, array (including nested schemas)

swagger-mongoose does not yet perform/create any validation from the swagger definitions (see issues if you'd like to help)

## License

Copyright 2015 Simon Guest

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
