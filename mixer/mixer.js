/**
 * A mixer object encapsulates all the function of this page.
 * @returns {Mixer}
 */
function Mixer() {
  // Initialize instance variables
  this.initialized = false;
  this.currentSong = {};
  this.playing = false;
  this.state = Mixer.state.UNLOADED;
  this.tracks = [];
  
  // Create DOM elements.
  this.root = document.createElement("div");
  this.songSelector = document.createElement("select");
  this.songSelectorButton = document.createElement("button");
  var songSelectorLabel = document.createElement("label");
  this.loadText = document.createElement("div");
  this.controlPanel = document.createElement("div");
  this.playPauseButton = document.createElement("button");
  this.stopButton = document.createElement("button");
  this.trackPanel = document.createElement("div");
  
  // Initialize DOM elements.
  this.root.className = "mixerRoot";
  this.songSelector.id = "songSelector";
  this.songSelectorButton.innerHTML = "Load";
  this.songSelectorButton.addEventListener("click", this.loadSelected.bind(this));
  songSelectorLabel.innerHTML = "Select a song:";
  songSelectorLabel.for = "songSelector";
  this.loadText.innerHTML = "Loading...";
  this.loadText.hidden = true;
  this.playPauseButton.innerHTML = "Play";
  this.playPauseButton.onclick = this.playPause.bind(this);
  this.stopButton.innerHTML = "Stop";
  this.stopButton.onclick = this.stop.bind(this);
  this.controlPanel.hidden = true;
  this.controlPanel.appendChild(this.playPauseButton);
  this.controlPanel.appendChild(this.stopButton);
  this.trackPanel.className = "trackPanel";
  
  // Add DOM elements to the root container.
  this.root.appendChild(songSelectorLabel);
  this.root.appendChild(this.songSelector);
  this.root.appendChild(this.songSelectorButton);
  this.root.appendChild(this.loadText);
  this.root.appendChild(this.controlPanel);
  this.root.appendChild(this.trackPanel);
}

Mixer.state = {
  UNLOADED : -1,
  LOADING : 0,
  PLAYING : 1,
  PAUSED : 2,
  STOPPED : 3
};

Object.freeze(Mixer.state);

/**
 * Load the currently selected song into the mixer.
 * @returns {undefined}
 */
Mixer.prototype.loadSelected = function(event) {
  this.stop();
  this.controlPanel.hidden = false;
  this.currentSong = this.songInfos[this.songSelector.value];
  this.unloadAll();
  history.pushState(null, null, '#'+this.songSelector.value);
  this.loadText.hidden = false;
  this.state = Mixer.state.LOADING;
  for (var t in this.currentSong.tracks) {
    this.addTrack(this.currentSong.tracks[t].name,
                  this.currentSong.tracks[t].path,
                  this.currentSong.tracks[t].channels,
                  this.currentSong.e);
  }
  this.state = Mixer.state.STOPPED;
};

Mixer.prototype.playPause = function(event) {
  switch(this.state) {
    case Mixer.state.PLAYING:
      this.pause();
      break;
    case Mixer.state.PAUSED:
    case Mixer.state.STOPPED:
      this.play();
      break;
  }
};

Mixer.prototype.pause = function() {
  this.playPauseButton.innerText = "Play";
  this.tracks.forEach(function(track){
    track.pause();
  });
  this.state = Mixer.state.PAUSED;
};

Mixer.prototype.play = function(when) {
  this.playPauseButton.innerText = "Pause";
  this.state = Mixer.state.PLAYING;
  this.tracks.forEach(function(track){
    track.play(when);
  });
};

Mixer.prototype.stop = function(event) {
  if(this.state === Mixer.state.PLAYING){
    this.state = Mixer.state.STOPPED;
    this.tracks.forEach(function(track){
      track.stop();
    });
    this.playPauseButton.innerText = "Play";
  }
};

Mixer.prototype.seek = function(when) {
  if(this.state === Mixer.state.PLAYING) {
    this.play(when);
  }
  else {
    this.play(when);
    this.pause();
  }
};

/**
 * Initialize the mixer. This will place all the mixer's DOM stuff into the given element.
 * @param {Element} targetElement
 */
Mixer.prototype.init = function(targetElement, songInfos) {
  if (this.initialized)
  {
    throw "Mixer has already been initialized.";
  }
  this.initialized = true;
  this.songInfos = songInfos;
  
  targetElement.appendChild(this.root);
  
  var hashFound = false;
  for (var i in songInfos){
    var option = document.createElement("option");
    option.innerHTML = songInfos[i].name;
    option.value = i;
    this.songSelector.appendChild(option);
    if(i === window.location.hash.substring(1))
      hashFound = true;
  }
  if(hashFound) {
    this.songSelector.value = window.location.hash.substring(1);
    this.loadSelected();
  }
};

Mixer.prototype.unloadAll = function() {
  this.tracks.forEach(function(track){
    track.unload();
  });
  this.tracks = [];
  this.controlPanel.hidden = true;
};

Mixer.prototype.addTrack = function(name, file, channels) {
  this.tracks[this.tracks.length] = new Track(this, name, file, channels);
};

