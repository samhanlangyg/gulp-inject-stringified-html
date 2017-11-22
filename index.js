'use strict';

var gutil = require('gulp-util');
var through = require('through2');
var path = require('path');
var fs = require('fs');
var htmlJsStr = require('js-string-escape');
var concatStream = require('concat-stream');


var PluginError = gutil.PluginError;
var PLUGIN_NAME = 'gulp-inject-stringified-html';



// gulp plugin
function gulpInjectStringifiedHtml(params) {

  // create and return a stream through which each file will pass
  return through.obj(function (file, enc, cb) {
    var contents;

    file.pipe(concatStream({encoding: 'string'},function (data) {
      try {
        file.contents = doInjectHtml(data, file, params);
      } catch (err) {
        cb(err);
        return;
      }
      cb(null, file);
    }));

  });
}

function doInjectHtml(contents, vinyl, params) {
  var result;
  var found = [];
  var cwd = vinyl.cwd;
  var relpath = path.dirname(vinyl.history[0]); // removes file name
  var regex = createRegex(params);
  // Nothing to do here.
  //if (!regex.test(contents)) return contents;

  // Do replacement!

  while ((result = regex.exec(contents)) != null) {
    found.push({
      replacee: result[0], // matching string !!!('./index.html')
      filepath: result[1]  // matching group  './index.html'
    });
  }

  found.forEach(function (o) {

    // resolve file path to template
    var htmlFilePath, htmlContent;
    if (path.isAbsolute(o.filepath)) {
      // absolute path from project root (cwd)
      htmlFilePath = path.join(cwd, o.filepath);
    } else { // relative path from js file (relpath)
      htmlFilePath = path.join(relpath, o.filepath);
    }
    htmlFilePath = path.normalize(htmlFilePath);

    htmlContent = read(htmlFilePath);
    htmlContent = htmlJsStr(htmlContent);
    if (params && params.minify) {
      htmlContent = htmlContent.replace(/[\t\n]+/g,'');
      htmlContent = htmlContent.replace(/\\n/g, '');
    }
    htmlContent = ['"', htmlContent, '"'].join('');

    contents = contents.replace(o.replacee, htmlContent);
  });

  return new Buffer(contents);
}

function read(filepath) {
  return fs.readFileSync(filepath, 'utf8');
}

function createRegex(params) {
  var regex = /\{\s*gulp_inject:\s*(?:'|")([^'"]*)(?:'|")\s*\}/gm; // default
  var innerRegex = '\\s*(?:\'|")([^\'"]*)(?:\'|")\\s*'; // used when pre & post are given

  if (params && params.pre && params.post) {
    regex = new RegExp( escRegExp(params.pre) + innerRegex + escRegExp(params.post), 'gm');
  }

  return regex;
}

function escRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Export the plugin
module.exports = gulpInjectStringifiedHtml;
