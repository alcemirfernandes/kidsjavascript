$(function () {
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

    kjs.runBuffer = function () {
        kjs.code = kjs.editor.getText(); 
        
        $('#output').empty();
        try {
          var context = {};
          var codeFn = new Function(kjs.code);
          kjs.output = codeFn.apply(context);

          if (kjs.output) {
            window.write(["Returned ", kjs.output].join(' '));
          }
        } catch (e) {
          kjs.lastError = e;
          window.write(['<span style="color:red;">Error:', kjs.lastError.message].join(' '));
        }
    };
    kjs.initializeEditor = function () {
        kjs.editor = ace.edit("editor");
        kjs.editor.setTheme("ace/theme/twilight");
        
        kjs.JavaScriptMode = require("ace/mode/javascript").Mode;
        kjs.EditSession    = require("ace/edit_session").EditSession;
        kjs.editor.getSession().setMode(new kjs.JavaScriptMode());

        // extend editor object with a getter for current code body
        kjs.editor.getText = function () {
            return this.getSelection().doc.$lines.join("\n");    
        }
    };
    kjs.initializeControls = function () {
        $('#run').click(function (e){
            e.preventDefault();
            kjs.runBuffer();
        });

        var $editor = $('#editor');
        var shifted = false;
        $editor.keydown(function (e) {
            if (e.keyCode == 16) {
                shifted = true;
            }
        });
        $editor.keyup(function (e) {
            if (e.keyCode == 16) {
                shifted = false;
            }
        });
        $editor.keypress(function (e) {
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

    kjs.initializeDb = function () {
        dbSchema = JSON.stringify({
            'saves': {}
        });
        localStorage['kjs'] = dbSchema;
        return localStorage['kjs'];
    }
    kjs.saveState = function () {
        if (!Modernizr.localstorage) {
            window.alert("Sorry, this feature is only available on newer browsers that support local storage.  We recommend Google Chrome!");
        }

        var dbString = localStorage['kjs'] || kjs.initializeDb();
        var db = JSON.parse(dbString);

        var saveName = window.prompt("Save as?", "");
        var doSave = true;
        if (saveName.length === 0) {
            window.alert("You entered a blank save name!");
            doSave = false;
        } else if (db.saves[saveName]) {
            doSave = window.confirm("Do you really want to save over " + saveName + "?");
        }

        if (doSave) {
            var saveState = {
                'code': kjs.editor.getText(),
                'lesson': ''
            };
            db.saves[saveName] = saveState;
            localStorage['kjs'] = JSON.stringify(db);
        }
    };

    kjs.initialize = function () {
      kjs.initializeUI();
      kjs.initializeEditor();
      kjs.initializeControls();
      kjs.loadLessons();
    };
    
    kjs.initialize();
});
