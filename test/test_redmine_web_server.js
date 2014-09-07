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

var RedmineWebServer = require("../lib/redmine_web_server").RedmineWebServer;

var fs = require("fs");
var should = require("should");
var _ = require("underscore");

describe("Testing RedmineWebServer", function () {

    "use strict";

    if (fs.existsSync(__dirname + "/config.js")) {

        var config = require("./config.js").config;

        var redmine;
        before(function() {
            redmine = new RedmineWebServer(config);
        });

        it("should fetch list of projects", function (done) {


            redmine.fetchProjectNames(function(err, projects) {
                console.warn(" projects ", projects.map(function(project){return project.name;}));
                done(err);
            });

        });
        it("should fetch list of projet from cache, in offline mode",function(done) {

            var offline_config = _.clone(config);
            offline_config.offline = true;
            offline_config.password = "scrapped";
            offline_config.url = "scrapped";

            var redmine2 = new RedmineWebServer(offline_config);

            redmine.fetchProjectNames(function(err1, projects) {
                should(err1).be.eql(null);
                redmine2.fetchProjectNames(function(err2,projects2){

                    should(err2).be.eql(null);
                    projects2.length.should.eql(1);
                    projects2[0].name.should.eql("Redmine");
                    done(err2);
                })
            });


        });

        it("should fetch a ticket", function(done){
            var ticketid = 17335;
            redmine.fetchTicketInfo(ticketid,function(err,ticket) {

                ticket.id.should.eql(ticketid);
                console.log(ticket.subject);
                done();
            });


        });
        it("should refresh TicketInfo ", function(done) {
            var ticketid = 17335;
            redmine.refreshTicketInfo(ticketid,function(err,ticket) {

                ticket.id.should.eql(ticketid);
                console.log(ticket.subjet);
                done();
            });

        });

        it("should fetch the statuses ", function(done) {
            redmine.fectchIssueStatuses(function(err) {

                console.log(redmine.issue_statuses);
                done(err);
            });

        });

    } else {
        xit(" skipping cookie test because ./config.js file is missing - ( use config_sample.js as a template ) ", function () {
        });
    }
});


