/*global require, describe, it, console, xit,__dirname*/
// The MIT License (MIT)
//
// Copyright (c) 2014 Etienne Rossignon
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var cookie = require("../lib/redmine_web_server");

var fs = require("fs");

describe("Testing extracting cookie", function () {

    "use strict";

    if (fs.existsSync(__dirname + "/config.js")) {
        var config = require("./config.js").config;

        it("should extract a cookie", function (done) {

            //#cookie.get_authenticity_token(host,page,function a(token){  console.warn(" Token = " , token );});
            cookie.get_cookie(config.url, config.username, config.password, function (err, cookie) {
                console.warn(" cookie = ", cookie);
                done(err);
            });

        });

    } else {
        xit(" skipping cookie test because ./config.js file is missing - ( use config_sample.js as a template ) ", function () {
        });
    }
});


