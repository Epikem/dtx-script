var midi = null;  // global MIDIAccess object
var $input;

var context=null;   // the Web Audio "context" object
var midiAccess=null;  // the MIDIAccess object.
var oscillator=null;  // the single oscillator
var envelope=null;    // the envelope for the single oscillator
var attack=0.01;      // attack speed
var release=0.05;   // release speed
var portamento=0.05;  // portamento/glide speed
var activeNotes = []; // the stack of actively-pressed keys
var output;
var outputs;
var targetOutput;

class Queue {
  constructor() {
    this._arr = [];
  }
  enqueue(item) {
    this._arr.push(item);
  }
  dequeue() {
    return this._arr.shift();
  }
  length() {
    return this._arr.length;
  }
}

const queue = new Queue();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function consumeQueue(queue) {
  // await sleep(1000);
  let i = 0;
  var status = '';
  while(true) {
    while(queue.length() === 0) {
      await sleep(2);
      // i+=1;
      // status =  '';  
      // if(i%100===0){
      //   for(const [key, value] of Object.entries(keyStates)) {
      //     // var status = '';
      //     status += : ' + value + ' | '  ;
      //   }
      //   console.info(status);
      // }
    }
  
    // await sleep(100);

    // console.info('queue len:', queue.length());
    var result = queue.dequeue();
    
    await sleep(1);
    handleQueueMIDIEvent(result);
    await sleep(1);
    // consumeQueue(queue);
  }
}

function handleQueueMIDIEvent(event) {
  console.info('handle queue event ', event, event.data);
  
  var status = '';  
  // for(const [key, value] of Object.entries(keyStates)) {
  //   // var status = '';
  //   // status += ': ' + '❎' + ' | '  ;
  //   if(value) {
  //     status += ' ❎';
  //   } else {
  //     status += ' ㅡ';
  //   }
  // }
  // console.info(status);

  var note = event.data[1];
  keyStates[keyCodeToKey[note]] = false;
  // output.send( event.data, event.timestamp );
  // var value = event.data[1];
  var noteOnMessage = [0x91, note, 0x7f];    // note on, middle C, full velocity
  
  // var 
  output.send( noteOnMessage );  //omitting the timestamp means send immediately.
  output.send( [0x81, note, 0x40], window.performance.now() + 100.0 ); // Inlined array creation- note off, middle C,  
                                                                      // release velocity = 64, timestamp = now + 1000ms.
}

window.addEventListener('load', function() {
  // for(var i=0; i<5; i++){
  //   queue.enqueue(i);
  // }

  consumeQueue(queue);

  window.AudioContext=window.AudioContext||window.webkitAudioContext;

  context = new AudioContext();
  if (navigator.requestMIDIAccess)
    navigator.requestMIDIAccess({ sysex: true}).then( onMIDIInit, onMIDIReject );
  else
    alert("No MIDI support present in your browser.  You're gonna have a bad time.")

  $input = document.getElementById('data');
  // set up the basic oscillator chain, muted to begin with.
  oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(110, 0);
  envelope = context.createGain();
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  envelope.gain.value = 0.0;  // Mute the sound
  oscillator.start(0);  // Go ahead and start up the oscillator
} );

function onMIDIInit(midi) {
  midiAccess = midi;
  // console.info(midiAccess)
  var haveAtLeastOneDevice=false;
  var inputs=midiAccess.inputs.values();
  outputs = midiAccess.outputs.values();
  var idx = 0;
  for ( var input = inputs.next(); input && !input.done; input = inputs.next()) {
    console.info('input' ,input)
    if(idx === 1){
      input.value.onmidimessage = MIDIMessageEventHandler;
    }
    haveAtLeastOneDevice = true;
    idx+=1;
  }
  var outputIdx = 0;
  // console.info(outputs)
  for ( var outputDevice = outputs.next(); outputDevice && !outputDevice.done; outputDevice = outputs.next()) {
    console.info(outputDevice) 
    if(outputIdx === 0) {
      // output = outputDevice;
      console.info('target device: ', outputDevice)
      output = midiAccess.outputs.get(outputDevice.value.id)
      console.info('output ', output)
    }
    // output.value.onmidimessage = MIDIMessageEventHandler;
    // haveAtLeastOneDevice = true;
    outputIdx+=1;
  }
  // output = midiAccess.outputs.get('816596074');
  if (!haveAtLeastOneDevice)
    alert("No MIDI input devices present.  You're gonna have a bad time.");
}

function onMIDIReject(err) {
  alert("The MIDI system failed to start.  You're gonna have a bad time.");
}

window.addEventListener('load', () => {
  // One-liner to resume playback when user interacted with the page.
  document.getElementById('resume').addEventListener('click', function() {
    // console.info('resume')
    context.resume().then(() => {
      // output = midiAccess.outputs.get('816596074');
      // console.log('Playback resumed successfully');
    });
  });
  document.getElementById('send').addEventListener('click', function() {
    // console.info('send')

    ///// 
    var value = Number(document.getElementById('data').value);
    sendNote(1, value)
  });
})

