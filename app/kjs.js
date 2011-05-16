$(function() {
    var output = $('#output')[0];
    window.write = function(str) {
      output.innerHTML += str + "\n";
    }

    var kjs = window.kjs = {};

    kjs.Lesson = function(id,name,editorContents) {
      this.id   = id;
      this.name = name;
      this.editorContents = editorContents;
      this.load = function () {
          kjs.editor.setSession(new kjs.EditSession(this.editorContents));
      }
    }

    kjs.runBuffer = function() {
        kjs.code   = kjs.editor.getSelection().doc.$lines.join("\n"); 
        $('#output').empty();
        try {
          kjs.output = eval(kjs.code);
        } catch (e) {
          kjs.lastError = e;
        }
    };
    kjs.initializeEditor = function() {
        kjs.editor = ace.edit("editor");
        kjs.editor.setTheme("ace/theme/twilight");
        
        kjs.JavaScriptMode = require("ace/mode/javascript").Mode;
        kjs.EditSession    = require("ace/edit_session").EditSession;
        kjs.editor.getSession().setMode(new kjs.JavaScriptMode());
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
    kjs.loadHashLesson = function () {
        var lessonId = $(window.location.hash.split('/')).last()[0]; 
        for (var i = 0; i < kjs.lessons.length; i++) {
            var lesson = kjs.lessons[i];
            if (lesson.id === lessonId) {
                lesson.load();
                break;
            }
        }
    };
    kjs.loadLessons = function() {
        $.get('lessons.xml').
        success(function(data) {
            var lessonsXML = $(data);
            kjs.lessons = lessonsXML.find('lesson').map(function(i,lessonXML) {
                var $x   = $(lessonXML);
                var id   = $x.attr('id');
                var name = $x.attr('name');
                var editorContents = $($x.find('editor')[0]).text();
                return new kjs.Lesson(id,name,editorContents);
            });

            window.onhashchange = kjs.loadHashLesson;
            window.location.hash = "/lessons/" + kjs.lessons[0].id
            kjs.loadHashLesson();
        }).
        error(function() {
            alert("Could not load lessons");
        });
    };
    kjs.initializeUI = function() {
      $('a.button').button();
    };
    kjs.initialize = function() {
      kjs.initializeUI();
      kjs.initializeEditor();
      kjs.initializeControls();
      kjs.loadLessons();
    };
    
    kjs.initialize();
});
