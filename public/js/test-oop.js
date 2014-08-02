var Person = Class.extend({
  init: function(isDancing){
    this.dancing = isDancing;
  },
  dance: function(){
    return this.dancing;
  }
});

var Ninja = Person.extend({
  init: function(){
    this._super( false );
  },
  dance: function(){
    // Call the inherited version of dance()
    return this._super();
  },
  swingSword: function(){
    return true;
  }
});

var p = new Person(true);
console.log(p.dance()); // => true

var n = new Ninja();
console.log(n.dance()); // => false
console.log(n.swingSword()); // => true

// Should all be true
console.log(p instanceof Person && p instanceof Class &&
n instanceof Ninja && n instanceof Person && n instanceof Class) // => true