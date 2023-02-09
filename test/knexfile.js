'use strict';
/* eslint no-var: 0 */

const assert = require('assert');
const { promisify } = require('util');
const testConfig =
  (process.env.KNEX_TEST && require(process.env.KNEX_TEST)) || {};
const _ = require('lodash');

// excluding redshift, oracle, and mssql dialects from default integrations test
const testIntegrationDialects = (
  process.env.DB || 'sqlite3 mysql mysql2 better-sqlite3'
).match(/[\w-]+/g);

console.log(`ENV DB: ${process.env.DB}`);

const pool = {
  afterCreate: function (connection, callback) {
    assert.ok(typeof connection.__knexUid !== 'undefined');
    callback(null, connection);
  },
};

const poolSqlite = {
  min: 0,
  max: 1,
  acquireTimeoutMillis: 1000,
  afterCreate: function (connection, callback) {
    assert.ok(typeof connection.__knexUid !== 'undefined');
    connection.run('PRAGMA foreign_keys = ON', callback);
  },
};

const poolBetterSqlite = {
  min: 0,
  max: 1,
  acquireTimeoutMillis: 1000,
  afterCreate: function (connection, callback) {
    assert.ok(typeof connection.__knexUid !== 'undefined');
    connection.prepare('PRAGMA foreign_keys = ON').run();
    callback(null, connection);
  },
};

const mysqlPool = _.extend({}, pool, {
  afterCreate: function (connection, callback) {
    promisify(connection.query)
      .call(connection, "SET sql_mode='TRADITIONAL';", [])
      .then(function () {
        callback(null, connection);
      });
  },
});

const migrations = {
  directory: 'test/integration/migrate/migration',
};

const seeds = {
  directory: 'test/integration/seed/seeds',
};

const testConfigs = {
  mysql: {
    client: 'mysql',
    connection: testConfig.mysql || {
      port: 23306,
      database: 'knex_test',
      host: 'localhost',
      user: 'testuser',
      password: 'testpassword',
      charset: 'utf8',
    },
    pool: mysqlPool,
    migrations,
    seeds,
  },

  mysql2: {
    client: 'mysql2',
    connection: testConfig.mysql || {
      port: 23306,
      database: 'knex_test',
      host: 'localhost',
      user: 'testuser',
      password: 'testpassword',
      charset: 'utf8',
    },
    pool: mysqlPool,
    migrations,
    seeds,
  },

  sqlite3: {
    client: 'sqlite3',
    connection: testConfig.sqlite3 || {
      filename: __dirname + '/test.sqlite3',
    },
    pool: poolSqlite,
    migrations,
    seeds,
  },

  'better-sqlite3': {
    client: 'better-sqlite3',
    connection: testConfig.sqlite3 || {
      filename: __dirname + '/test.sqlite3',
    },
    pool: poolBetterSqlite,
    migrations,
    seeds,
  },
};

// export only copy the specified dialects
module.exports = _.reduce(
  testIntegrationDialects,
  function (res, dialectName) {
    res[dialectName] = testConfigs[dialectName];
    return res;
  },
  {}
);
