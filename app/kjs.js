// vim: ts=4:sw=4
$(function () {
    var kjs = window.kjs = {};

    /* INITIALIZATION */

    kjs.initialize = function () {
      kjs.app = new kjs.AppView();

      kjs.workbench = new kjs.Workbench();
      kjs.loadLessons(function() {
        kjs.SavedStates.fetch();
         
        Backbone.history.start();
      });
    };

    kjs.AppView = Backbone.View.extend({
        
        el: $('#container'),

        events: {
            "click #run":        "runBuffer",  // run button
            "keypress #editor":  "runBuffer",  // shift + enter to run console
            "click #open-state": "openState",  // open and load a saved editor/lesson state
            "click #save-state": "saveState",  // save editor/lesson state
            "click #browse":     "openBrowse", // Open lesson browsing
            "mouseout #lesson-browse-dialog": "closeBrowse",
            "mouseover #lesson-browse-dialog": "ensureBrowse"
        },

        templates: {
            "open-state-dialog":    _.template($('#open-state-dialog').html()),
            "lesson-browse-dialog": _.template($('#lesson-browse-dialog-tmpl').html()),
            "console-output"              : _.template($('#console-output-tmpl').html()),
            "raphael-output"              : _.template($('#raphael-output-tmpl').html())
        },

        initialize: function () {
            _.bindAll(this, 'runBuffer', 'render', 'loadLesson', 'saveState', 'loadState', 'openState');

            this.console = {
                write:  function (str) {
                    // NOTE: we only use the less readable array.join method since we don't know how this
                    // function will be called and whether performance will matter (possibly 10^20 times, who knows!)
                    var output = $('#console')[0];
                    output.innerHTML = [output.innerHTML, str, "\n"].join("");
                }
            };

            // init jquery buttons
            this.$('a.button').button();

            // init ace javascript editor
            this.editor = ace.edit("editor");
            this.editor.setShowPrintMargin(false);
            this.editor.setTheme("ace/theme/twilight");
            
            var JavaScriptMode = require("ace/mode/javascript").Mode;
            this.editorMode = new JavaScriptMode();
            this.editor.getSession().setMode(this.editorMode);
        },

        runBuffer: function (e) {
            if ( (!e.shiftKey || !(e.keyCode === 13)) && !(e.type === 'click') ) {
                return;
            }
            e.preventDefault();
            this.code = this.editor.getSession().getValue(); 
            
            $('#console').empty();
  
            if (this.lesson.get('type') === 'raphael') {
                this.paper.clear();
            }

            try {
                var context = {
                };
                //var args = [ {}, this.console ];
                var codeFn = new Function("window", "document", "$", "jQuery", "console", "paper", this.code);
                this.returned = codeFn.call(context, {}, {}, {}, {}, this.console, this.paper);

                if (this.returned) {
                    this.console.write(["Returned ", this.returned].join(' '));
                }
            } catch (e) {
                this.lastError = e;
                this.console.write(['<span style="color:red;">Error:', this.lastError.message].join(' '));
            }
        },

        render: function() {
            this.editor.getSession().setValue(this.lesson.get("editorContents"));
            this.$('#browse span').html((this.lesson.get("index") + 1) + " of " +
                               kjs.lessons.length + " - " + 
                               this.lesson.get('name'));

            var prevLesson    = kjs.lessons.at(this.lesson.get("index") - 1);
            var prevLessonUrl = prevLesson ? '#' + kjs.workbench.urls.lesson(prevLesson.get("id")) :
                                             '#' + kjs.workbench.urls.lesson(this.lesson.get("id"));
            this.$('#prev-lesson').attr('href', prevLessonUrl);

            
            var nextLesson    = kjs.lessons.at(this.lesson.get("index") + 1);
            var nextLessonUrl = nextLesson ? '#' + kjs.workbench.urls.lesson(nextLesson.get("id")) :
                                             '#' + kjs.workbench.urls.lesson(this.lesson.get("id"));
            this.$('#next-lesson').attr('href', nextLessonUrl);

            var ltype = this.lesson.get('type');
            var blankOutput = null;
            if (ltype === 'raphael') {
                blankOutput = this.templates['raphael-output']();
            } else {
                blankOutput = this.templates['console-output']();
            }
            this.$('#output-container').html(blankOutput);

            if (ltype === 'raphael') {
                this.paper = Raphael('paper',370, 300);
            }
        },

        loadLesson: function (lesson) {
            this.lesson = lesson;            
            this.render();
        },
        
        saveState: function () {
            if (!Modernizr.localstorage) {
                window.alert("Sorry, this feature is only available on newer browsers that support local storage.  We recommend Google Chrome!");
                return;
            }

            var saveName = window.prompt("Save as?", "");
            if (saveName.length === 0) {
                window.alert("You entered a blank save name!");
                return;
            }

            if (kjs.SavedStates.exists(saveName)) {
                doSave = window.confirm("Do you really want to save over " + saveName + "?");
                if (!doSave) {
                    return;
                }
                var state = kjs.SavedStates.getById(saveName);
                state.set({
                    "id":     saveName,
                    "code":   this.editor.getSession().getValue(),
                    "lesson": this.lesson.get("id")
                });
                state.save();
            } else {
                kjs.SavedStates.create({
                    "id" :    saveName,
                    "code":   this.editor.getSession().getValue(),
                    "lesson": this.lesson.get("id")
                }); 
            }
        },

        loadState: function (state) {
            this.editor.getSession().setValue(state.get("code"));
        },

        openState: function (e) {
            e.preventDefault();
            var states = kjs.SavedStates.pluck("id");
            var dialogHTML = this.templates['open-state-dialog']({
                'states': states
            });
            $(dialogHTML).dialog({
                'autoOpen': true,
                'modal':    true,
                'buttons': {
                    'Ok': function () {
                        var stateId = $(this).val();
                        window.location.hash = "/states/" + stateId;
                        $(this).dialog("close");
                    },
                    'Cancel': function () {
                        $(this).dialog("close");
                    }
                }
            });
        },

        openBrowse: function(e) {
            this.toggleBrowse(e,'open');
        },
        closeBrowse: function(e) {
            var self = this;
            this.closeBrowseTimeout = setTimeout(function() {
                self.toggleBrowse(e,'close');
            }, 500);
        },
        ensureBrowse: function(e) {
            if (this.closeBrowseTimeout) {
                clearTimeout(this.closeBrowseTimeout);
            }
        },
        toggleBrowse: function(e,state) {
            if (e) {
                e.preventDefault();
            }

            var self = this;
            var browseCont = $('#lesson-browse-dialog');
             
            if (state === 'close') {
                self.browseOpen = false;
                browseCont.hide();
            } else {
                self.browseOpen = true;
                 
                var browseHTML = self.templates['lesson-browse-dialog']({
                    'lessons': kjs.lessons
                });
                 
                browseCont.html(browseHTML);
                browseCont.find('a').click(function(e) {
                  self.toggleBrowse(null, 'close');
                });
                browseCont.show();
            }
        }
    });

    kjs.Workbench = Backbone.Router.extend({
      routes: {
          "/lessons/:lessonId": "lesson",
          "/states/:stateId":   "state"
      },

      urls: {
        lesson: function(lessonId) {
            return "/lessons/" + lessonId;
        }
      },

      lesson: function(lessonId) {
        var lesson = kjs.lessons.find(function(lesson) {
            return(lesson.get('id') === lessonId);
        });

        kjs.app.loadLesson(lesson);
      },

      state: function(stateId) {
        var state = kjs.SavedStates.getById(stateId);
        this.lesson(state.get("lesson"));
        kjs.app.loadState(state);
      }
    });

    /* LESSON MANAGEMENT */

    kjs.Lesson = Backbone.Model.extend({
    });

    kjs.Lessons = Backbone.Collection.extend({
        model: kjs.Lesson,
    });

    kjs.loadLessons = function(callback) {
        $.get('lessons.xml').
        success(function(data) {
            var lessonsXML = $(data);
            kjs.lessons = new kjs.Lessons();
            lessonsXML.find('lesson').each(function(i,lessonXML) {
                var $x   = $(lessonXML);
                var id   = $x.attr('id').trim();
                var name = $x.attr('name').trim();
                var type = $x.attr('type').trim();
                var editorContents = $($x.find('editor')[0]).text().trim();
                return kjs.lessons.add({id: id, index: i, name: name, type: type,
                                        editorContents: editorContents});
            });

            window.location.hash = kjs.workbench.urls.lesson(kjs.lessons.first().get('id'));

            if (callback) { callback() };
        }).
        error(function() {
            alert("Could not load lessons");
        });
    };

    /* LOCAL DATABASE */

    kjs.State = Backbone.Model.extend({

        defaults: {
            "id"  : "default",
            "code"  : "",
            "lesson": ""
        }
    });

    kjs.States = Backbone.Collection.extend({
        localStorage: new Store("saved_states"),

        model: kjs.SavedState,

        exists: function (id) {
            return this.some(function (state) {
                return state.get("id") === id;
            });
        },

        getById: function (id) {
            return this.find(function (state) {
                return state.get("id") === id;
            });
        },

        comparator: function (state) {
            return state.get("id");
        },
    });

    kjs.SavedStates = new kjs.States();

    kjs.SavedStateSelector = Backbone.View.extend({
    });

    kjs.initialize();
});