Mixer.prototype.soloOn = function(track) {
  this.tracks.forEach(function(t){
    if(t !== track) {
      if(!t.muted && !t.soloed) {
        t.toggleMute();
      }
    }
  });
};

Mixer.prototype.soloOff = function(track) {
  var numSoloed = 0;
  this.tracks.forEach(function(t){
    if(t !== track) {
      if(t.soloed) {
        numSoloed++;
      }
    }
  });
  if(numSoloed === 0)
    this.tracks.forEach(function(t){
      if(t !== track) {
        if(t.muted && !t.soloed) {
          t.toggleMute();
        }
      }
    });
  else if(!track.muted)
    track.toggleMute();
};

Mixer.prototype.reportTrackLoad = function() {
  var allLoaded = true;
  this.tracks.forEach(function(t){
    if(!t.loaded) allLoaded = false;
  });
  if(allLoaded) {
    this.controlPanel.hidden = false;
    this.loadText.hidden = true;
  }
};

/**
 * A Track handles a single audio file.
 * @param {Mixer} mixer
 * @param {String} name
 * @param {String} path
 * @param {Number} channels
 * @param {Boolean} e
 */
function Track(mixer, name, path, channels, e) {
  this.mixer = mixer;
  this.root = document.createElement("div");
  this.root.className = "track";
  this.muted = false;
  this.soloed = false;
  this.loaded = false;
  
  var controlPanel = document.createElement("div");
  controlPanel.className = "controlPanel";
  
  this.muteButton = document.createElement("button");
  this.muteButton.innerHTML = "M";
  this.muteButton.title = "Mute";
  this.muteButton.onclick = this.toggleMute.bind(this);
  this.muteButton.hidden = true;
  this.soloButton = document.createElement("button");
  this.soloButton.innerHTML = "S";
  this.soloButton.title = "Solo";
  this.soloButton.onclick = this.toggleSolo.bind(this);
  this.soloButton.hidden = true;
  this.trackLabel = document.createElement("span");
  this.trackLabel.innerText = name;
  this.loadingText = document.createElement("div");
  this.loadingText.innerText = "Loading 0%";
  this.fader = document.createElement("input");
  this.fader.type = "range";
  this.fader.className = "fader";
  this.fader.min = 10;
  this.fader.value = 100;
  this.fader.hidden = true;
  this.fader.oninput = (function(){ this.resetVol(); }).bind(this);
  this.waveform = document.createElement("div");
  this.waveform.className = "waveform";
  
  this.audio = Object.create(WaveSurfer);
  this.audio.init({
    container: this.waveform,
    splitChannels : true,
    height: (100 / channels)
  });
  this.audio.on('loading', function(progress) {
    this.loadingText.innerText = "Loading "+ progress + "%";
    if(progress == 100) {
      this.loadingText.innerText = "Processing...";
    }
  }.bind(this));
  this.audio.on('ready', function(){
    controlPanel.removeChild(this.loadingText); 
    this.loaded = true;
    this.mixer.reportTrackLoad();
    this.fader.hidden = false;
    this.muteButton.hidden = false;
    this.soloButton.hidden = false;
  }.bind(this));
  if(e)
    window.setTimeout(function(){ loadE(path) }.bind(this), 100);
  else
    this.audio.load(path);
  this.audio.on('seek', (function(){
    this.mixer.seek(this.audio.getCurrentTime());
  }).bind(this));
  controlPanel.appendChild(this.trackLabel);
  controlPanel.appendChild(this.loadingText);
  controlPanel.appendChild(this.muteButton);
  controlPanel.appendChild(this.soloButton);
  controlPanel.appendChild(this.fader);
  
  this.root.appendChild(controlPanel);
  this.root.appendChild(this.waveform);
  mixer.trackPanel.appendChild(this.root);
}

Track.prototype.loadE = function(path) {
  
};

Track.prototype.play = function(where) {
  this.audio.play(where);
};

Track.prototype.pause = function() {
  this.audio.pause();
};

Track.prototype.stop = function() {
  this.audio.stop();
};

Track.prototype.toggleSolo = function() {
  if(this.soloed) {
    this.soloed = false;
    this.mixer.soloOff(this);
    this.soloButton.classList.remove("soloed");
  } else {
    if(this.muted) this.toggleMute();
    this.mixer.soloOn(this);
    this.soloButton.classList.add("soloed");
    this.soloed = true;
  }
};

Track.prototype.toggleMute = function() {
  if(this.muted) {
    this.muted = false;
    this.muteButton.classList.remove("muted");
    this.resetVol();
  } else {
    this.muted = true;
    this.muteButton.classList.add("muted");
    this.audio.setVolume(0);
  }
};

Track.prototype.unmute = function() {
  
};

Track.prototype.resetVol = function() {
  if(this.muted) return;
  this.audio.setVolume(1 - Math.log(11 - this.fader.value/10) / Math.LN10);
};

/**
 * Perform all unloading tasks for this track.
 */
Track.prototype.unload = function() {
  if(this.audio.isPlaying()) this.audio.pause();
  this.audio.destroy();
  this.root.parentNode.removeChild(this.root);
};

