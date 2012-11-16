var credentials = {
	username: 'foo@bar.com',
	password: '123456'
};

describe('User Collection', function() {
	describe('dpd.users', function() {
		describe('.post', function() {
			it('should create a user', function(done) {
				dpd.users.post(credentials, function (user, err) {
					if(!user) {
						throw 'user did not exist';
					}
					expect(user.id.length).to.equal(16);
					delete user.id;
					expect(user).to.eql({username: credentials.username});
					done(err);
				});
			});

			it('should validate for duplicate username', function(done) {
				chain(function(next) {
					dpd.users.post(credentials, next);
				}).chain(function(next) {
					dpd.users.post(credentials, next);
				}).chain(function(next, result, err) {
					expect(result).to.not.exist;
					expect(err.errors.username).to.be.ok;
					done();
				});
			});

      it('should properly show username and password errors', function(done) {
        dpd.users.post({}, function(res, err) {
          expect(res).to.not.exist;
          expect(err.errors.username).to.be.ok;
          expect(err.errors.password).to.be.ok;
          done();
        });
      });

      it('should update if id is passed in the body', function(done) {
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          dpd.users.post({id: res.id, username: 'test'}, next);
        }).chain(function(next, res, err) {
          done(err);
        });
      });

      it('should update if id is passed in the url', function(done) {
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          dpd.users.post(res.id, {username: 'test'}, next);
        }).chain(function(next, res, err) {
          done(err);
        });
      });
		});
		describe('.login(credentials, fn)', function() {
			it('should login a user', function(done) {
				dpd.users.post(credentials, function (user, err) {
					expect(user.id.length).to.equal(16);
					dpd.users.login(credentials, function (session, err) {
						expect(session.id.length).to.equal(128);
						expect(session.uid.length).to.equal(16);
						done(err);
					});
				});
			});

      it('should not crash the server when called without a body', function(done) {
        dpd.users.login(null, function(session, err) {
          expect(err).to.exist;
          done();
        });
      });
		});
		describe('.me(fn)', function() {
			it('should return the current user', function(done) {
				dpd.users.post(credentials, function (user, err) {
					expect(user.id.length).to.equal(16);
					dpd.users.login(credentials, function (session, err) {
						dpd.users.me(function (me, err) {
							expect(me).to.exist;
							expect(me.id.length).to.equal(16);
							done(err);
						});
					});
				});
			});
		});
		describe('.del({id: \'...\'}, fn)', function() {
			it('should remove a user', function(done) {
				dpd.users.post(credentials, function (user, err) {
					expect(user.id.length).to.equal(16);
					dpd.users.del({id: user.id}, function (session, err) {
						dpd.users.get({id: user.id}, function (user) {
							expect(user).to.not.exist;
							done(err);
						});
					});
				});
			});
		});
		describe('dpd.users.on("changed", fn)', function() {
      it('should respond to the built-in changed event on post', function(done) {
        dpd.socketReady(function() {
          dpd.users.once('changed', function() {
            done();
          });

          dpd.users.post({username: 'foo@bar.com', password: '123456'});
        });
      });
      
      it('should respond to the built-in changed event on put', function(done) {
        dpd.users.post({username: 'foo2@bar.com', password: '123456'}, function(item) {
          dpd.socketReady(function() {
            dpd.users.once('changed', function() {
              done();
            });
            
            dpd.users.put(item.id, {username: 'foo3@bar.com'});
          });
        });
      });
      
      it('should respond to the built-in changed event on del', function(done) {
        dpd.users.post({username: 'foo2@bar.com', password: '123456'}, function(item) {
          dpd.socketReady(function() {
            dpd.users.once('changed', function() {
              done();
            });
            
            dpd.users.del(item.id);
          });
        });
      });
    });

    describe('dpd.users.put({}, fn)', function() {
      it('should allow omitting username and password', function(done) {
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          dpd.users.put(res.id, {reputation: 10}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          expect(res.reputation).to.equal(10);
          done(err);
        });
      });

      it('should not allow unauthenticated changes to username or password', function(done) {
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          dpd.users.put(res.id, {username: 'changed', password: 'changed'}, next);
        }).chain(function(next, res, err) {
          expect(res.username).to.equal('foo');
          dpd.users.login({username: 'changed', password: 'changed'}, next);
        }).chain(function(next, res, err) {
          expect(err).to.exist;
          done();
        });
      });

      it('should allow authenticated changes to username or password', function(done) {
        var id;
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          id = res.id;
          dpd.users.login({username: 'foo', password: 'bar'}, next);
        }).chain(function(next) {
          dpd.users.put(id, {username: 'changed', password: 'changed'}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          expect(res.username).to.equal('changed');
          dpd.users.login({username: 'changed', password: 'changed'}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          done();
        });
      });

      it('should allow changes to username and password via events', function(done) {
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          dpd.users.put(res.id, {displayName: "$CHANGEPASSWORD"}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          dpd.users.login({username: 'foo', password: 'changed'}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          done();
        });
      });

      it('should return true for isMe()', function(done) {
        var id;
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          id = res.id;
          dpd.users.login({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          dpd.users.put(id, {displayName: "Foo Bar!"}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          expect(res.isMe).to.equal(true);
          done(err);
        });
      });

      it('should return false for isMe()', function(done) {
        var id;
        chain(function(next) {
          dpd.users.post({username: 'foo', password: 'bar'}, next);
        }).chain(function(next, res, err) {
          id = res.id;
          dpd.users.put(id, {displayName: "Foo Bar!"}, next);
        }).chain(function(next, res, err) {
          if(err) return done(err);
          expect(res.isMe).to.equal(false);
          done(err);
        });
      });
    });

    afterEach(function (done) {
      this.timeout(10000);
      dpd.users.logout(function () {
        dpd.users.get(function (users) {
          var total = users.length;
          if(total === 0) return done();
          users.forEach(function(user) {
            dpd.users.del({id: user.id}, function () {
              total--;
              if(!total) {
                done();
              }
            });
          });
        });
      });
    });
	});

  describe('dpd.emptyusers', function() {
    describe('.post()', function() {
      it('should store a username', function(done) {
        chain(function(next) {
          dpd.emptyusers.post({username: "hello", password: "password"}, next);
        }).chain(function(next, res, err) {
          if (err) return done(err);
          expect(res).to.exist;
          expect(res.username).to.equal("hello");
          dpd.emptyusers.get(res.id, next);
        }).chain(function(next, res, err) {
          if (err) return done(err);
          expect(res).to.exist;
          expect(res.username).to.equal("hello");
          done();
        });
      });
    });

    afterEach(function(done) {
      dpd.emptyusers.logout(function() {
        cleanCollection(dpd.emptyusers, function() {
          done();
        });
      });
    });
  });
  
  describe('.emit("custom", {foo: "bar"})', function(){
    it('should send a custom message', function(done) {
      var input = {foo: 'bar'};
      dpd.emptyusers.emit('custom', input, function (data, err) {
        expect(data).to.eql({foo: 'bar', baz: 'baz'});
        done(err);
      });
    });
    
    it('should respond with something beside the body sent', function(done) {
      var input = {$TEST_RESPOND: true};
      dpd.emptyusers.emit('custom', input, function (data, err) {
        expect(data).to.equal('foo bar bat baz');
        done(err);
      });
    });
    

    afterEach(function (done) {
      this.timeout(10000);
      cleanCollection(dpd.users, done);
    });
  });
  
  describe('custom permissions', function(){
    it('should allow batch put', function(done) {
      chain(function(next) {
        dpd.users.post({username: 'foo', password: 'foo'}, next);
      }).chain(function(next) {
        dpd.users.post({username: 'bar', password: 'foo'}, next);
      }).chain(function(next) {
        dpd.users.post({username: 'bat', password: 'foo'}, next);
      }).chain(function (next, res, err) {
        dpd.users.put({test: '$CUSTOM_PERMISSIONS_PUT'}, {reputation: 22}, function (todos) {
          dpd.users.get(function (users) {
            users.forEach(function (user) {
              expect(user.reputation).to.equal(22);
            });
          
            done(err);
          })
        });
      });
    });
    
    it('should allow batch delete', function(done) {
      chain(function(next) {
        dpd.users.post({username: 'foo', password: 'foo'}, next);
      }).chain(function(next) {
        dpd.users.post({username: 'bar', password: 'foo'}, next);
      }).chain(function(next) {
        dpd.users.post({username: 'bat', password: 'foo'}, next);
      }).chain(function (next, res, err) {
        dpd.users.del({test: '$CUSTOM_PERMISSIONS_DELETE'}, function (todos) {
          dpd.users.get(function (todos) {
            expect(todos.length).to.equal(0);
            done(err);
          })
        });
      });
    });

    afterEach(function (done) {
      this.timeout(10000);
      cleanCollection(dpd.users, done);
    });
  //   
  });
});