function sendNote(portID, note) {
  console.info('note', note, output)
  var noteOnMessage = [0x91, note, 0x7f];    // note on, middle C, full velocity
  
  // var output = midiAccess.outputs.get('816596074');
  output.send( noteOnMessage );  //omitting the timestamp means send immediately.
  output.send( [0x81, note, 0x40], window.performance.now() + 1000.0 ); // Inlined array creation- note off, middle C,  
                                                                      // release velocity = 64, timestamp = now + 1000ms.
}

var keyStates = {
  HiHatClose: false,
  Snare: false,
  BassDrum: false,
  HighTom: false,
  LowTom: false,
  Cymbal: false,
  FloorTom: false,
  HiHatOpen: false,
  RideCymbal: false,
  LeftCymbal: false,
  LeftPedal: false,
}

var keyInConfig = {
  HiHatClose: [42],
  Snare: [25,26,27,28,29,31,32,34,38  ],
  BassDrum: [36,33,112],
  HighTom: [50,48],
  LowTom: [45,47],
  Cymbal: [57,55,91],
  FloorTom: [41,43],
  HiHatOpen: [46,92],
  RideCymbal: [51,53,59,89],
  LeftCymbal: [],
  LeftPedal: [35],
}

var keyCodeToKey = {};

for(const [key, notes] of Object.entries(keyInConfig)) {
  notes.forEach(note=>{
    keyCodeToKey[note] = key;
  })
}

var keyOutConfig = {
  HiHatClose: [42],
  Snare: [38],
  BassDrum: [36,33,112],
  HighTom: [50,48],
  LowTom: [45,47],
  Cymbal: [57,55,91],
  FloorTom: [41,43],
  HiHatOpen: [46,92],
  RideCymbal: [51,53,59,89],
  LeftCymbal: [],
  LeftPedal: [35],
}


var output = null;

// function echoMIDIMessage( event ) {
//   if (output) {
//     var noteKey = keyCodeToKey[event.data[1]];
//     console.info(event.data[1]);
//     if(keyStates[noteKey]) {
//       return;
//     }
//     keyStates[noteKey] = true;
//     output.send( event.data, event.timestamp );
//   }
// }

// function onMIDISuccess( midiAccess ) {
//   console.log( "MIDI ready!" );
//   var input = midiAccess.inputs.entries.next();
//   if (input)
//     input.onmidimessage = echoMIDIMessage;
//   output = midiAccess.outputs.values().next().value;
//   if (!input || !output)
//     console.log("Uh oh! Couldn't get i/o ports.");
// }

function onMIDIFailure(msg) {
  console.log( "Failed to get MIDI access - " + msg );
}

function dec2bin(dec) {
  return (dec >>> 0).toString(2);
}

function MIDIMessageEventHandler(event) {
  // Mask off the lower nibble (MIDI channel, which we don't care about)
  // console.info('handle', event.data[0] & 0x0f)
  if(event.data[0] & 0x0f !== 15) {
    return;
  }
  
  var note = keyCodeToKey[Number(event.data[1])];
  if(keyStates[note]) {
    return;
  }
  keyStates[note] = true;
  // console.info(keyCodeToKey)
  // console.info(keyCodeToKey['38']);
  // console.info(note, event.data[1], keyCodeToKey[event.data[1]])
  // console.info(keyStates)

  console.info('midi event')
  console.info(event, dec2bin(event.data[0]) + dec2bin(event.data[1]) + dec2bin(event.data[2]));
  queue.enqueue(event);
  // switch (event.data[0] & 0xf0) {
  //   case 0x90:
  //     if (event.data[2]!=0) {  // if velocity != 0, this is a note-on message
  //       noteOn(event.data[1]);
  //       return;
  //     }
  //     // if velocity == 0, fall thru: it's a note-off.  MIDI's weird, y'all.
  //   case 0x80:
  //     noteOff(event.data[1]);
  //     return;
  // }
}

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}

function noteOn(noteNumber) {
  console.info('noteOn', noteNumber)

  // activeNotes.push( noteNumber );
  // oscillator.frequency.cancelScheduledValues(0);
  // oscillator.frequency.setTargetAtTime( frequencyFromNoteNumber(noteNumber), 0, portamento );
  // envelope.gain.cancelScheduledValues(0);
  // envelope.gain.setTargetAtTime(1.0, 0, attack);
}

function noteOff(noteNumber) {
  console.info('noteOff', noteNumber)
  // var position = activeNotes.indexOf(noteNumber);
  // if (position!=-1) {
  //   activeNotes.splice(position,1);
  // }
  // if (activeNotes.length==0) {  // shut off the envelope
  //   envelope.gain.cancelScheduledValues(0);
  //   envelope.gain.setTargetAtTime(0.0, 0, release );
  // } else {
  //   oscillator.frequency.cancelScheduledValues(0);
  //   oscillator.frequency.setTargetAtTime( frequencyFromNoteNumber(activeNotes[activeNotes.length-1]), 0, portamento );
  // }
}

// navigator.requestMIDIAccess()
//   .then(function(access) {

//      // Get lists of available MIDI controllers
//      const inputs = access.inputs.values();
//      const outputs = access.outputs.values();

//      console.info(access)

//      access.onstatechange = function(e) {

//        // Print information about the (dis)connected MIDI controller
//        console.log(e.port.name, e.port.manufacturer, e.port.state);
//      };
// });