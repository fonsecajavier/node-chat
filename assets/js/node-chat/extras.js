_.escapeWithBr = function(str){
  return _.escape(str).replace(/\n/g, "<br />");
}