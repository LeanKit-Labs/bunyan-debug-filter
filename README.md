# bunyan-debug-filter

Bunyan logging with namespaces and log filtering using the DEBUG environment variable

### Why?

[Bunyan](https://www.npmjs.com/package/bunyan) is a json logger with an incredibly powerful set of features. However, many common dependencies (i.e. express and about 9000 others) use [debug](https://www.npmjs.com/package/debug) because of the simple (yet powerful) log filtering capability it offers.

This module gives you the power and flexibility of Bunyan logging while preserving the ability to namespace your logs and filter them alongside your dependencies' logs using the `DEBUG` environment variable.
