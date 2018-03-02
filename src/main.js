// ffmpeg snippet
//ffmpeg.exe -i explode.mp4 -vf scale=375:-1 -r 5 frames/%04d.png
// Imagemagick snippet
//montage -border 0 -geometry 375x -tile 6x -quality 60% frames/*.png myvideo.jpg

// var canvasPlayer = new CanvasPlayer('#player');

require(['CanvasPlayer'],function(CanvasPlayer){
    var canvasPlayer = new CanvasPlayer('#player',{
        width:800,
        height:600,
        fps:24,
        sources:[
            {type:'sprite',columns:6,frames:600,url:'http://localhost/canvid/explode.jpg'},
            {type:'sprite',columns:6,frames:600,url:'http://localhost/canvid/explode2.jpg'}
        ]
    });
    
    
    canvasPlayer.on('onComplete',function onComplete(){
        console.log('onComplete!');
    });
    canvasPlayer.on('onReverseComplete',function onReverseComplete(){
        console.log('onReverseComplete!');
    });
    canvasPlayer.on('onUpdate',function onUpdate(){
        console.log('onUpdate!');
    });
    canvasPlayer.on('onLoadProgress',function onProgress(progress){
        console.log('onLoadProgress!',progress);
    });
    canvasPlayer.on('onLoadComplete',function onLoadComplete(){
        console.log('onLoadComplete!');
    });
    
    canvasPlayer.play();
});
