/* 

参数：
id - dom元素的ID
cb_enter - 进入全屏时的回调
cb_exit - 退出全屏时的回调
cb_unavail - 不支持全屏的回调

*/

// initFullscreen puzzle
function initFullscreen( id, cb_enter, cb_exit, cb_unavail ) {
    var doc = document;
    var elem = doc.getElementById( id );

    if ( !( doc.fullscreenEnabled ||
        doc.webkitFullscreenEnabled ||
        doc.mozFullScreenEnabled ||
        doc.msFullscreenEnabled ) ) {
        cb_unavail();
        return;
    }

    function fullscreenClickCb() {
        event.stopPropagation();
        if ( doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement ) {
            exitFullscreen();
        } else {
            requestFullscreen( doc.body );
        }
    }
    elem.addEventListener( 'mouseup', fullscreenClickCb );
    elem.addEventListener( 'touchend', fullscreenClickCb );

    function changeFullscreen( event ) {
        if ( doc.fullscreenElement ||
            doc.webkitFullscreenElement ||
            doc.mozFullScreenElement ||
            doc.msFullscreenElement )
            cb_enter( event );
        else
            cb_exit( event );
    }
    doc.addEventListener( 'webkitfullscreenchange', changeFullscreen );
    doc.addEventListener( 'mozfullscreenchange', changeFullscreen );
    doc.addEventListener( 'msfullscreenchange', changeFullscreen );
    doc.addEventListener( 'fullscreenchange', changeFullscreen );

    function requestFullscreen( fselem ) {
        if ( fselem.requestFullscreen )
            fselem.requestFullscreen();
        else if ( fselem.mozRequestFullScreen )
            fselem.mozRequestFullScreen();
        else if ( fselem.webkitRequestFullscreen )
            fselem.webkitRequestFullscreen();
        else if ( fselem.msRequestFullscreen )
            fselem.msRequestFullscreen();
    }
    function exitFullscreen() {
        if ( doc.exitFullscreen )
            doc.exitFullscreen();
        else if ( doc.mozCancelFullScreen )
            doc.mozCancelFullScreen();
        else if ( doc.webkitExitFullscreen )
            doc.webkitExitFullscreen();
        else if ( doc.msExitFullscreen )
            doc.msExitFullscreen();
    }
}


export {
    initFullscreen
}

