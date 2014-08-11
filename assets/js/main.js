//= require oop.js
//= require mediator.js
//= require node-chat/extras.js
//= require node-chat/namespace.js
//= require node-chat/client-app.js
//= require node-chat/base-controller.js
//= require node-chat/modal-controller.js
//= require_tree node-chat/controllers

$(document).foundation('alert','events'); // alert, events.  Required for alerts close button event.

$(function() {
  window.app = new NodeChat.ClientApp();
  new NodeChat.Controllers.Init( window.app, $('body') );
});