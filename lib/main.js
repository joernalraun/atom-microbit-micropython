'use babel';

import path from 'path';
import uflash from './uflash';

import { Disposable } from 'atom';
import { CompositeDisposable } from 'atom';

export default {

  subscriptions: null,
  toolBar: null,
  uFlash: null,
  terminal: null,

  config: {
      uflashExecutable: {
      title: 'flash utility',
      description: 'For flashing the micropython firmware to ' +
                   'the microbit, the `uflash` utility is used. You could use ' +
                   '`sudo pip install uflash` to globally install it for your ' +
                   'system. If the `uflash` executable is in your path, it is ' +
                   'sufficient to specify `uflash` here. Otherwise give the ' +
                   'full path to `uflash`.',
      type: 'string',
      default: 'uflash',
      order: 10
    },
    microbitPath: {
      title: 'microbit drive',
      description: 'By default, the `uflash` utility tries to autodetect the ' +
                   'path to the microbit drive. However, if this is not working ' +
                   'for you, specify the full path to the drive here (e.g. ' +
                   'something like `/media/usb/MICROBIT`).',
      type: 'string',
      default: 'autodetect',
      order: 20
    },
    serialTermCommand: {
      title: 'serial terminal command for REPL',
      description: 'Command used to start a serial terminal to display the ' +
                   'microbit REPL. To make use of the serial terminal, a package ' +
                   'which offers the `runInTerminal` service is needed. E.g. ' +
                   '`platformio-ide-terminal` or `termination`.',
      type: 'string',
      default: 'miniterm.py',
      enum: ['miniterm.py', 'microrepl.py', 'screen'],
      order: 30
    },
    serialTermPath: {
      title: 'path to serial terminal command',
      description: 'If the above command is not in your path, give the path to ' +
                   'it here. Else set it to `None`.',
      type: 'string',
      default: 'None',
      order: 40
    },
    serialTermPort: {
      title: 'serial port',
      description: 'The serial port used for connecting to the REPL of the microbit-micropython.',
      type: 'string',
      default: '/dev/ttyACM0',
      order: 50
    },
    serialTermBaudrate: {
      title: 'serial baudrate',
      description: 'The baudrate used for connecting to the REPL of the microbit-micropython. ' +
                   'Note, that only 115200 will work on the offical firmware.',
      type: 'integer',
      default: 115200,
      enum: [300, 1200, 2400, 4800, 9600,  14400, 19200, 28800,
             38400, 57600, 115200, 230400],
      order: 60
    }
  },

  activate(state)
  {
    this.uFlash = new uflash();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'microbit-micropython:pack': () => this.pack()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'microbit-micropython:flash': () => this.flash()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'microbit-micropython:repl': () => this.repl()
    }));
  },

  deactivate()
  {
    this.subscriptions.dispose();
  },

  consumeToolBar(toolbar) {
    this.toolBar = toolbar('microbit-micropython');

    this.toolBar.addButton({
      icon: 'zap',
      callback: 'microbit-micropython:flash',
      tooltip: 'Flash \"micropython.hex\"'
    });

    this.toolBar.addButton({
      icon: 'gift',
      callback: 'microbit-micropython:pack',
      tooltip: 'Pack \"micropython.hex\"'
    });

    this.toolBar.addButton({
      icon: 'browser',
      callback: 'microbit-micropython:repl',
      tooltip: 'Open micropython REPL'
    });

    this.toolBar.addSpacer();

    this.toolBar.addButton({
      icon: 'gear',
      callback: 'application:show-settings',
      tooltip: 'Atom Settings'
    });
  },

  consumeRunInTerminal(terminal)
  {
    this.terminal = terminal;

    return new Disposable(() => {
      this.terminal = null;
    });
  },

  pack()
  {
    editor = atom.workspace.getActiveTextEditor();
    grammar = editor.getGrammar();

    if(grammar.name == "Python") {

      if(editor.isModified()) {
        editor.save();
        atom.notifications.addInfo("File saved!");
      }

      source = editor.getPath();
      target = source.substr(0, source.length - editor.getTitle().length);

      this.uFlash.pack(source, target);
    }
    else {
      atom.notifications.addError("Pack only works on Python files");
    }
  },

  flash()
  {
    editor = atom.workspace.getActiveTextEditor();
    modified = editor.isModified();
    grammar = editor.getGrammar();

    if(modified) {
      atom.notifications.addError("Please save file first");
    }
    else if(grammar.name == "Python") {

      source = editor.getPath();

      this.uFlash.flash(source);
    }
    else {
      atom.notifications.addError("Flash only works on Python files");
    }
  },

  repl()
  {
    if(this.terminal) {
      term = atom.config.get("microbit-micropython.serialTermCommand");
      termPath = atom.config.get("microbit-micropython.serialTermPath");

      if(termPath != "None") {
        term = path.join(termPath, term);
      }

      port = atom.config.get("microbit-micropython.serialTermPort");
      baudrate = atom.config.get("microbit-micropython.serialTermBaudrate");

      if(term == 'miniterm.py' || term == 'microrepl.py') {
        cmd = 'while true; do clear; ' + term + ' ' + port + ' ' +
              baudrate + '; ' + 'sleep 1; done';
      }
      else {
        cmd = term + ' -r microbit-repl || (while true; do clear; ' +
              term + ' -S microbit-repl ' + port + ' ' + baudrate + '; ' +
              'sleep 1; done)';
      }

      this.terminal.run([cmd]);
    }
  }
};