/*!
 * jQuery Timespace Plugin
 * Author: Michael S. Howard
 * Email: codingadvent@gmail.com
 * License: MIT
 */

/*global jQuery*/
'use strict'; // ECMAScript 5 Strict Mode

/**
 * jQuery Timespace Plugin
 * Important: This Plugin does not support any version of Internet Explorer
 * @author Michael S. Howard
 * @requires jQuery 1.7+
 * @param $ The jQuery object
 * @param global The global Window object
 * @return void
 */
(($, global) => {
	
	//todo more error handling
	const debug = false; //todo turn off debug mode
	
	/**
	 * The Time Event Object Type
	 * @typedef {Object} TimeEvent
	 * @property {number} start The start time for the event
	 * @property {number?} end The optional end time for the event
	 * @property {string} title The text for the event title
	 * @property {string?|jQuery} description The optional text or jQuery Object for the event description
	 * @property {number?} width The optional width for the event box
	 * @property {number?} height The optional height for the event box
	 * @property {bool} noDetails If the time event should not have a display
	 * @property {Function?} callback The optional callback to run on event selection
		The callback Cannot be an arrow function if calling any API methods within the callback
	 */
	/**
	 * The Time Heading Object Type
	 * @typedef {Object} TimeHeading
	 * @property {number} start The start time for the heading
	 * @property {number} end The end time for the heading / Optional only for the last heading
	 * @property {string} title The text for the heading
	 */
	/**
	 * The Data Object Type
	 * @typedef {Object} Data
	 * @property {TimeHeading[]} headings The array of heading objects
	 * @property {TimeEvent[]]} events The array of event objects
	 */
	/**
	* The Default Options Object Type
	* @typedef {Object} Defaults
	* @property {number} maxWidth The maximum width for the Timespace container
	* @property {number} navigateAmount The amount of pixels to move the Timespace on navigation (0 to disable)
	* @property {number} selectedEvent The index number of the event to start on (0 for first event, -1 to disable)
	* @property {bool} shiftOnEventSelect If the time table should shift when an event is selected
	* @property {Object} customEventDisplay The jQuery Object of the element to use for the event display box
	* @property {string} timeType Use 'hour' or 'date' for the type of time being used
	* @property {bool} use12HourTime If using 12-Hour time (e.g. '2:00 PM' instead of '14:00')
	* @property {bool} useTimeSuffix If a suffix should be added to the displayed time (e.g. '12 AM' or '300 AD')
		No time suffix is used if timeType is hour and use12HourTime is false
	* @property {Function} timeSuffixFunction A function that receives the lowercase suffix string and returns a formatted string
	* @property {number} startTime The starting time number
	* @property {number} endTime The ending time number
	* @property {number} markerAmount The amount of time markers to use (0 to calculate from startTime, endTime, and markerIncrement)
	* @property {number} markerIncrement The amount of time between each marker
	* @property {number} markerWidth The width of each time marker
	* @property {Data} data The data to use for the Timespace instance
	*/
	const defaults = {
		maxWidth: 1000,
		navigateAmount: 200,
		selectedEvent: 0,
		shiftOnEventSelect: true,
		customEventDisplay: null,
		timeType: 'hour',
		use12HourTime: true,
		useTimeSuffix: true,
		timeSuffixFunction: s => ' ' + s[0].toUpperCase() + s[1].toUpperCase(),
		startTime: 0,
		endTime: 23,
		markerAmount: 0,
		markerIncrement: 1,
		markerWidth: 100,
		data: null,
	};
	
	/** The error constants for error handling */
	const errors = {
		NULL: { code: '', msg: '' },
		OPTS : { code: '001', msg: 'Invalid options argument supplied to the jQuery Timespace Plugin.' },
		CALLBACK: { code: '002', msg: 'Invalid callback function supplied to the jQuery Timespace Plugin.' },
		INV_INSTANCE: { code: '002', msg: 'The Timespace Plugin instance is invalid.' },
		INV_EVENT_CB: { code: '010', msg: 'Invalid callback supplied for event in data argument.' },
		INV_HEADING_START: { code: '011', msg: 'A heading\'s start time is less than the Timespace start time.' },
	};
	
	/**
	 * The error handler for the Plugin
	 * @param {Error} err The Error object (used for line number where error occurred)
	 * @param {string} name The error name in the errors constant
	 * @param {Object} target The jQuery object to display the error
	 * @throws {Error} Only in debug mode
	 * @return void
	 */
	const errHandler = (err, name, target) => {
		
		const e = (errors.hasOwnProperty(name)) ? errors[name] : errors.NULL,
			msg = 'An error has occurred. ' + e.code + ': ' + e.msg;
		
		if (debug) {
			throw err;
		} else {
			if (target) { target.empty().append($(`<p class="jqTimespaceError">${msg}</p>`)); }
		}
		
	};
	
	let inst = [],
		Timespace = null,
		utility = null;
	
	/**
	 * jQuery Timespace Plugin Method
	 * @param {Defaults} options The Plugin options
     * @param {Function} callback A callback function to execute on completion
	 * @return {Object} The jQuery object used to call this method
	 */
	$.fn.timespace = function (options, callback) {
		
		if ($.isFunction(options)) {
			
			callback = options;
			options = {};
			
		}
		if (options && !$.isPlainObject(options)) {
			
			errHandler(new Error(errors.OPTS.msg), 'OPTS', $(this[0]));
			return this;
			
		}
		if (callback && !$.isFunction(callback)) {
			
			errHandler(new Error(errors.CALLBACK.msg), 'CALLBACK', $(this[0]));
			callback = $.noop;
			
		}
		
		// Create the instance
		$.data(this, 'Timespace', Object.create(Timespace));
		
		// Store and load the instance, and run the callback
		inst.push($.data(this, 'Timespace').load(this, options));
		if (callback) { callback.call(inst[inst.length - 1]['API']); }
		
		return this;
		
	};
	
	/***************************/
	/* Timespace Plugin Object */
	/***************************/
	
	/*
	 * DO NOT INITIATE VALUES WITH OBJECTS OR ARRAYS,
	 * OR THEY WILL BE SHARED BY INSTANCES
	 */
	Timespace = {
		
		options: null,
		data: null,
		
		// Calculations
		totalTime: 0,
		markerTags: null,
		tableWidth: 0,
		shiftEnabled: true,
		shiftOrigin: 0,
		shiftPos: null,
		shiftDir: '=',
		lastMousePos: 0,
		transition: -1,
		
		// Elements
		container: '<div class="jqTimepsaceContainer"></div>',
		error: '<div class="jqTimespaceErrors"></div>',
		display: '<article class="jqTimespaceDisplay"></article>',
		displayTitle: '<h1></h1>',
		displayTime: '<p></p>',
		displayBody: '<section></section>',
		navLeft: '<div class="jqTimespaceLeft">&lt;</div>',
		navRight: '<div class="jqTimespaceRight">&gt;</div>',
		tableContainer: '<div class="jqTimespaceTableContainer"></div>',
		timeTableLine: '<div class="jqTimespaceLine"></div>',
		timeTable: '<table></table>',
		timeTableHead: '<thead><tr></tr></thead>',
		timeTableBody: '<tbody><tr></tr></tbody>',
		timeMarkers: null,
		timeEvents: null,
		
		/**
		 * The main method to load the Plugin
		 * @param {Object} target The jQuery Object that the plugin was called on
		 * @param {Object} options The user-defined options
		 * @return {Object} The Plugin instance
		 */
		load: function (target, options) {
			
			let opts = {};
			
			this.API.id = inst.length;
			this.options = Object.assign(opts, defaults, options);
			this.data = opts.data || {};
			this.totalTime = (opts.endTime - opts.startTime) || 1;
			this.markerTags = [];
			
			// Setup Base Elements
			this.container = $(this.container)
				.css('maxWidth', opts.maxWidth)
				.appendTo(target);
			this.error = $(this.error).appendTo(this.container);
			this.tableContainer = $(this.tableContainer)
				.css('maxWidth', opts.maxWidth)
				.appendTo(this.container);
			
			this.navRight = $(this.navRight);
			this.navLeft = $(this.navLeft);
			
			if (opts.navigateAmount > 0) {
				this.tableContainer.prepend(this.navRight, this.navLeft);
			}
			
			this.calculateMarkers()
				.buildTimeTable()
				.buildTimeEvents()
				.buildTimeDisplay()
				.setDOMEvents();
			
			this.shiftOrigin = this.getTablePosition();
			
			// Select first event if possible
			if (this.timeEvents.length > 0 && opts.selectedEvent >= 0) {
				this.timeEvents.eq(opts.selectedEvent).trigger('mouseup');
			} else {
				this.display.hide();
			}
			
			return this;
			
		},
		
		/**
		 * Calculate the amount and width needed for time markers
		 * @return {Object} The Plugin instance
		 */
		calculateMarkers: function () {
			
			const opts = this.options;
			
			if (opts.markerAmount === 0) {
				// Add 1 to include end time marker
				opts.markerAmount = (Math.floor(this.totalTime / opts.markerIncrement)) + 1 || 0;
			}
			if (opts.markerWidth === 0) {
				opts.markerWidth = (Math.floor(opts.maxWidth / opts.markerAmount)) || 100;
			}
			
			return this;
			
		},
		
		/**
		 * Build the time table
		 * @return {Object} The Plugin instance
		 */
		buildTimeTable: function () {
			
			let opts = this.options,
				headings = this.getTimeHeadings(),
				markers = this.getTimeMarkers();
			
				
			// Table width is used to force marker width, offset is used for mousemove event
			this.tableWidth = opts.markerAmount * opts.markerWidth || 'auto';
			this.tableOffset = this.tableWidth - (this.container.outerWidth() - 1);
			
			this.timeTableLine = $(this.timeTableLine).appendTo(this.tableContainer);
			this.timeTable = $(this.timeTable).width(this.tableWidth).appendTo(this.tableContainer);
			this.timeTableHead = $(this.timeTableHead).appendTo(this.timeTable);
			this.timeTableBody = $(this.timeTableBody).appendTo(this.timeTable);
			this.timeMarkers = markers.appendTo(this.timeTableBody.children('tr'));
			
			if (headings.length === 0) {
				this.timeTable.find('thead').css('display', 'none');
			} else {
				headings.appendTo(this.timeTableHead.children('tr'));
			}
			
			// Check if table is too small to shift
			if (this.tableOffset < 0) {
				
				this.shiftEnabled = false;
				this.timeTable.css('margin', '0 auto');
				this.navLeft.hide();
				this.navRight.hide();
				this.timeTableLine.hide();
				
			}
			
			return this;
			
		},
		
		/**
		 * Get the headings for the time markers
		 * @return {Object} jQuery Collection
		 */
		getTimeHeadings: function () {
			
			const opts = this.options,
				dummy = $('<th class="jqTimespaceDummySpan" colspan="0"></th>');
			
			let headings = $(),
				curSpan = 0,
				totalSpan = 0;
			
			if (this.data.headings) {
				this.data.headings.forEach((v, i, a) => {
					
					// Check for timeline start and heading start error
					if (opts.startTime > v.start) {
						errHandler(new Error(errors.INV_HEADING_START.msg), 'INV_HEADING_START', this.error);
					}
					
					// Create starting th span before first heading if needed
					if (i === 0 && utility.compareTime(v.start, opts.startTime, opts.markerIncrement) === 1) {
						
						curSpan = utility.getTimeSpan(v.start, opts.startTime, opts.markerIncrement);
						totalSpan += curSpan;
						headings = dummy.attr('colspan', curSpan);
						
					}
					
					// Create span to cover time in between headings if needed
					if (i > 0 && utility.compareTime(v.start, a[i - 1]['end'], opts.markerIncrement) === 1) {
						
						curSpan = utility.getTimeSpan(v.start, a[i - 1]['end'], opts.markerIncrement);
						totalSpan += curSpan;
						headings = headings.add(
							dummy.attr('colspan', curSpan)
						);
						
					}
					
					// Add current heading
					curSpan = utility.getTimeSpan(v.start, v.end, opts.markerIncrement) || 0;
					headings = headings.add($(`<th colspan="${curSpan}">${v.title}</th>`));
					
					// Check ending and create th span if needed
					if (i === a.length - 1) {
						
						if (utility.compareTime(v.end, opts.endTime, opts.markerIncrement) === -1) {
							
							curSpan = utility.getTimeSpan(v.end, opts.endTime, opts.markerIncrement);
							totalSpan += curSpan;
							
							// Make sure last span covers full table length
							if (totalSpan < opts.markerAmount) {
								curSpan = opts.markerAmount - totalSpan;
							}
							
							headings = headings.add(
								dummy.attr('colspan', curSpan)
							);
							
						} else if (totalSpan < opts.markerAmount) {
							
							// Last heading needs to cover full table length
							headings.last().attr('colspan', opts.markerAmount - totalSpan);
							
						}
						
					}
					
					totalSpan += curSpan;
					
				});
			}
			
			return headings;
			
		},
		
		/**
		 * Build the time markers
		 * @return {Object} jQuery Collection
		 */
		getTimeMarkers: function () {
			
			const opts = this.options;
			let curTime = opts.startTime,
				markers = $();
			
			// Iterate and build time markers using increment
			for (let i = 0; i < opts.markerAmount; i += 1) {
				
				curTime = (i === 0) ? opts.startTime : curTime + opts.markerIncrement;
				this.markerTags.push(curTime);
				
				markers = markers.add($(`<td>${this.getDisplayTime(curTime)}</td>`));
				
			}
			
			return markers;
			
		},
		
		/**
		 * Get a time string appropriate for displaying
		 * @param {number} time The time integer
		 * @return {string|null}
		 */
		getDisplayTime: function (time) {
			
			if (time !== null) {
				
				return this.getTime(time)
					+ this.getMinutes(time)
					+ this.getTimeSuffix(time);
				
			}
			
			return time;
			
		},
		
		/**
		 * Get the hours of a time, or the date
		 * @param {number} time
		 * @return {string|any}
		 */
		getTime: function (time) {
			
			if (this.options.timeType === 'hour') {
				return utility.getHours(time, !this.options.use12HourTime);
			} else if (this.options.timeType === 'date') {
				return Math.abs(time);
			}
			
			return time;
			
		},
		
		/**
		 * Get the minutes of a time, or an empty string if not using hour type
		 * @param {number} time
		 * @return {string}
		 */
		getMinutes: function (time) {
			
			if (this.options.timeType === 'hour') {
				return ':' + utility.getMinutes(time);
			}
			
			return '';
			
		},
		
		/**
		 * Get the time suffix for the time
		 * @param {number} time
		 * @return {string}
		 */
		getTimeSuffix: function (time) {
			
			const opts = this.options;
			
			if (opts.useTimeSuffix) {
				
				if (opts.timeType === 'hour') {
					if (opts.use12HourTime) {
						return (time < 12) ? opts.timeSuffixFunction('am')
							: opts.timeSuffixFunction('pm');
					}
				} else if (opts.timeType === 'date') {
					return (time < 0) ? opts.timeSuffixFunction('bc')
						: opts.timeSuffixFunction('ad');
				}
			}
			
			return '';
			
		},
		
		/**
		 * Build the time table events
		 * @return {Object} The Plugin instance
		 */
		buildTimeEvents: function () {
			
			let opts = this.options,
				markerTags = this.markerTags,
				events = $();
			
			if (this.data.events) {
				this.data.events.forEach((v) => {
					
					const start = parseFloat(v.start) || null,
						end = parseFloat(v.end) || null,
						title = utility.sanitize(v.title),
						desc = (v.description instanceof $)
							? v.description
							: (v.description !== undefined)
								? $(`<p>${utility.sanitize(v.description)}</p>`) : '',
						width = parseInt(v.width),
						height = parseInt(v.height),
						noDetails = !!v.noDetails,
						cb = (v.callback === undefined)
							? $.noop : v.callback.bind(this.API),
						rounded = utility.roundToIncrement('floor', opts.markerIncrement, start),
						index = markerTags.indexOf(rounded),
						event = $('<div class="jqTimespaceEvent"></div>'),
						eventElem = $(`<p>${v.title}</p>`).appendTo(event);
					
					if (!$.isFunction(cb)) {
						
						errHandler(new Error(errors.INV_EVENT_CB.msg), 'INV_EVENT_CB', this.error);
						eventElem.data('eventCallback', $.noop);
						
					}
					
					let prev = $(),
						timeMarker = $(),
						pos = 0,
						actualWidth = 0,
						hasSharedSpace = false;
					
					if (index >= 0) {
						
						timeMarker = $(this.timeMarkers[index]);
						
						// Find the position based on percentage of starting point to the increment amount
						pos = (((start - markerTags[index]) / opts.markerIncrement) * opts.markerWidth);
						
						actualWidth = (() => {
							
							// - 4 to provide a bit of space in between events that are next to each other
							const endWidth = (end)
								? ((end - start) / opts.markerIncrement) * opts.markerWidth : 0;
							
							if (width && width > opts.markerWidth) {
								return width - 4;
							} else if (endWidth > opts.markerWidth) {
								return endWidth - 4;
							} else {
								return opts.markerWidth - 4;
							}
							
						})(); // Immediately invoke arrow function to return width
						
						// Check if jqTimespaceEvent div already exists for this time marker
						if (timeMarker.find('.jqTimespaceEvent').length > 0) {
							
							// Reduce the heights and margin
							timeMarker.find('.jqTimespaceEvent').css({
								height: 'auto',
								marginBottom: 0
							});
							event.height('auto');
							hasSharedSpace = true;
							
						}
						
						event.css({
							left: pos + 'px',
							width: actualWidth
						}).appendTo(timeMarker);
						
						if (noDetails) { event.addClass('jqTimespaceNoDisplay'); }
						
						eventElem.css({
							width: actualWidth,
							height: height,
						}).data({
							span: event.position().left + eventElem.outerWidth(true),
							start: this.getDisplayTime(start),
							end: this.getDisplayTime(end),
							title: title,
							description: desc,
							noDetails: noDetails,
							eventCallback: cb,
						});
						
						events = events.add(eventElem);
						
						if (events.index(eventElem) - 1 >= 0) {
							prev = events.eq(events.index(eventElem) - 1);
						}
						
						// Check if previous event overlaps this event and not in the same td element
						if (!hasSharedSpace
							&& prev.length > 0
							&& prev !== eventElem) {
								
							if (prev.data('span') > event.position().left) {
								
								// Move event top to the bottom of previous event
								eventElem.css('marginTop', prev.outerHeight(true));
								
							}
							
						}
						
					}
					
				});
			}
			
			this.timeEvents = events;
			
			return this;
			
		},
		
		/**
		 * Build the time display
		 * @return {Object} The Plugin instance
		 */
		buildTimeDisplay: function () {
			
			const opts = this.options;
			
			this.display = (opts.customEventDisplay)
				? $(this.display).appendTo($(opts.customEventDisplay))
				: $(this.display).appendTo(this.container);
			this.displayTitle = $(this.displayTitle).appendTo(this.display);
			this.displayTime = $(this.displayTime).appendTo(this.display);
			this.displayBody = $(this.displayBody).appendTo(this.display);
			
			if (opts.maxWidth <= 500) { this.displayBody.css('maxWidth', '100%'); }
			
			return this;
			
		},
		
		/**
		 * Set up the element DOM events
		 * @return {Object} The Plugin instance
		 */
		setDOMEvents: function () {
			
			// Change classes for element movement
			const ts = this;
			
			// Window Events
			$(global).on('mouseup', () => {
				
				$(global).off('mousemove.timeShift');
				
				// Run timeShift once more on completion and animate movement
				if (this.timeTable.hasClass('jqTimespaceShifting')) {
					
					this.setTimeShiftState(false);
					this.timeShift(false);
					
				}
				
			}).on('resize', () => {
				this.tableOffset = this.tableWidth - (this.container.outerWidth() - 1);
			});
			
			// Navigation Events
			if (this.options.navigateAmount > 0) {
				
				this.navLeft.on('click', () => {
					this.navigate('left', -1);
				});
				this.navRight.on('click', () => {
					this.navigate('right', -1);
				});
				
			}
			
			// Time Table Events
			if (this.shiftEnabled) {
				
				this.timeTable.on('mousedown', (e) => {
					
					this.shiftOrigin = this.getTablePosition();
					this.lastMousePos = e.pageX;
					this.setTimeShiftState(true);
					$(global).on('mousemove.timeShift', this.timeShift.bind(this));
					
				});
				
			}
			
			// Event Marker Events
			this.timeEvents.each(function () {
				
				const elem = $(this);
				
				if (!elem.data('noDetails')) {
					
					elem.on('mouseup', () => {
						
						// Allow if event is not selected and time table has not shifted too much
						if (!elem.hasClass('jqTimespaceEventSelected') &&
							Math.abs(ts.shiftOrigin - ts.getTablePosition()) < 10) {
							
							ts.displayEvent(elem);
							
						}
						
					});
					
				}
				
			});
			
			return this;
			
		},
		
		/**
		 * Navigate the time table in a direction or by a specified amount
		 * @param {string|number} direction 'left', 'right', or a positive or negative amount
		 * @param {number} duration The duration in seconds, or -1
		 * @param {bool} isTableShift If the direction amount is the actual table shiftPos
		 * @return {Object} The Plugin instance
		 */
		navigate: function (dir, duration, isTableShift) {
			
			this.transition = duration;
			this.setTimeShiftState(false);
			
			if (typeof dir === 'number') {
				
				// If shifting table or shifting by an amount
				if (isTableShift) {
					
					this.shiftDir = (dir > 0) ? '>' : '<';
					this.shiftPos = dir;
					
				} else {
					
					this.shiftDir = (dir > 0) ? '<' : '>';
					this.shiftPos = this.getTablePosition() - dir;
					
				}
				
				this.timeShift(false);
				
			} else {
				
				// If direction is left, the table is shifted to the right
				dir = (dir === 'left') ? '>' : '<';
				this.timeShift(false, dir);
				
			}
			
			return this;
			
		},
		
		/**
		 * Set the time table and container classes for shifting
		 * @return {Object} The Plugin instance
		 */
		setTimeShiftState: function (on) {
			
			// Reset Transition
			this.tableContainer.removeClass('jqTimespaceAnimated').css('transitionDuration', '');
			this.timeTable.removeClass('jqTimespaceAnimated').css('transitionDuration', '');
			
			if (on) {
				
				this.timeTable.addClass('jqTimespaceShifting');
				this.transition = -1; // Reset the user supplied transition duration
				
			} else {
				
				this.tableContainer.addClass('jqTimespaceAnimated');
				this.timeTable.addClass('jqTimespaceAnimated').removeClass('jqTimespaceShifting');
				
				// Check if custom transition time is used
				if (this.transition >= 0) {
					
					this.tableContainer.css('transitionDuration', this.transition + 's');
					this.timeTable.css('transitionDuration', this.transition + 's');
					
				}
				
			}
			
			return this;
			
		},
		
		/**
		 * Shift the time table on mousemove
		 * @param {Object|bool} e The jQuery Event object or false if finished
		 * @param {string} nav The direction to navigate '<' or '>'
		 * @return {Object} The Plugin instance
		 */
		timeShift: function (e, nav) {
			
			if (!this.shiftEnabled) { return this; }
			
			let finished = (e === false),
				x = (finished) ? 0 : e.pageX,
				dir = 0,
				newPos = 0;
			
			if (nav) {
				
				this.shiftDir = nav;
				this.shiftPos = (nav === '<') ? this.getTablePosition() - this.options.navigateAmount
					: this.getTablePosition() + this.options.navigateAmount;
				
			}
			
			if (this.shiftPos !== null) {
				
				// Table must be moved within bounds
				if ((this.shiftDir === '<' && this.shiftPos >= -this.tableOffset)
					|| (this.shiftDir === '>' && this.shiftPos <= 0)) {
					
					this.timeTable.css('left', this.shiftPos + 'px');
					this.tableContainer.css('backgroundPosition', `bottom 0 left ${Math.floor(this.shiftPos / 3)}px`);
					
				} else if (this.shiftDir === '<' && this.shiftPos < -this.tableOffset) {
					
					this.timeTable.css('left', -this.tableOffset + 'px');
					this.tableContainer.css('backgroundPosition', `bottom 0 left ${Math.floor(-this.tableOffset / 3)}px`);
					
				} else if (this.shiftDir === '>' && this.shiftPos > 0) {
					
					this.timeTable.css('left', 0);
					this.tableContainer.css('backgroundPosition', 'bottom 0 left 0');
				}
				
			}
			
			if (x !== this.lastMousePos && !finished) {
				
				// Cache new position for next mousemove event
				dir = x - this.lastMousePos;
				newPos = this.getTablePosition() + dir;
				this.shiftPos = newPos;
				this.shiftDir = (dir < 0) ? '<' : '>';
				this.lastMousePos = x;
				
			} else {
				this.shiftPos = null;
			}
			
			return this;
			
		},
		
		/**
		 * Display a time event
		 * @param {Object} elem The time event jQuery element
		 * @return {Object} The Plugin instance
		 */
		displayEvent: function (elem) {
			
			const start = elem.data('start'),
				end = elem.data('end');
			
			let time = (start) ? start : '';
			
			this.timeEvents.removeClass('jqTimespaceEventSelected');
			elem.addClass('jqTimespaceEventSelected');
			this.display.show();
			this.displayTitle.text(elem.data('title'));
			this.displayBody.empty().append(elem.data('description'));
			
			if (time) {
				
				time += (end && end !== start) ? ` – ${end}` : '';
				this.displayTime.text(time)
					.addClass('jqTimespaceTimeframe');
				
			} else {
				this.displayTime.removeClass('jqTimespaceTimeframe');
			}
			
			if (this.options.shiftOnEventSelect) {
				
				// Shift the time table to the selected event
				this.navigate(this.timeTableLine.position().left
					- elem.parents('div').position().left, -1, true);
				
			}
			
			elem.data('eventCallback')();
			
			return this;
			
		},
		
		/**
		 * Get the time table's left position
		 * @return {number}
		 */
		getTablePosition: function () {
			return parseFloat(this.timeTable.css('left'));
		},
		
		/* The API methods available to the callback functions */
		API: {
			
			// The ID used for the isnt array to target the correct instance
			id: 0,
			
			// Get the instance container
			get container () {
				
				const me = inst[this.id];
				
				if (!utility.checkInstance(me)) { return this; }
				return me.container;
				
			},
			
			// Option Setters
			set shiftOnEventSelect (v) {
				
				const me = inst[this.id];
				
				if (!utility.checkInstance(me)) { return this; }
				me.options.shiftOnEventSelect = v;
				
			},
			set navigateAmount (v) {
				
				const me = inst[this.id];
				
				if (!utility.checkInstance(me)) { return this; }
				me.options.navigateAmount = v;
				
			},
			
			/**
			 * Navigate the time table in a direction or by a specified amount
			 * @param {string|number} direction 'left', 'right', or a positive or negative amount
			 * @param {number} duration The amount of seconds to complete the navigation animation
			 * @return {Object} The API
			 */
			navigateTime: function (direction, duration) {
				
				const me = inst[this.id];
				
				if (!utility.checkInstance(me)) { return this; }
				
				duration = parseFloat(duration);
				me.navigate(parseInt(direction) || direction, duration || -1);
				
				return this;
				
			},
			
		},
		
	};
	
	/***********/
	/* Utility */
	/***********/
	
	/** Various Utility Methods */
	utility = {
		
		/**
		 * Round time up or down to the increment
		 * @param {string} fn The Math function to use
		 * @param {number} increment The time marker increment
		 * @param {number} number The number to round
		 * @return {Array} The rounded number
		 */
		roundToIncrement: function (fn, increment, number) {
			
			return Math[fn](number / increment) * increment;
			
		},
		
		/**
		 * Get the amount of column span for a start and end time
		 * @param {number} start The start time
		 * @param {number} end The end time
		 * @param {number} increment The time marker increment
		 * @return {number|NaN}
		 */
		getTimeSpan: function (start, end, increment) {
			
			start = this.roundToIncrement('floor', increment, start);
			end = this.roundToIncrement('ceil', increment, end);
			
			return Math.abs(Math.floor((end - start) / increment));
			
		},
		
		/**
		 * Compare two time numbers for less than, equal to, or greater than
		 * @param {number} time1 The first time to compare
		 * @param {number} time2 The second time to compare
		 * @param {number} increment The time marker increment
		 * @return {number|NaN} -1 if time1 is less than time2, 0 if equal, and 1 if greater than
		 */
		compareTime: function (time1, time2, increment) {
			
			time1 = this.roundToIncrement('floor', increment, time1);
			time2 = this.roundToIncrement('ceil', increment, time2);
			
			if (time1 < time2) { return -1; }
			if (time1 > time2) { return 1; }
			
			return 0;
			
		},
		
		/**
		 * Get the hours string from a time value
		 * @param {number} time
		 * @return {string}
		 */
		getHours: function (time, military) {
			
			time = parseInt(time);
			
			if (isNaN(time)) {
				time = '';
			} else {
				if (military && time < 10) {
					// Pad 0 for military time
					time = '0' + time;
				} else if (!military && time < 1) {
					// Use 12 for 12AM
					time = 12;
				} else if (!military && time >= 13) {
					// Convert to 12 Hour Time
					time -= 12;
				}
			}
			
			return time;
			
		},
		
		/**
		 * Get the minutes string from a time value
		 * @param {number} time
		 * @return {string}
		 */
		getMinutes: function (time) {
			
			time = parseFloat(time) || 0;
			let minutes = Math.round((time % 1) * 60);
			
			if (minutes < 10) { minutes = '0' + minutes; }
			
			return minutes + '';
			
		},
		
		/**
		 * Sanitize a string for DOM insertion
		 * @param {string} text The text to sanitize
		 * @return {string}
		 */
		sanitize: (text) => $('<div />').text(text).html(),
		
		/**
		 * Check if the plugin instance is valid
		 * @return {bool}
		 */
		checkInstance: function (instance) {
			if (!instance || !instance.API) {
			
				errHandler(new Error(errors.INV_INSTANCE.msg), 'INV_INSTANCE');
				return false;
				
			}
			
			return true;
			
		},
		
	};
	
})(jQuery, window);
