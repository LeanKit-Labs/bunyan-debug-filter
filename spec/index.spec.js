const { sinon, proxyquire } = require( "spec-helpers" );

const STD_SERIALIZERS = {};
const ALL = 0;
const NOTHING = 100;

function setup() {
	const loggers = [];

	function createLogger() {
		const child = sinon.spy( createLogger );

		const logger = {
			child,
			originalChild: child
		};

		loggers.push( logger );

		return logger;
	}

	const bunyan = {
		stdSerializers: STD_SERIALIZERS,
		createLogger: sinon.spy( createLogger )
	};

	const logFactory = proxyquire( "~/index.js", { bunyan } );

	return { logFactory, bunyan, loggers };
}

describe( "log", () => {
	describe( "with default options", () => {
		let bunyan, logFactory;
		before( () => {
			( { logFactory, bunyan } = setup() );
			logFactory( { name: "appname" } );
		} );

		it( "should use a standard bunyan logger", () => {
			bunyan.createLogger.should.be.calledOnce();
		} );

		it( "should set other options correctly", () => {
			bunyan.createLogger.should.be.calledWithMatch( {
				name: "appname",
				serializers: STD_SERIALIZERS
			} );
		} );
	} );

	describe( "with a specified level", () => {
		let bunyan, logFactory;
		before( () => {
			( { logFactory, bunyan } = setup() );
			logFactory( { name: "appname", level: "info" } );
		} );

		it( "should use a standard bunyan logger", () => {
			bunyan.createLogger.should.be.calledOnce();
		} );

		it( "should use the specified log level", () => {
			bunyan.createLogger.should.be.calledWithMatch( { level: "info" } );
		} );
	} );

	describe( "with specified serializers", () => {
		let bunyan, logFactory, serializers;
		before( () => {
			serializers = { req() {} };
			( { bunyan, logFactory } = setup() );
			logFactory( { name: "appname", serializers } );
		} );

		it( "should use the specified serializers", () => {
			bunyan.createLogger.should.be.calledWithMatch( { serializers } );
		} );
	} );

	describe( "with a filter pattern", () => {
		describe( "of *", () => {
			let bunyan, logFactory;
			before( () => {
				( { logFactory, bunyan } = setup() );
				logFactory( { name: "foo", pattern: "*", other: "data" } );
				logFactory( { name: "bar", pattern: "*", other: "data" } );
			} );

			it( "should enable all loggers", () => {
				bunyan.createLogger.should.be.calledTwice();
				bunyan.createLogger.should.always.be.calledWithMatch( { level: ALL, other: "data" } );
			} );

			it( "should strip the pattern prop out before calling to bunyan", () => {
				bunyan.createLogger.getCall( 0 ).args[ 0 ].should.not.have.property( "pattern" );
			} );
		} );

		describe( "of foo", () => {
			let bunyan, logFactory;
			before( () => {
				( { logFactory, bunyan } = setup() );
				logFactory( { name: "foo", pattern: "foo" } );
				logFactory( { name: "bar", pattern: "foo" } );
			} );

			it( "should create all loggers", () => {
				bunyan.createLogger.should.be.calledTwice();
			} );

			it( "should enable the foo logger", () => {
				bunyan.createLogger.getCall( 0 ).should.be.calledWithMatch( { level: ALL } );
			} );

			it( "should disable other loggers", () => {
				bunyan.createLogger.getCall( 1 ).should.be.calledWithMatch( { level: NOTHING } );
			} );
		} );

		describe( "of foo*", () => {
			let bunyan, logFactory;
			before( () => {
				( { logFactory, bunyan } = setup() );
				logFactory( { name: "foo", pattern: "foo*" } );
				logFactory( { name: "foo:thing", pattern: "foo*" } );
				logFactory( { name: "bar", pattern: "foo*" } );
			} );

			it( "should create all loggers", () => {
				bunyan.createLogger.should.be.calledThrice();
			} );

			it( "should enable all foo loggers", () => {
				bunyan.createLogger.getCall( 0 ).should.be.calledWithMatch( { level: ALL } );
				bunyan.createLogger.getCall( 1 ).should.be.calledWithMatch( { level: ALL } );
			} );

			it( "should disable other loggers", () => {
				bunyan.createLogger.getCall( 2 ).calledWithExactly( { level: NOTHING } );
			} );
		} );

		describe( "of -foo", () => {
			let bunyan, logFactory;
			before( () => {
				( { logFactory, bunyan } = setup() );
				logFactory( { name: "foo", pattern: "-foo" } );
				logFactory( { name: "bar", pattern: "-foo" } );
			} );

			it( "should create all loggers", () => {
				bunyan.createLogger.should.be.calledTwice();
			} );

			it( "should disable all loggers", () => {
				bunyan.createLogger.should.always.be.calledWithMatch( { level: NOTHING } );
			} );
		} );

		describe( "of foo*,-foo:thing", () => {
			let bunyan, logFactory;
			before( () => {
				( { logFactory, bunyan } = setup() );
				logFactory( { name: "foo", pattern: "foo*,-foo:thing" } );
				logFactory( { name: "foo:thing", pattern: "foo*,-foo:thing" } );
				logFactory( { name: "foo:anotherThing", pattern: "foo*,-foo:thing" } );
				logFactory( { name: "bar", pattern: "foo*,-foo:thing" } );
			} );

			it( "should create all loggers", () => {
				bunyan.createLogger.callCount.should.equal( 4, "bunyan.createLogger was called 4 times" );
			} );

			it( "should enable most foo loggers", () => {
				bunyan.createLogger.getCall( 0 ).should.be.calledWithMatch( { level: ALL } );
				bunyan.createLogger.getCall( 2 ).should.be.calledWithMatch( { level: ALL } );
			} );

			it( "should disable the foo:thing logger", () => {
				bunyan.createLogger.getCall( 1 ).should.be.calledWithMatch( { level: NOTHING } );
			} );

			it( "should disable other loggers", () => {
				bunyan.createLogger.getCall( 3 ).should.be.calledWithMatch( { level: NOTHING } );
			} );
		} );

		describe( "creating a child logger", () => {
			let bunyan, parent, loggers, logFactory;
			before( () => {
				( { logFactory, bunyan, loggers } = setup() );
				parent = logFactory( { name: "app", pattern: "app*,-app:foo:thing" } );
				bunyan.createLogger.reset();
			} );

			describe( "with no arguments", () => {
				before( () => {
					parent.child();
				} );

				after( () => {
					bunyan.createLogger.reset();
					parent.originalChild.reset();
				} );

				it( "should not create a new parent logger", () => {
					bunyan.createLogger.should.not.be.called();
				} );

				it( "should create a child logger", () => {
					parent.originalChild.should.be.calledOnce();
				} );

				it( "should set the data on the child", () => {
					parent.originalChild.should.be.calledWithExactly( {} );
				} );
			} );

			describe( "without a namespace", () => {
				before( () => {
					parent.child( { id: 1337 } );
				} );

				after( () => {
					bunyan.createLogger.reset();
					parent.originalChild.reset();
				} );

				it( "should not create a new parent logger", () => {
					bunyan.createLogger.should.not.be.called();
				} );

				it( "should create a child logger", () => {
					parent.originalChild.should.be.calledOnce();
				} );

				it( "should set the data on the child", () => {
					parent.originalChild.should.be.calledWithExactly( { id: 1337 } );
				} );
			} );

			describe( "with a namespace", () => {
				let parentHost;

				before( () => {
					parent.child( { namespace: "foo", id: 1337 } );
					[ parentHost ] = loggers.slice( -2 );
				} );

				after( () => {
					bunyan.createLogger.reset();
					parent.originalChild.reset();
				} );

				it( "should create a new parent logger", () => {
					bunyan.createLogger.should.be.calledOnce();
				} );

				it( "should enable the loggers", () => {
					bunyan.createLogger.getCall( 0 ).calledWithExactly( { level: ALL } );
				} );

				it( "should not create a child logger directly on the parent", () => {
					parent.originalChild.should.not.be.called();
				} );

				it( "should create a child from the new logger", () => {
					parentHost.originalChild.should.be.calledOnce();
				} );

				it( "should set the data on the child", () => {
					parentHost.originalChild.should.be.calledWithExactly( { namespace: "app:foo", id: 1337 } );
				} );
			} );

			describe( "from a child", () => {
				let child;

				before( () => {
					child = parent.child( { namespace: "foo", id: 1337 } );
					bunyan.createLogger.reset();
				} );

				describe( "without a namespace", () => {
					before( () => {
						child.child( { answer: 42 } );
					} );

					after( () => {
						bunyan.createLogger.reset();
						child.originalChild.reset();
					} );

					it( "should not create a new parent logger", () => {
						bunyan.createLogger.should.not.be.called();
					} );

					it( "should create a child logger", () => {
						child.originalChild.should.be.calledOnce();
					} );

					it( "should set the data on the child", () => {
						child.originalChild.should.be.calledWithExactly( { answer: 42 } );
					} );
				} );

				describe( "with a namespace", () => {
					let childHost1, childHost2;

					before( () => {
						child.child( { namespace: "thing", wrongAnswer: 666 } );
						child.child( { namespace: "anotherthing", answer: 42 } );
						[ childHost1, , childHost2 ] = loggers.slice( -4 );
					} );

					after( () => {
						bunyan.createLogger.reset();
						child.originalChild.reset();
					} );

					it( "should create new parent loggers", () => {
						bunyan.createLogger.should.be.calledTwice();
					} );

					it( "should disable grandchild correctly", () => {
						bunyan.createLogger.getCall( 0 ).should.be.calledWithMatch( { level: NOTHING } );
					} );

					it( "should enable grandchild correctly", () => {
						bunyan.createLogger.getCall( 1 ).should.be.calledWithMatch( { level: ALL } );
					} );

					it( "should set the correct data on the children", () => {
						childHost1.originalChild.getCall( 0 ).should.be.calledWithMatch( {
							namespace: "app:foo:thing",
							id: 1337,
							wrongAnswer: 666
						} );
						childHost2.originalChild.getCall( 0 ).should.be.calledWithMatch( {
							namespace: "app:foo:anotherthing",
							id: 1337,
							answer: 42
						} );
					} );

					it( "should not create child loggers", () => {
						child.originalChild.should.not.be.called();
					} );
				} );
			} );
		} );
	} );
} );
