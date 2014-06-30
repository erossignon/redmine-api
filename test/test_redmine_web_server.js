/*global require, describe, it, console, xit,__dirname*/
var RedmineWebServer = require("../lib/redmine_web_server").RedmineWebServer;

var fs = require("fs");
var should = require("should");

describe("Testing RedmineWebServer", function () {

    "use strict";

    if (fs.existsSync(__dirname + "/config.js")) {

        var config = require("./config.js").config;

        var redmine;
        before(function() {
            redmine = new RedmineWebServer(config);
        });

        it("should fetch list of projects", function (done) {


            redmine.fetchProjectName(function(err, projects) {
                console.warn(" projects ", projects.map(function(project){return project.name;}));
                done(err);

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


