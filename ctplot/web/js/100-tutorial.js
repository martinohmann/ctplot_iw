var frameData = null;
var frameDataLoaded = false;
var frameQuantity = 0;
var OOI = null;
var ctx;
var frameNumber = 0;
var barHeight;
var listenerActive = false;
var defaultData;

function drawHole(object) {
	for (var i = 0; i < object.length; i++) {
		var rectangle = object[i].getBoundingClientRect();
		ctx.beginPath();
		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineJoin = "round";
		ctx.lineWidth = 20;
		ctx.rect(rectangle.left - 6, rectangle.top - 6 - barHeight, rectangle.width + 12, rectangle.height + 12);
		ctx.fill();
		ctx.stroke();
	}

	var rectangle = $('nav')[0].getBoundingClientRect();
	ctx.beginPath();
	ctx.fillStyle = "rgba(0,0,0,1)";
	ctx.rect(rectangle.left, rectangle.top-barHeight, rectangle.width, rectangle.height);
	ctx.globalCompositeOperation = 'destination-out';
	ctx.fill();
	ctx.fillStyle = "rgba(0,0,0,0.5)";
	ctx.globalCompositeOperation = 'destination-over';
	ctx.fill();
	ctx.fillStyle = "rgba(255,255,255,1)";
}

function scrollTo(element) {
	if (element == null) {
		element = $('body');
	}
	$('body, html').animate({ scrollTop: $(element).offset().top-window.innerHeight*0.4}, 600);
	window.setTimeout(function () {
		$('body,html').stop(true,false,true);
	},600);
}

function createNewFrame(newFrame) {
	if (newFrame) {
		var data = frameData.find('frame[number=' + frameNumber + ']');
		var expl = data.find("explanation").html();
		var task = data.find("task").html();
		var headline = data.find("headline").html();
		var left;
		var top;

		// check if data are set otherwise replace with default
		if (!headline) {
			headline = defaultData.find("headline").html();
		}

		if (!expl) {
			expl = defaultData.find("explanation").html();
		}

		if (!task) {
			task = defaultData.find("task").html();
		}

		// if expl or task are empty hide hr
		if (!expl || !task) {
			$('hr').hide();
		} else {
			$('hr').show();
		}

		if(data.find('textposition').length == 0) {
			left = defaultData.find('x').html() + "vw";
			top = defaultData.find('y').html() + "vh";
		} else {
			left = data.find('x').html() + "vw";
			top = data.find('y').html() + "vh";
		}

		$("#progress").html(headline + " (" + (frameNumber + 1) + " von " + frameQuantity + ")");
		$('#explanation').html(expl);
		$('#task').html(task);

		$('#textwrapper').css({left: left, top: top});
		moveExitButton();

		if (OOI != null) {
			$(OOI).css('pointer-events', 'none');
		}

		OOI = getObjectOfInterest();

		if(OOI != null){
			scrollTo(OOI);
		}

		if(data.find('objectOfInterest').attr('button') === "true"){
			listenerActive = true;
		}

		if(OOI != null && listenerActive){
			OOI.click(function(e){
				listenerActive = false;
				userAction(39,true);
			});
		}
	}

	if (OOI != null) {
		drawHole(OOI);
	}

	$(OOI).css('pointer-events', 'auto');
	moveExitButton();
}

function moveExitButton(){
	var tbr = parseFloat($("#textwrapper").css('left'))+parseFloat($("#textwrapper").css('padding-left'))/2+parseFloat($("#textwrapper").css('width'))/2+"px";
	var tbt = parseFloat($("#textwrapper").css('top'))-parseFloat($("#textwrapper").css('height'))/2-parseFloat($("#textwrapper").css('padding-top'))/2+"px";
	$("#stopTutorial").css({top: tbt, left: tbr});
}

function taskDone() {
	var data = frameData.find('frame[number=' + frameNumber + ']');
	var buttonTemp = data.find('objectOfInterest').attr('button');
	var textboxTemp = data.find('objectOfInterest').attr('textbox');
	var TDTemp = data.find("taskDoneValue").html();

	if (buttonTemp === "false" && textboxTemp === "false") {

		if (TDTemp === "") {
			TDTemp = null;
		}

		if (frameData != null && TDTemp != null) {
			return getObjectOfInterest().val() == TDTemp;
		} else {
			return true;
		}
	}else if(textboxTemp === "true"){
		if(getObjectOfInterest().val() != "")
		{
			return true;
		}
		else
		{
			return false;
		}
	} else {
		return false;
	}
}

function getObjectOfInterest() {
	if (frameData != null) {
		var data = frameData.find('frame[number=' + frameNumber + ']');
		var defaultData = frameData.find('default');
		var OOITemp = data.find("objectOfInterest").html();
		if(OOITemp === "")
		{
			OOITemp = defaultData.find("objectOfInterest").html();
		}
		return $('body').find(OOITemp);
	} else {
		return null;
	}
}

