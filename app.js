var express = require('express');
var path = require('path');
var fs = require('fs');
var mustache = require('mustache');
var csv = require('csv-parse/lib/sync');

var args = process.argv.slice(2);
if (args.length != 1) {
  console.error('illegal argument count: ' + args.length);
  process.exit(1);
}
var config_file = args[0];
if (!fs.lstatSync(config_file).isFile()) {
  console.error('config file not found');
  process.exit(2);
}

console.log('config file: ' + config_file);
var config = JSON.parse(fs.readFileSync(config_file, 'utf8'));
console.log('port: ' + config.port);

var app = express();

var get_view = function() {
  var result = {};
  
  var now = new Date(Date.now());
  
  for (var data of config.data) {
    switch (data.type) {
      case 'dynamic': {
        var input = fs.readFileSync(data.path, 'utf8');
        var csvdata = csv(input, {delimiter: ',', columns: true, skip_empty_lines: true});
        var entry = {};
        for (var d of csvdata) {
          var begin = new Date(Date.parse(d[data.column]));
          if (begin < now) {
            entry = d;
          }
        }
        result = Object.assign(result, entry);
      } break;
      case 'static':
        result[data.name] = fs.readFileSync(data.path, 'utf8');
        break;
      case 'date':
        result[data.name] = now.toDateString();
        break;
      default:
        console.error('unknown type: ' + data.type);
        continue;
    }
  }

  console.log(result);
  return result;
};

var get_handler = function(page) {
  var input = fs.readFileSync(page, 'utf8');
  return function(req, res) {
    var view = get_view();
    var output = mustache.to_html(input, view);
    res.send(output);
  };
};

for (var path in config.pages) {
  var page = config.pages[path];
  console.log('register ' + path + ' as ' + page);
  app.get(path, get_handler(page));
}

app.listen(config.port, function() {
  console.log('listening ...');
});

