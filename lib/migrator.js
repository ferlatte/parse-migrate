/* global module,process,require */
'use strict';

var _ = require('underscore');
var fs = require('fs');
var Parse = require('parse').Parse;

var Migration = require('./migration').Migration;

var MigrationDir = '';

function getMigrationNamesFromDirectory(dir) {
    var migrationNames = fs.readdirSync(dir).sort();
    migrationNames = _.map(migrationNames, function(migration) {
        return migration.replace(/.js$/, '');
    });
    return migrationNames;
}

function getMigrationNamesFromParse() {
    var migrationNames = [];
    var q = new Parse.Query(Migration);
    return q.each(function(migration) {
        migrationNames.push(migration.getName());
    }).then(
        function() {
            return Parse.Promise.as(migrationNames.sort());
        }
    );
}

function migrationsUp(migrations) {
    var migration = migrations.shift();
    if (! migration) {
        return Parse.Promise.as();
    }
    process.stdout.write('Running migration: ' + migration.getName() + '...');
    return migration.up(Parse).then(
        function() {
            return migration.save();
        }
    ).then(
        function() {
            process.stdout.write('DONE\n');
            return migrationsUp(migrations);
        },
        function(error) {
            process.stdout.write('FAILURE\n');
            return Parse.Promise.error(error);
        }
    );
}

function Migrator() {

}

Migrator.prototype.up = function() {
    var availableMigrationNames = getMigrationNamesFromDirectory(MigrationDir);
    return getMigrationNamesFromParse().then(
        function(completedMigrationNames) {
            var upMigrationNames = _.difference(availableMigrationNames,
                                                completedMigrationNames);
            var migrations = _.map(upMigrationNames, function(migrationName) {
                return Migration.withName(migrationName);
            });
            return migrationsUp(migrations);
        });
};

Migrator.setMigrationDir = function(dir) {
    MigrationDir = dir;
};

module.exports = Migrator;
