

gsap.registerPlugin(Draggable, InertiaPlugin);

let descriptions = gsap.utils.toArray(".descriptions .title");
let items = gsap.utils.toArray(".content .item");

gsap.set(descriptions[0], {autoAlpha: 1}); // make the first description visible.

let carousel = buildCarousel(items, {
                radiusX: 250,
                radiusY: 250,
                activeAngle: 180,
                draggable: true,
                autoAdvance: 2, // seconds between next() calls
                onClick(element, self) {
                  self.to(element, {duration: 1, ease: "power1.inOut"}, "short");
                },
                onActivate(element, self) {
                  element.classList.add("active");
                },
                onDeactivate(element, self) {
                  element.classList.remove("active");
                },
                // when a drag or animation starts (via the Carousel's to()/next()/previous() methods)
                onStart(element, self) {
                  gsap.to(descriptions[items.indexOf(element)], {autoAlpha: 0, duration: 0.25, overwrite: "auto"});
                },
                onStop(element, self) {
                  gsap.to(descriptions[items.indexOf(element)], {autoAlpha: 1, overwrite: "auto"});
                }
              });




// example of resizing
let mm = gsap.matchMedia();
mm.add("(min-width: 800px)", () => { // desktop
  carousel.resize(250, 250);
});

mm.add("(max-width: 799px)", () => { // mobile
  carousel.resize(180, 180);
});



/*
Setup: place all the targets on top of each other, position: absolute, and then pass them in to this helper function and it'll spread them out from their starting position as if that's the origin. 
The config object (2nd parameter) can have any of the following optional properties:

- radiusX: Number - radius (in pixels) on the x-axis
- radiusY: Number - radius (in pixels) on the y-axis
- activeAngle: Number - angle (in degrees) that's considered the "active" spot (defaults to -90 meaning the 12 o'clock position). 0 would be on the far right side. 90 would be bottom, etc.
- activeElement: Element | String - the element that should initially be active
- autoAdvance: Number [optional] - number of seconds between next() calls
- onActivate: Function - called when a new element is considered the "active" one (closest to the active slot). The first parameter is the active element, the second is the Carousel instance itself.
- onDeactivate: Function - called when an element goes from being the active one to NOT the active one. The first parameter is the formerly active element, the second is the Carousel instance itself.
- onClick: Function - called when an element is clicked
- onStart: Function - called when a drag or animation starts (via the Carousel's to()/next()/previous() methods)
- onStop: Function - called when a drag or animation stops (via the Carousel's to()/next()/previous() methods);
- draggable: Boolean - if true, the carousel will be draggable. Don't forget to load Draggable and InertiaPlugin

An object gets returned that has the following methods:

- rotation() - a getter/setter for the rotation (in degrees) of the overall carousel.
- activeElement() - returns the currently active element (the one closest to the "active" slot)
- elementRotation() - pass in an element and it'll return the rotation of the carousel corresponding to when that particular element is active
- to() - lets you animate to a particular element or rotation and you get total control of that animation by using the vars and direction parameters. Method signature:
		- elementOrRotation: Element | String | Number - the destination element or rotation value
		- vars: Object - configuration object for the tween, just like any gsap.to() vars object so you can define duration, ease, onComplete, whatever.
		- direction: String [optional] - "short" goes in the shortest direction, "cw" goes in the clockwise direction, and "ccw" goes in the counter-clockwise direction.
- next() - goes to the next element. You can pass in a vars object and direction if you'd like to control the animation
- previous() - goes to the previous element. You can pass in a vars object and direction if you'd like to control the animation
- resize(radiusX, radiusY) - for resizing
- kill() - kills the carousel, cleaning up event listeners, etc.
 */
