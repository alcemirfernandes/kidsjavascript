$(function() {
    var output = $('#output')[0];
    window.write = function(str) {
      output.innerHTML += str + "\n";
    }

    var kjs = window.kjs = {};
    kjs.initialize = function() {
        kjs.editor = ace.edit("editor");
        kjs.editor.setTheme("ace/theme/twilight");
        
        var JavaScriptMode = require("ace/mode/javascript").Mode;
        kjs.editor.getSession().setMode(new JavaScriptMode());

        $('#run').click(function(e){
            e.preventDefault();
             
            kjs.code   = kjs.editor.getSelection().doc.$lines.join("\n"); 
            try {
              kjs.output = eval(kjs.code);
            } catch (e) {
              kjs.lastError = e;
            }
            console.log(output);
        });
        
    };
    
    kjs.initialize();
});
