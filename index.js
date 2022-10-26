/* eslint no-invalid-this:0 */
const bunyan = require( "bunyan" );

const ALL = 0;
const NOTHING = 100;

const LOG_DATA = Symbol( "log data" );
const CHILD_METHOD = Symbol( "child method" );

function match( patterns, value ) {
	const newPattern = patterns.map( p => p.replace( /\*/g, ".*?" ) ).join( "|" );
	const regex = new RegExp( `^(?:${ newPattern })$` );
	return regex.test( value );
}

function isEnabled( pattern, namespace ) {
	const patterns = pattern.split( /[\s,]+/g );

	const disabled = patterns.filter( p => p[ 0 ] === "-" ).map( p => p.substr( 1 ) ); // eslint-disable-line no-magic-numbers
	if ( match( disabled, namespace ) ) {
		return false;
	}

	const enabled = patterns.filter( p => p[ 0 ] !== "-" );
	return match( enabled, namespace );
}

module.exports = function( config ) {
	const { name, pattern = "" } = config;
	const options = Object.assign( {}, config );
	delete options.pattern;

	if ( !options.serializers ) {
		options.serializers = bunyan.stdSerializers;
	}

	function createLogger( settings = {} ) {
		const namespace = settings.namespace;
		const data = Object.assign( {}, settings );
		delete data.namespace;
		const parentData = this && this[ LOG_DATA ];
		const childData = Object.assign( {}, parentData || {}, data );
		const localOptions = Object.assign( {}, options );
		let logger;

		// If they specify a new namespace we create a new logger so we can specify a
		// new log level. If they do not specify a namespace we can just create a
		// child logger.
		if ( namespace ) {
			if ( parentData ) {
				childData.namespace = `${ parentData.namespace }:${ namespace }`;
			} else {
				childData.namespace = namespace;
			}

			localOptions.level = isEnabled( pattern, childData.namespace ) ? ALL : NOTHING;

			logger = bunyan.createLogger( localOptions ).child( childData );
		} else {
			logger = this[ CHILD_METHOD ]( data );
		}

		logger[ CHILD_METHOD ] = logger.child;
		logger.child = createLogger;

		logger[ LOG_DATA ] = childData;

		return logger;
	}

	if ( pattern ) {
		// If a namespace pattern is defined then we need to hijack the bunyan
		// `child` method and turn loggers on and off.
		return createLogger( { namespace: name } );
	}

	// Otherwise we just need a vanilla logger
	return bunyan.createLogger( options );
};
