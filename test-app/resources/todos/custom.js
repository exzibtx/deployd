dpd.todos.get({$limit: 2}, function (results) {
  this.baz = 'baz';
});

if(this.$TEST_RESPOND) {
  dpd.todos.get({$limit: 2}, function (results) {
    respond('foo bar bat baz');
  });
}

if(this.$BATCH_PUT) {
  dpd.todos.put({}, {title: this.$BATCH_PUT}, function () {
    // wait
  });
}