function buildCarousel(targets, {radiusX = 200, radiusY = 200, activeAngle = -90, activeElement, onClick, onActivate, onDeactivate, onStart, onStop, draggable, autoAdvance}) {
	targets = gsap.utils.toArray(targets);
	gsap.set(targets, {xPercent: -50, x: 0, yPercent: -50, y: 0});
	let DEG2RAD = Math.PI / 180,
		eventTypes = ("ontouchstart" in document.documentElement ? "touchstart,touchmove,touchcancel,touchend" : !("onpointerdown" in document.documentElement) ? "mousedown,mousemove,mouseup,mouseup" : "pointerdown,pointermove,pointercancel,pointerup").split(","),
		round = value => Math.round(value * 10000) / 10000,
		tempDiv = document.createElement("div"),
		quantity = targets.length,
		angleInc = 360 / quantity,
		wrap = gsap.utils.wrap(0, quantity),
		angleWrap = gsap.utils.wrap(0, 360),
		rotation = 0,
		dragged,
		onPressRotation,
		autoAdvanceCall = autoAdvance && gsap.delayedCall(parseFloat(autoAdvance) || 2, () => {	self.next(); autoAdvanceCall.restart(true);	}),
		xSetters = targets.map(el => gsap.quickSetter(el, "x", "px")),
		ySetters = targets.map(el => gsap.quickSetter(el, "y", "px")),
		self = {
			rotation(value) {
				if (arguments.length) {
					let prevActive = activeElement;
					rotation = angleWrap(value);
					activeElement = targets[wrap(Math.round(-value / angleInc))];
					self.render();
					if (prevActive !== activeElement) {
						onDeactivate && prevActive && onDeactivate(prevActive, self);
						onActivate && onActivate(activeElement, self);
					}
				}
				return rotation;
			},
			resize(rx, ry) {
				radiusX = rx;
				radiusY = ry;
				self.render();
			},
			render() {
				let inc = angleInc * DEG2RAD,
					a = (rotation + activeAngle) * DEG2RAD,
					i = 0;
				for (; i < quantity; i++) {
					xSetters[i](round(Math.cos(a) * radiusX));
					ySetters[i](round(Math.sin(a) * radiusY));
					a += inc;
				}
			},
			activeElement(value) {
				if (arguments.length) {
					self.rotation(self.elementRotation(value));
				}
				return activeElement;
			},
			elementRotation(element) {
				let index = targets.indexOf(gsap.utils.toArray(element)[0]);
				return (quantity - index) * angleInc;
			},
			to(elOrRotation, vars, direction) {
				vars = vars || {};
				vars.rotation = typeof(elOrRotation) === "number" ? elOrRotation : (self.elementRotation(elOrRotation) || parseFloat(elOrRotation));
				vars.overwrite = true;
				let { onUpdate, onComplete } = vars,
					_onStart = vars.onStart;
				autoAdvanceCall && autoAdvanceCall.pause();
				vars.onStart = function() {
					onStart && onStart(activeElement, self);
					_onStart && _onStart.call(this);
				}
				vars.onComplete = function() {
					onStop && onStop(activeElement, self);
					onComplete && onComplete.call(this);
					autoAdvanceCall && autoAdvanceCall.restart(true);
				};
				if (direction) {
					let getter = gsap.getProperty(tempDiv);
					vars.onUpdate = function() {
						self.rotation(getter("rotation"));
						onUpdate && onUpdate.call(this);
					}
					vars.rotation += "_" + direction;
					return gsap.fromTo(tempDiv, {rotation: rotation}, vars);
				}
				return gsap.to(self, vars);
			},
			next(vars, direction) {
				let element = targets[wrap(targets.indexOf(activeElement) + 1)];
				self.to(element, vars, direction || "ccw");
			},
			previous(vars, direction) {
				let element = targets[wrap(targets.indexOf(activeElement) - 1)];
				self.to(element, vars, direction || "cw");
			},
			kill() {
				targets.forEach(el => {
					el.removeEventListener("click", _onClick);
					el.removeEventListener(eventTypes[0], onPress);
					el.removeEventListener(eventTypes[2], onRelease);
					el.removeEventListener(eventTypes[3], onRelease);
				});
				gsap.killTweensOf(self);
				tempDiv.parentNode && tempDiv.parentNode.removeChild(tempDiv);
				autoAdvanceCall && autoAdvanceCall.kill();
				draggable && draggable.kill();
			},
			autoAdvance: autoAdvanceCall
		},
		_onClick = e => {
			if (!dragged) {
				autoAdvanceCall && autoAdvanceCall.restart(true);
				onClick && onClick(e.currentTarget, self);
			}
		},
		onPress = e => {
			onPressRotation = rotation;
			gsap.set(tempDiv, {rotation: rotation});
			autoAdvanceCall && autoAdvanceCall.pause();
			gsap.killTweensOf(self);
			draggable.startDrag(e);
			dragged = false;
		},
		onRelease = e => {
			draggable.endDrag(e);
			if (rotation === onPressRotation) {
				autoAdvanceCall && autoAdvanceCall.restart(true);
				draggable.tween && draggable.tween.kill();
				_onClick(e);
			}
		},
		syncDraggable = () => {
			if (!dragged) {
				onStart && onStart(activeElement, self);
				dragged = true;
			}
			self.rotation(draggable.rotation);
		};
	targets[0].parentNode.appendChild(tempDiv);
	gsap.set(tempDiv, {visibility: "hidden", position: "absolute", width: 0, height: 0, top: "50%", left: "50%", xPercent: -50, yPercent: -50});
	targets.forEach(el => {
		if (draggable) {
			el.addEventListener(eventTypes[0], onPress);
			el.addEventListener(eventTypes[2], onRelease);
			el.addEventListener(eventTypes[3], onRelease);
		} else {
			el.addEventListener("click", _onClick);
		}
	});

	self.snap = angleInc;
	draggable && (self.draggable = draggable = Draggable.create(tempDiv, {type: "rotation", snap: gsap.utils.snap(angleInc), inertia: true, onThrowComplete: () => {autoAdvanceCall && autoAdvanceCall.restart(true); onStop && onStop(activeElement, self)}, onThrowUpdate: syncDraggable, onDrag: syncDraggable})[0])
	self.activeElement(gsap.utils.toArray(activeElement)[0] || targets[0]);
	return self;
}

gsap.config({trialWarn: false})