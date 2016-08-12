const chai = require( "./chai" );
const should = chai.should();
const sinon = require( "sinon" );
require( "sinon-as-promised" ); // Side effect: modifies sinon on import
const path = require( "path" );

const ROOT_PATH = path.join( __dirname, "../" );
const proxy = require( "proxyquire" ).noPreserveCache();

module.exports = {
	chai,
	should,
	sinon,
	proxyquire( module, ...args ) {
		if ( module.startsWith( "~" ) ) {
			module = path.join( ROOT_PATH, module.substr( 1 ) );
		}
		return proxy( module, ...args );
	}
};
