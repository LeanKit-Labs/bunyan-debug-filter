const chai = require( "chai" );
require( "sinon" );
const dirtyChai = require( "dirty-chai" );
const chaiAsPromised = require( "chai-as-promised" );
const sinonChai = require( "sinon-chai" );

chai.use( chaiAsPromised );
chai.use( dirtyChai );
chai.use( sinonChai );

module.exports = chai;
