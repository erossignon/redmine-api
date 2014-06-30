/*global require, describe, it, console, xit,__dirname*/
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