function setup(){
	barHeight = $('#navigation')[0].getBoundingClientRect().height;

	$("#overlay").css("top", barHeight).css('height', window.innerHeight - barHeight);

	ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
	ctx.canvas.height = window.innerHeight - barHeight;
	ctx.canvas.width = window.innerWidth;
	ctx.fillStyle = "rgba(0,0,0,0.5)";
	ctx.fillRect(0,0,window.innerWidth,window.innerHeight);
	ctx.fillStyle = "rgba(255,255,255,1)";

	$('#content').css('pointer-events', 'none');
	$('nav').add(OOI).css('pointer-events', 'auto');

	var tempDiff = (parseFloat($('#textwrapper').css('top'))-parseFloat($('#textwrapper').css('height'))/2)-parseFloat($("#textwrapper").css('padding-top'))*3 - barHeight;

	if (tempDiff < 0) {
		$('#textwrapper').css({top: parseFloat($('#textwrapper').css('top'))-tempDiff});
	}
}

//Listener Methoden

function redraw(){
	setup();
	if(!frameDataLoaded) {
		window.setTimeout(function () {
			redraw();
		}, 1);
	} else {
		createNewFrame(false);
	}

}

function drawNewFrame(){
	setup();
	if(!frameDataLoaded) {
		window.setTimeout(function () {
			drawNewFrame();
		}, 1);
	} else {
		createNewFrame(true);
	}
	$('body').focus();
}

// par uses keycodes:
//
// 37 backarrow
// 39 frontarrow
// 71 g for godmode
// 27 esc

function userAction(par, td) {
	if (par == 37 && frameNumber > 0) {
		frameNumber--;
		drawNewFrame();
	} else if(par == 39 && frameNumber < frameQuantity - 1) {
		if (td) {
			frameNumber++;
			drawNewFrame();
		} else {
			remindOfTask();
		}
	} else if(par == 71) {
		frameNumber++;
		drawNewFrame();
	}
	else if(par == 27){
		stopTutorial();
	}
	else if(par == 67){
		localStorage.removeItem('visited');
	}
}

function stopTutorial(){
	$('.tutorial').hide();
	$('.popup-background').hide();
	$('#content').css('pointer-events', 'auto');
	$('nav').removeClass('fixed_tutorial');
	localStorage.setItem('visited', 'true');
}

function remindOfTask() {
	var animationLength = 75;
	$('#task').animate({ left: '-1vw'}, animationLength);
	$('#task').animate({ left: '1vw'},animationLength);
	$('#task').animate({ left: '0vw'}, animationLength);
	window.setTimeout(function () {
		$('#task').stop(true,true,true);
		$('#task').css({left: '0vw'});
	}, animationLength * 4);
}

function startTutorial(){
	$(document).click(function() {
		moveExitButton();
	});

	$('#next').click(function() {
		userAction(39, taskDone());
	});

	$('#back').click(function() {
		userAction(37, taskDone());
	});

	$('#stopTutorial').click(function() {
		stopTutorial();
	});

	$(document).keyup(function(e) {
		userAction(e.which, taskDone());
	});

	$(window).scroll(function() {
		if ($('.tutorial:hidden').length == 0) {
			var scroll = $(this).scrollTop(),
				nav = $('nav'),
				header = $('header'),
				pos,
				pos,
				navOffset = header.offset().top + header.outerHeight();

			if (scroll > navOffset - barHeight) {
				nav.addClass('fixed_tutorial').next();
			} else {
				nav.removeClass('fixed_tutorial').next();
			}

			pos = scroll + nav.height();

			$('nav a').removeClass('active').each(function() {
				var target = $(this).attr('href'),
					offset = $(target).offset(),
					height = $(target).height();

				if (offset.top <= pos && pos < offset.top + height) {
					$(this).addClass('active');
					return false;
				}
			});
			redraw();
		}
	});

	$(window).resize(function() {
		if ($('.tutorial:hidden').length == 0) {
			redraw();
		}
	});

	$.get('frames.html', function(data) {
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(data,"text/xml");
		frameData = $(xmlDoc);
		frameDataLoaded = true;
		frameQuantity = frameData.find('frame').length;
		defaultData = frameData.find('default');
	});

	ctx = document.getElementById("overlay").getContext("2d");
	drawNewFrame();
	setup();
	$('.tutorial').show();
}

$(document).ready(function(){
	if (!localStorage.visited) {
		$('.popup-background').show();
	} else {
		$(document).keyup(function(e) {
			if (e.which == 67) {
				localStorage.removeItem('visited');
			}
		});
	}

	$('.startTutorial').click(function() {
		startTutorial();
	});
});
