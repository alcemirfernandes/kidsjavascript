$(function() {
    var output = $('#output')[0];
    window.write = function(str) {
      output.innerHTML += str + "\n";
    }

    var kjs = window.kjs = {};
    kjs.runBuffer = function() {
        kjs.code   = kjs.editor.getSelection().doc.$lines.join("\n"); 
        $('#output').empty();
        try {
          kjs.output = eval(kjs.code);
        } catch (e) {
          kjs.lastError = e;
        }
        console.log(output);     
    };
    kjs.initializeEditor = function() {
        kjs.editor = ace.edit("editor");
        kjs.editor.setTheme("ace/theme/twilight");
        
        var JavaScriptMode = require("ace/mode/javascript").Mode;
        kjs.editor.getSession().setMode(new JavaScriptMode());
    };
    kjs.initializeControls = function() {
        $('#run').click(function(e){
            e.preventDefault();
            kjs.runBuffer();
        });

        var $editor = $('#editor');
        var shifted = false;
        $editor.keydown(function(e) {
            if (e.keyCode == 16) {
                shifted = true;
            }
        });
        $editor.keyup(function(e) {
            if (e.keyCode == 16) {
                shifted = false;
            }
        });
        $editor.keypress(function(e) {
          if (e.keyCode === 13 && shifted) {
              e.preventDefault();
              kjs.runBuffer();
          }
        });
    };
    kjs.initialize = function() {
      kjs.initializeEditor();
      kjs.initializeControls();
    };
    
    kjs.initialize();
});
