// ace.define("ace/mode/vdm_highlight_rules", ["require", "exports", "module", "ace/lib/oop", "ace/mode/doc_comment_highlight_rules", "ace/mode/text_highlight_rules"], function (require, exports, module) {
//     // TODO:
// });

ace.define('ace/mode/vdm_highlight_rules', ['require', 'exports', 'ace/lib/oop', 'ace/mode/text_highlight_rules'], (acequire, exports) => {
    const oop = acequire('ace/lib/oop');
    const TextHighlightRules = acequire('ace/mode/text_highlight_rules').TextHighlightRules;

    const VDMHighlightRules = function () {

        this.$rules = {
            start:
                [{
                    token: 'keyword.control.vdm',
                    regex: '\\b(?:INITIALIZE_TRIM|SECONDS_WAIT|RELATIVE_TRIM|ABSOLUTE_TRIM|START_FIT|END_FIT|END_SEQUENCE|MESSAGE)\\b',
                    caseInsensitive: true
                },
                {
                    token: 'constant.character.decimal.assembly',
                    regex: '\\b[0-9]+\\b'
                },
                { token: 'comment.assembly', regex: '#' }]
        };

        this.normalizeRules();
    };

    VDMHighlightRules.metaData = {
        fileTypes: ['vdm'],
        name: 'VDM',
        scopeName: 'source.vdm'
    };
  
    oop.inherits(VDMHighlightRules, TextHighlightRules);
  
    exports.vdmHighlightRules = VDMHighlightRules;
  });

ace.define("ace/mode/vdm", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/worker/worker_client"], function (require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var vdmHighlightRules = require("./vdm_highlight_rules").vdmHighlightRules;
    var WorkerClient = require("../worker/worker_client").WorkerClient;

    var Mode = function () {
        this.HighlightRules = vdmHighlightRules;
    };
    oop.inherits(Mode, TextMode);

    exports.Mode = Mode;
});
