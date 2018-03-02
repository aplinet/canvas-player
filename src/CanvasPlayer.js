/*eslint-disable */
(function Factory (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define('CanvasPlayer',[], function () {
            return factory();
        });
    } else if ('object' === typeof module && module.exports) {
        // CommonJS
        module.exports = factory();
    } else {
        // Browser globals
        root.CanvasPlayer = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
/*eslint-enable */

    var CanvasPlayer = function CanvasPlayer(element,args){
        // performance .now() shim
        var performance = window.performance || {};
    
    /*eslint-disable */
        performance.now = (function now() {
            var now = Date.now();
            return performance.now ||
            performance.webkitNow ||
            performance.msNow ||
            performance.oNow ||
            performance.mozNow ||
          function() { return Date.now() - now; };
        })();
    
    /*eslint-enable */
        
        var SECOND = 1000;
        var defaults = {
            width:600,
            height:600,
            sources:[]
        }
    
        try {
            
            // Local variables
            var parsers = {};
            var self = this;
            var currentTime = 0;
            var loopID = null;
            var before = performance.now();
            var fpsInterval = 0;
            var playing = false;
            var reversed = false;
            var loaded = false;
            var timeScale = 1;
            var loadProgress = 0;
            var callbacks = {};
    
    
            // Public variables
            self.element = null;
            self.frames = {};
            self.options = extend({},defaults,args);
            
            if (typeof element ==='string'){
                self.element = document.querySelector(element);
            }
            if (typeof element ==='object' && typeof element.nodeName ==='string'){
                self.element = element;
            }
            if (self.element === null){
                throw('Element not found');
            }
            if (self.element.nodeName !=='CANVAS'){
                throw('Target element is not a canvas');
            }    
            
            //Public methods
            self.init = init;
            self.getContext = getContext;
            self.addParser = addParser;
            self.getParsers = getParsers;
            self.time = time;
            self.duration = duration;
            self.seek = seek;
            self.play = play;
            self.reverse = reverse;
            self.isPlaying = isPlaying;
            self.isReversed = isReversed;
            self.isLoaded = isLoaded;
            self.pause = pause;
            self.destroy = destroy;
            self.on = on;
            self.off = off;
            self.trigger = trigger;
    
            //Init
            self.addParser('sprite',parseSprite);
            self.addParser('series',parseSeries);
            self.init();
    
            function parseSprite(source){
                var sourcePosition = getTotalFrames();
                var i = sourcePosition;
    
                if (typeof source!=='object' || typeof source.frames!=='number' || typeof source.columns!=='number'){
                    throw('[parseSprite] Incorrect source format');
                }
                if (typeof source.url !=='string' || source.url.length===0){
                    throw('[parseSprite] Source url not defined');
                }
                //allocate frames
                for (i = sourcePosition; i < sourcePosition + source.frames; i++){
                    self.frames[i] = null;
                }
                
                var context = this.getContext();
                var img = new Image();
                var drawCallback = function drawCallback(){
                    context.drawImage(this.image,this.x,this.y,this.width,this.height,0,0,self.options.width,self.options.height);
                };
    
                img.src = source.url;
    
    
                img.onload = function onload() {
                    var spriteWidth = img.width / source.columns;
                    var rows = Math.ceil(source.frames / source.columns);
                    var spriteHeight = img.height / rows;
    
                    updateLoadProgress(source.frames);
                    //fill frames
                    for (var index = 0; index < source.frames; index++){
                        var currentRow = Math.floor(index / source.columns);
                        var currentCol = index % source.columns;
    
                        self.frames[sourcePosition+index] = {
                            image:img,
                            x: currentCol * spriteWidth,
                            y: currentRow * spriteHeight,
                            width:spriteWidth,
                            height:spriteHeight
                        }
                        self.frames[sourcePosition+index].draw = drawCallback.bind(self.frames[sourcePosition+index]);
                    } 
                              
    
                };
            }
            function trigger(event,data){
                if (Array.isArray(callbacks[event])){
                    for (var i = 0; i < callbacks[event].length; i++) {
                        callbacks[event][i].call(this,data);
                    }
                }
                return self;
            }
            function on(event,callback){
                if (!Array.isArray(callbacks[event])){
                    callbacks[event] = [];
                }
                if (typeof callback !== 'function'){
                    return this;
                }
                for (var i = 0; i < callbacks[event].length; i++) {
                    if (callbacks[event][i] === callback){
                        return this;
                    }
                }
                callbacks[event].push(callback);
                return self;
                
            }
            function off(event,callback){
    
                if (!Array.isArray(callbacks[event])){
                    return this;
                }
                if (typeof callback === 'function'){
                    for (var i = 0; i < callbacks[event].length; i++) {
                        if (callbacks[event][i] === callback) {
                            callbacks[event].splice(i,1);
                        }
                    }
                } else{
                    callbacks[event] = [];
                }
                return self;
            }
    
            function startLoop(){
                // fpsInterval = SECOND / loopFps;
                fpsInterval = SECOND / self.options.fps;
                loopID = requestAnimationFrame(loop);
            }
            function loop(){
                var nextFrame;
                var complete = false;
                var reverseComplete = false;
                var delta = performance.now() - before;
                
                if (delta >= fpsInterval){
                    before = performance.now();
                    
                    if (playing){
                        if (reversed){
                            nextFrame = getCurrentFrame()-1;
    
                            if (nextFrame<=0){
                                nextFrame = 0;
                                playing = false;
                                reverseComplete = true;
                            }
                        } else{
                            nextFrame = getCurrentFrame()+1;
    
                            if (nextFrame >=getTotalFrames()){
                                nextFrame = getTotalFrames();
                                playing = false;
                                complete = true;
                            }                       
                            
                        }
                        setCurrentFrame(nextFrame);
                        self.trigger('onUpdate');
                        if (complete){
                            self.trigger('onComplete');
                        }
                        if (reverseComplete){
                            self.trigger('onReverseComplete');
                        }
                        
                    }
                    draw();
                }
    
                loopID = requestAnimationFrame(loop);
            }
            function draw(){
                var currentFrame = getCurrentFrame();
    
                if (typeof self.frames[currentFrame] === 'object' && self.frames[currentFrame] !== null){
                    self.frames[currentFrame].draw(); 
                }
            }
            function setCurrentFrame(value){
                currentTime = value / self.options.fps;
            }
            function getCurrentFrame(){
                return Math.round(currentTime * self.options.fps);
            }
            function duration(value){
                if (self.options.useFrames){
                    if (typeof value === 'number'){
                        // set duration
                        return self;
                    }
                    if (typeof value === 'number'){
                        // set duration
                        return self;
                    }
                    return getTotalFrames();
                }
                return getTotalFrames() / self.options.fps;
            }
            function time(value){
                if (typeof value === 'undefined'){
                    if (self.options.useFrames){
                        return getCurrentFrame();
                    }
                    return currentTime;
                } 
                if (typeof value === 'number'){
                    return seek(value);
                }
            }
            function seek(value){
                if (typeof value === 'number'){
                    if (self.options.useFrames){
                        currentTime = value / self.options.fps;
                    }else {
                        currentTime = value;
                    }
                    draw();
                }
                return self;
            }
            
            function parseSeries(source){
    
            }
    
            function getParsers(){
                return parsers;
            }
            function addParser(type,parserCallback){
                if (typeof type==='string' && type.length){
                    if (typeof parserCallback !== 'function'){
                        throw('Specified parser is not a function: '+type);
                    }
                    parsers[type] = parserCallback;
                } else {
                    throw('Unspecified parser type');
                }
                return true;
            }
            function parserExists(type){
                if (typeof type !=='string' || type.length === 0){
                    return false;
                }
                if (typeof parsers[type] === 'function'){
                    return true;
                }
                return false;
            }
            function getContext(){
                return self.element.getContext('2d');
            }
            function loadSources(callback){
                for (var index = 0; index < self.options.sources.length; index++) {
                    if (typeof self.options.sources[index].type !=='string' || !parserExists(self.options.sources[index].type)){
                        throwWarning('Unknown source type:'+ self.options.sources[index].type);
                        continue;
                    } else{
                        parsers[self.options.sources[index].type].call(self,self.options.sources[index]);
                    }
                }
                if (typeof callback === 'function'){
                    self.on('onLoadComplete',function initialOnLoadComplete(){
                        self.off('onLoadComplete',initialOnLoadComplete);
                        callback.call(self);
                    });
                }
            }
            function isLoaded(){
                return loaded;
            }
            function isPlaying(){
                return playing;
            }
            function isReversed(){
                return reversed;
            }
            function reverse(value){
                var seekTime = value;
                
                if (typeof value === 'number'){
                    if (value===0){
                        seekTime = self.duration();
                    } else if (value<0){
                        seekTime = self.duration() + value;
                    }
                    self.seek(seekTime);
                }
                playing = true;
                reversed = true;
                return self;
            }
            function play(value){
                var seekTime = value;
                
                if (typeof value === 'number'){
                    if (value<0){
                        seekTime = self.duration() + value;
                    }
                    self.seek(seekTime);
                }
                playing = true;
                reversed = false;
                return self;
            }
            function pause(value){
                if (typeof value === 'number'){
                    self.seek(value);
                }
                playing = false;
            }
            function getTotalFrames(){
                return Object.keys(self.frames).length;
            }
            function updateLoadProgress(frameCount){
                var progress = frameCount / getTotalDeclaredFrames();
    
                loadProgress += progress;
                self.trigger('onLoadProgress',loadProgress);
                if (loadProgress >= 1){
                    self.trigger('onLoadComplete');
                    loaded = true;
                }
            }
            function getTotalDeclaredFrames(){
                var declaredTotalFrames = 0;
    
                for (var i=0; i < self.options.sources.length; i++){
                    if (typeof self.options.sources[i].frames ==='number'){
                        declaredTotalFrames += self.options.sources[i].frames;
                    }
                }
                return declaredTotalFrames;
            }
            function init(){
                self.element.width = self.options.width;
                self.element.height = self.options.height;
                loadSources(function loadSourcesCallback(){
                    startLoop();
                });
            }
            function destroy(){
                cancelAnimationFrame(loopID);
            }
    
            function extend(){
                for(var i=1; i<arguments.length; i++)
                    for(var key in arguments[i])
                        if(arguments[i].hasOwnProperty(key))
                            arguments[0][key] = arguments[i][key];
                return arguments[0];
            }
    
            function throwWarning(warning){
                console.warn(warning);
            }
        } catch (error) {
            throwError(error);
        }
       
        function throwError(error){
            console.error('[CanvasPlayer] '+error);
        }
    };

    return CanvasPlayer;
    
}));