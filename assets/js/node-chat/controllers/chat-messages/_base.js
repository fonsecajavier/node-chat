NodeChat.Controllers.ChatMessages.Base = NodeChat.Controllers.Base.extend({
  $message: null,
  $messagesContainer: null,
  templateName: null,
  messageObject: null,

  init: function(app, $messagesContainer, templateName, messageObject){
    this._super( app );

    this.$messagesContainer = $messagesContainer;
    this.templateName = templateName;
    this.messageObject = messageObject;

    this.render();
  },

  render: function(){
    if(!this.processedMessageObject){
      throw "Can't find definition for processedMessageObject function.  Make sure you're extending ChatMessages.Base class and setting up this method."
    }

    var rendered = Mustache.render(this.app.templates[this.templateName], this.processedMessageObject());
    this.$message = $(rendered).appendTo(this.$messagesContainer);    
  }

});