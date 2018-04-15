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
 * Important: This Plugin is not intended to support any version of Internet Explorer unless transpiled
 * @author Michael S. Howard
 * @requires jQuery 1.7+
 * @param $ The jQuery object
 * @param global The global Window object
 * @return void
 */
(($, global) => {
	
	// When in debug mode, errHandler will throw the Error
	const debug = false;
	
	/**
	 * The Time Event Object Type
	 * @typedef {Object} TimeEvent
	 * @property {number} start The start time for the event
	 * @property {number?} end The optional end time for the event
	 * @property {string} title The text for the event title
	 * @property {string?|jQuery} description The optional text or jQuery Object for the event description
	 * @property {number?} width The optional width for the event <p> element
	 * @property {bool} noDetails If the time event should not have a display
		(If noDetails and a description string exists, it will be used for the event's title attribute)
	 * @property {string} class The optional CSS class to use for the event's <p> element
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
	* @property {number} maxHeight The maximum height for the Timespace container
	* @property {number} navigateAmount The amount of pixels to move the Timespace on navigation (0 to disable)
	* @property {number} dragXMultiplier The multiplier to use with navigateAmount when dragging the time table horizontally
	* @property {number} dragYMultiplier The multiplier to use with navigateAmount when dragging the time table vertically
	* @property {number} selectedEvent The index number of the event to start on (0 for first event, -1 to disable)
	* @property {bool} shiftOnEventSelect If the time table should shift when an event is selected
	* @property {bool} scrollToDisplayBox If the window should scroll to the event display box on event selection
		(only applies if the time table height is greater than the window height, and if the event has a description)
	* @property {Object} customEventDisplay The jQuery Object of the element to use for the event display box
	* @property {string} timeType Use 'hour' or 'date' for the type of time being used
	* @property {bool} use12HourTime If using 12-Hour time (e.g. '2:00 PM' instead of '14:00')
	* @property {bool} useTimeSuffix If a suffix should be added to the displayed time (e.g. '12 AM' or '300 AD')
		No time suffix is used if timeType is hour and use12HourTime is false
	* @property {Function} timeSuffixFunction A function that receives the lowercase suffix string and returns a formatted string
	* @property {number} startTime The starting time
	* @property {number} endTime The ending time
	* @property {number} markerAmount The amount of time markers to use (0 to calculate from startTime, endTime, and markerIncrement)
	* @property {number} markerIncrement The amount of time each marker spans
	* @property {number} markerWidth The width of each time marker td element (0 to calculate from maxWidth and markerAmount)
	* @property {Data} data The data to use for the Timespace instance, or a URL for loading the data object with jQuery.get()
	*/
	const defaults = {
		maxWidth: 1000,
		maxHeight: 320,
		navigateAmount: 400,
		dragXMultiplier: 1,
		dragYMultiplier: 1,
		selectedEvent: 0,
		shiftOnEventSelect: true,
		scrollToDisplayBox: true,
		customEventDisplay: null,
		timeType: 'hour',
		use12HourTime: true,
		useTimeSuffix: true,
		timeSuffixFunction: s => ' ' + s[0].toUpperCase() + s[1].toUpperCase(),
		startTime: 0,
		endTime: 24,
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
		DATA_ERR: { code: '003', msg: 'Failure to load the Timespace data URL.' },
		INV_INSTANCE: { code: '002', msg: 'The Timespace Plugin instance is invalid.' },
		INV_EVENT_CB: { code: '010', msg: 'Invalid callback supplied for event in data argument.' },
		INV_HEADING_START: { code: '011', msg: 'A heading\'s start time is less than the Timespace start time.' },
		INV_HEADING_END: { code: '012', msg: 'A heading\'s end time is greater than the Timespace end time.' },
		EVENT_OOR: { code: '013', msg: 'An event\'s start time is outside of the Timespace start and end time range.' },
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
		
		target = (!target) ? $('body') : target;
		
		const e = (errors.hasOwnProperty(name)) ? errors[name] : errors.NULL,
			msg = 'An error has occurred. ' + e.code + ': ' + e.msg;
		
		let errElem = $(`<p class="jqTimespaceError">${msg}</p>`),
			errExists = (target) ? (target.find('.jqTimespaceError').length > 0) : false;
		
		if (debug) {
			throw err;
		} else {
			
			if (errExists) {
				target.find('.jqTimespaceError').text(msg);
			} else {
				target.prepend(errElem);
			}
			
		}
		
	};
	
	const classes = {
		animated: 'jqTimespaceAnimated',
		eventRev: 'jqTimespaceEventRev',
		eventSelected: 'jqTimespaceEventSelected',
		noDisplay: 'jqTimespaceNoDisplay',
		shifting: 'jqTimespaceShifting',
		timeframe: 'jqTimespaceTimeframe',
		titleClamp: 'jqTimespaceTitleClamp',
	};
	
	let inst = [],
		Timespace = null,
		utility = null;
	
	/**
	 * jQuery Timespace Plugin Method
	 * @param {Defaults} options The Plugin options
     * @param {Function} callback A callback function to execute on completion
		If using URL for plugin data and it fails to load, the callback will receive the jqxhr object.
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
		
		if (typeof options.data === 'string') {
			
			// Use Async loader for URL data
			inst.push($.data(this, 'Timespace').loadAsync(
				this, options, callback || $.noop)
			);
			
		} else {
			
			// Store and load the instance, and run the callback
			inst.push($.data(this, 'Timespace').load(this, options));
			if (callback) { callback.call(inst[inst.length - 1]['API']); }
			
		}
		
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
		shiftXEnabled: true,
		shiftYEnabled: true,
		shiftPosX: null,
		shiftPosY: null,
		shiftDirX: '=',
		shiftDirY: '=',
		lastMousePosX: 0,
		lastMousePosY: 0,
		navInterval: null,
		transition: -1,
		transitionEase: null,
		viewData: null,
		
		// Elements
		container: '<div class="jqTimepsaceContainer"></div>',
		error: '<div class="jqTimespaceErrors"></div>',
		display: '<article class="jqTimespaceDisplay"></article>',
		displayTitle: '<h1></h1>',
		displayTimeDiv: '<div class="jqTimespaceDisplayTime"></div>',
		displayTime: '<p></p>',
		displayBody: '<section></section>',
		displayLeft: '<div class="jqTimespaceDisplayLeft" title="Previous Event"></div>',
		displayRight: '<div class="jqTimespaceDisplayRight" title="Next Event"></div>',
		navLeft: '<div class="jqTimespaceLeft" title="Move Left">&lt;</div>',
		navRight: '<div class="jqTimespaceRight" title="Move Right">&gt;</div>',
		tableContainer: '<div class="jqTimespaceTableContainer"></div>',
		timeTableLine: '<div class="jqTimespaceLine"></div>',
		timeTable: '<table></table>',
		timeTableHead: '<thead><tr></tr></thead>',
		timeTableBody: '<tbody><tr></tr></tbody>',
		timeMarkers: null,
		timeEvents: null,
		wideHeadings: null,
		curWideHeading: null,
		curEvent: null,
		
		/**
		 * The main method to load the Plugin with async data
		 * @param {Object} target The jQuery Object that the plugin was called on
		 * @param {Object} options The user-defined options
		 * @param {Function} callback The callback to run when loaded
		 * @return {Object} The Plugin instance
		 */
		loadAsync: function (target, options, callback) {
			
			$.get(options.data, (data) => {
				
				options.data = data;
				this.load(target, options);
				callback.call(this.API);
				
			}).fail((err) => {
				
				errHandler(new Error(err.status + ': ' + err.statusText + '. '
					+ errors.DATA_ERR.msg), 'DATA_ERR');
				callback.call(this.API, err);
				
			});
			
			return this;
			
		},
		
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
			this.navInterval = {
				dir: 'left',
				timer: null,
				engaged: false,
			};
			
			// Setup Base Elements
			this.container = $(this.container).appendTo(target)
				.on('resize.jqTimespace', this.updateDynamicData.bind(this));
			this.error = $(this.error).appendTo(this.container);
			this.tableContainer = $(this.tableContainer)
				.css({
					maxWidth: opts.maxWidth,
					maxHeight: opts.maxHeight,
				})
				.appendTo(this.container);
			this.navRight = $(this.navRight).prependTo(this.tableContainer);
			this.navLeft = $(this.navLeft).prependTo(this.tableContainer);
			
			// Values are updated once elements are built
			this.viewData = {
				left: 0,
				top: 0,
				width: 0,
				height: 0,
				halfX: 0,
				halfY: 0,
				heightOverhang: 0,
				offsetX: 0,
				offsetY: 0,
				tableWidth: 0,
				tableOffsetX: 0,
				tableOffsetY: 0,
				headerHeight: 0,
				headerLineHeight: 0,
				shiftOriginX: 0,
				shiftOriginY: 0,
			};
			
			this.calculateMarkers()
				.buildTimeTable()
				.buildTimeEvents()
				.buildTimeDisplay()
				.updateStaticData()
				.updateDynamicData()
				.setDOMEvents();
			
			// Select first event if needed & prevent scrolling / or hide display
			if (this.timeEvents.length > 0 && opts.selectedEvent >= 0) {
				this.timeEvents.eq(opts.selectedEvent).trigger('mouseup', [true]);
			} else {
				this.display.hide();
			}
			
			return this;
			
		},
		
		/**
		 * Update the static container data
		 * @return {Object} The Plugin instance
		 */
		updateStaticData: function () {
			
			this.viewData.top = Math.ceil(this.tableContainer.offset().top);
			this.viewData.height = Math.ceil(this.tableContainer.innerHeight());
			this.viewData.offsetY = this.viewData.top + this.viewData.height;
			this.viewData.halfY = Math.ceil(this.viewData.height / 2);
			this.viewData.shiftOriginY = this.getTableBodyPosition();
			this.viewData.tableOffsetY = this.timeTable.outerHeight() - this.tableContainer.outerHeight() - 1;
			
			return this;
			
		},
		
		/**
		 * Update the dynamic container and table data
		 * @return {Object} The Plugin instance
		 */
		updateDynamicData: function () {
			
			this.viewData.left = Math.ceil(this.tableContainer.offset().left);
			this.viewData.width = Math.ceil(this.tableContainer.innerWidth());
			this.viewData.halfX = Math.ceil(this.viewData.width / 2);
			this.viewData.heightOverhang = (this.tableContainer.outerHeight() > $(global).height() * 0.8);
			this.viewData.offsetX = this.viewData.left + this.viewData.width;
			this.viewData.shiftOriginX = this.getTablePosition();
			this.viewData.tableOffsetX = this.timeTable.outerWidth() - this.tableContainer.outerWidth() - 1;
			
			// Check if table is too small to shift
			if (this.viewData.tableOffsetX < 0) {
				
				this.shiftXEnabled = false;
				this.timeTable.css('margin', '0 auto');
				this.timeTableLine.hide();
				this.navLeft.hide();
				this.navRight.hide();
				
			} else {
				
				this.shiftXEnabled = true;
				this.timeTable.css('margin', 0);
				this.timeTableLine.show();
				
				if (this.options.navigateAmount > 0) {
					
					this.navLeft.show();
					this.navRight.show();
					
				}
				
			}
			if (this.viewData.tableOffsetY < 0) {
				this.shiftYEnabled = false;
			}
			
			this.updateCurWideHeading();
			
			return this;
			
		},
		
		/**
		 * Calculate the amount and width needed for time markers
		 * @return {Object} The Plugin instance
		 */
		calculateMarkers: function () {
			
			const opts = this.options;
			
			if (opts.markerAmount === 0) {
				opts.markerAmount = (Math.floor(this.totalTime / opts.markerIncrement)) || 0;
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
			
			// Table width is used to force marker widths
			this.viewData.tableWidth = opts.markerAmount * opts.markerWidth || 'auto';
			this.timeTable = $(this.timeTable).width(this.viewData.tableWidth).appendTo(this.tableContainer);
			this.timeTableLine = $(this.timeTableLine).appendTo(this.tableContainer);
			this.timeTableHead = $(this.timeTableHead).appendTo(this.timeTable);
			this.timeTableBody = $(this.timeTableBody)
				.appendTo(this.timeTable)
				.children('tr');
			
			if (headings.length === 0) {
				this.timeTableHead.children('tr').css('display', 'none');
			} else {
				headings.appendTo(this.timeTableHead.children('tr'));
			}
			
			markers[0].appendTo(this.timeTableHead);
			this.timeMarkers = markers[1].appendTo(this.timeTableBody);
			
			// Update heading text widths for any wide headings
			this.wideHeadings.each(function (i, elem) {
				$(elem).data('textSpan', $(elem).children('span').outerWidth());
			});
			this.viewData.headerHeight = Math.ceil(this.timeTableHead.children('tr:first-child').innerHeight());
			this.viewData.headerLineHeight = parseInt(this.timeTableHead.css('lineHeight'));
			
			return this;
			
		},
		
		/**
		 * Get the headings for the time markers
		 * @return {Object} jQuery Collection
		 */
		getTimeHeadings: function () {
			
			const opts = this.options;
			
			let th = '<th colspan="1"><span class="jqTimespaceHeading">{title}</span></th>',
				dummy = '<th class="jqTimespaceDummySpan" colspan="1"></th>',
				headings = $(),
				curSpan = 0;
			
			this.wideHeadings = $();
			
			if (this.data.headings) {
				this.data.headings.forEach((v, i, a) => {
					
					const start = parseFloat(v.start),
						title = utility.sanitize(v.title);	
					let end = (utility.isEmpty(v.end)) ? null : parseFloat(v.end);
					
					// Check for timeline start and heading start error
					if (opts.startTime > start) {
						errHandler(new Error(errors.INV_HEADING_START.msg), 'INV_HEADING_START', this.error);
					}
					
					// Create dummy span before first heading if needed
					if (i === 0 && utility.compareTime(start, opts.startTime, opts.markerIncrement) === 1) {
						
						curSpan = utility.getTimeSpan(start, opts.startTime, opts.markerIncrement);
						headings = headings.add(
							$(dummy).attr('colspan', curSpan)
						);
						
					}
					
					// Create dummy span to cover time in between headings if needed
					if (i > 0 && utility.compareTime(start, a[i - 1]['end'], opts.markerIncrement) === 1) {
						
						curSpan = utility.getTimeSpan(start, a[i - 1]['end'], opts.markerIncrement);
						headings = headings.add(
							$(dummy).attr('colspan', curSpan)
						);
						
					}
					
					// Check heading end time
					if (utility.isEmpty(end)) {
						end = opts.endTime;
					} else if (end > opts.endTime) {
						
						errHandler(new Error(errors.INV_HEADING_END.msg), 'INV_HEADING_END', this.error);
						end = opts.endTime;
						
					}
					
					// Add current heading
					curSpan = utility.getTimeSpan(start, end, opts.markerIncrement) || 0;
					headings = headings.add(
						$(th.replace('{title}', title)).attr('colspan', curSpan)
					);
					
					// Check if heading needs a title clamp
					if (curSpan * opts.markerWidth > opts.maxWidth * 1.75) {
						this.wideHeadings = this.wideHeadings.add(headings.last().data({
							span: curSpan * opts.markerWidth,
							textSpan: 0, // Updated after headings are appended to table
						}));
					}
					
					// Create dummy span to cover ending if needed
					if (i === a.length - 1
						&& utility.compareTime(end, opts.endTime, opts.markerIncrement) === -1) {
						
						// Create ending dummy span
						curSpan = utility.getTimeSpan(end, opts.endTime, opts.markerIncrement);
						headings = headings.add(
							$(dummy).attr('colspan', curSpan)
						);
						
					}
					
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
				markers = [$('<tr></tr>'), $()];
			
			// Iterate and build time markers using increment
			for (let i = 0; i < opts.markerAmount; i += 1) {
				
				curTime = (i === 0) ? opts.startTime : curTime + opts.markerIncrement;
				this.markerTags.push(curTime);
				
				markers[0] = markers[0].append($(`<td><time>${this.getDisplayTime(curTime)}</time></td>`));
				markers[1] = markers[1].add($('<td></td>'));
				
			}
			
			return markers;
			
		},
		
		/**
		 * Build the time table events
		 * @return {Object} The Plugin instance
		 */
		buildTimeEvents: function () {
			
			let opts = this.options,
				markerTags = this.markerTags,
				events = $(),
				rows = [],
				curRow = 0,
				paddingOrigin = 0,
				paddingTop = 0;
			
			if (this.data.events) {
				this.data.events.forEach((v, i) => {
					
					const start = parseFloat(v.start) || null,
						end = parseFloat(v.end) || null,
						title = utility.sanitize(v.title),
						description = (v.description instanceof $) ? v.description
							: (!utility.isEmpty(v.description))
								? $(`<p>${utility.sanitize(v.description)}</p>`) : $(),
						width = parseInt(v.width),
						noDetails = !!v.noDetails,
						evtClass = (!utility.isEmpty(v.class))
							? ` class="${utility.sanitize(v.class)}"` : '',
						eventCallback = (utility.isEmpty(v.callback))
							? $.noop : v.callback.bind(this.API);
					
					const rounded = utility.roundToIncrement('floor', opts.markerIncrement, start),
						index = markerTags.indexOf(rounded),
						event = $('<div class="jqTimespaceEvent"><span class="jqTimespaceEventBorder"></span></div>'),
						eventElem = $(`<p${evtClass}><span>${title}</span></p>`).prependTo(event);
					
					if (!$.isFunction(eventCallback)) {
						
						errHandler(new Error(errors.INV_EVENT_CB.msg), 'INV_EVENT_CB', this.error);
						eventElem.data('eventCallback', $.noop);
						
					}
					
					if (start < opts.startTime || start > opts.endTime) {
						errHandler(new Error(errors.EVENT_OOR.msg), 'EVENT_OOR', this.error);
					}
					
					let eventOverhang = false,
						pos = 0,
						eventOffset = 0,
						realWidth = 0,
						span = 0,
						sharingWith = null,
						sharedSpace = 0;
					
					if (index >= 0) {
						
						// Find the position based on percentage of starting point to the increment amount
						pos = (((start - markerTags[index]) / opts.markerIncrement) * opts.markerWidth);
						event.css('left', pos + 'px').appendTo(this.timeMarkers[index]);
						eventOffset = Math.floor(event.offset().left);
						
						// Check if a jqTimespaceEvent div already exists in this time marker
						if (event.siblings('.jqTimespaceEvent').length > 0) {
							sharingWith = event.siblings('.jqTimespaceEvent');
						}
						
						// Immediately invoke arrow function to return best width
						eventElem.width((() => {
							
							const curWidth = eventElem.children('span').width(),
								endWidth = (end) ? ((end - start) / opts.markerIncrement) * opts.markerWidth : 0;
							
							let padding = (parseInt(eventElem.css('paddingLeft'))
									+ parseInt(eventElem.css('paddingRight'))) || 0,
								tableLength = this.viewData.tableWidth + this.getTablePosition(true);
							
							eventOverhang = (tableLength < eventOffset + curWidth + padding);
							
							if (eventOverhang) {
								return curWidth;
							} else if (width) {
								return width; // User-defined width
							} else if (curWidth > endWidth && curWidth > opts.markerWidth) {
								return curWidth; // Text width
							} else if (endWidth > opts.markerWidth) {
								return endWidth - padding; // Timespan width
							} else {
								return opts.markerWidth; // Default marker width
							}
							
						})())
							.data({
								time: this.getFullDate(start, end),
								title: title,
								description: description,
								noDetails: noDetails,
								eventCallback: eventCallback,
							})
							.attr('title', eventElem.data('time'));
						
						events = events.add(eventElem);
						realWidth = eventElem.outerWidth();
						event.width(realWidth);
						span = eventOffset + Math.floor(event.outerWidth()) - 2;
						
						if (noDetails) {
							
							event.addClass(classes.noDisplay);
							eventElem.attr('title', (i, t) => (!utility.isEmpty(description.text()))
								? `${t} - ${description.text()}` : t
							);
							
						}
						
						// Reverse event if it extends past the table width
						if (eventOverhang) {
							
							event.css('left', pos - realWidth + 'px').addClass(classes.eventRev);
							eventOffset = Math.floor(event.offset().left);
							
						}
						
						// Cache the row widths for checking overlap
						if (i === 0) {
							
							rows.push(span);
							paddingOrigin = parseInt(event.css('paddingTop'));
							paddingTop = Math.floor(paddingOrigin + eventElem.outerHeight());
							
						} else {
							
							if (sharingWith) {
								
								// Event is sharing the same td with another event
								// Start on the next row of the shared element
								// And start with the basic padding
								sharedSpace = paddingOrigin;
								curRow += 1;
								
								// Check if rows array needs expanding
								if (rows.length === curRow) {
									rows[curRow] = 0;
								}
								
							}
							
							for (let row = (sharingWith) ? curRow : 0; row < rows.length; row += 1) {
								
								if (rows[row] <= eventOffset) {
									
									// Row is clear / Cache the new span width and switch to this row space
									rows[row] = span;
									curRow = row;
									
									// If first row, the normal paddingTop will be used
									// Otherwise, calculate the padding for the current row
									if (row > 0) {
										if (sharingWith) {
											event.css('paddingTop', sharedSpace);
										} else {
											event.css('paddingTop', row * paddingTop + paddingOrigin);
										}
									}
									
									break;
									
								} else {
									
									// Push the event down to the next row space
									if (sharingWith) {
										
										// Cache the amount of padding for next row check
										sharedSpace += paddingTop;
										event.css('paddingTop', sharedSpace);
										
									} else {
										event.css('paddingTop', (row + 1) * paddingTop + paddingOrigin);
									}
									
									// If on last cached row, settle with the next row space
									if (row === rows.length - 1) {
										
										rows[row + 1] = span;
										curRow = row + 1;
										
										break;
										
									}
									
								}
								
							}
							
						}
						
					}
					
				});
			}
			
			if (events.length <= 1) {
				this.displayLeft.add(this.displayRight).hide();
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
				: $(this.display).appendTo(this.container)
					.css('maxWidth', opts.maxWidth);
			this.displayTitle = $(this.displayTitle).appendTo(this.display);
			this.displayTimeDiv = $(this.displayTimeDiv).appendTo(this.display);
			this.displayLeft = $(this.displayLeft).appendTo(this.displayTimeDiv);
			this.displayTime = $(this.displayTime).appendTo(this.displayTimeDiv);
			this.displayRight = $(this.displayRight).appendTo(this.displayTimeDiv);
			this.displayBody = $(this.displayBody).appendTo(this.display);
			
			return this;
			
		},
		
		/**
		 * Set up the element DOM events
		 * @return {Object} The Plugin instance
		 */
		setDOMEvents: function () {
			
			const ts = this;
			
			// Window Events
			$(global).on('mouseup', () => {
				
				$(global).off('mousemove.jqTimespace');
				
				// Clear nav button interval if needed
				this.clearNavInterval();
				
				// Run timeShift once more on completion and animate movement
				if (this.timeTable.hasClass(classes.shifting)) {
					
					this.setTimeShiftState(false);
					this.timeShift(false);
					
				}
				
			}).on('resize', () => {
				
				this.container.trigger('resize.jqTimespace');
				
			});
			
			// Navigation Events
			this.navLeft.on('mousedown', () => {
				if (this.options.navigateAmount > 0) { this.setNavInterval('left'); }
			});
			this.navRight.on('mousedown', () => {
				if (this.options.navigateAmount > 0) { this.setNavInterval('right'); }
			});
			
			// Time Table Events
			this.timeTable.on('mousedown', (e) => {
				
				if (this.shiftXEnabled || this.shiftYEnabled) {
					
					this.viewData.shiftOriginX = this.getTablePosition();
					this.viewData.shiftOriginY = this.getTableBodyPosition();
					this.lastMousePosX = e.pageX;
					this.lastMousePosY = e.pageY;
					this.setTimeShiftState(true);
					$(global).on('mousemove.jqTimespace', this.timeShift.bind(this));
					
				}
				
			});
			this.timeTableLine.on('mousedown', (e) => { this.timeTable.trigger('mousedown', [e]); });
			
			// Event Marker Events
			this.timeEvents.each(function () {
				
				const elem = $(this);
				
				if (!elem.data('noDetails')) {
					elem.on('mouseup', (e, preventScroll) => {
						
						// Allow if event is not selected and time table has not shifted too much
						if (!elem.hasClass(classes.eventSelected)
							&& Math.abs(ts.viewData.shiftOriginX - ts.getTablePosition()) < 10
							&& Math.abs(ts.viewData.shiftOriginY - ts.getTableBodyPosition()) < 10) {
							
							ts.displayEvent(elem, preventScroll);
							
						}
						
					});
				}

			});
			
			// Event Display Nav
			this.displayLeft.on('click', () => {
				
				const len = -ts.timeEvents.length,
					index = ts.timeEvents.index(ts.curEvent);
				
				// Check for the next or previous event that doesn't have noDetails
				if (index >= 0) {
					for (let i = -1; i >= len; i -= 1) {
						if (!ts.timeEvents.eq(index + i).data('noDetails')) {
							
							ts.displayEvent(ts.timeEvents.eq(index + i));
							break;
							
						}
					}
				}
				
			});
			this.displayRight.on('click', () => {
				
				const len = ts.timeEvents.length;
				let index = ts.timeEvents.index(ts.curEvent);
				
				// Check for the next event that doesn't have noDetails
				if (index >= 0) {
					for (let i = 1; i <= len; i += 1) {
						
						// If reached the end of collection, start again at 0 (index + i === 0)
						if (index + i === len) { index = -i; }
						if (!ts.timeEvents.eq(index + i).data('noDetails')) {
							
							ts.displayEvent(ts.timeEvents.eq(index + i));
							break;
							
						}
						
					}
				}
				
			});
			
			return this;
			
		},
		
		/**
		 * Update the currently visible wide heading
		 * @param {number} xDiff The shift x difference if table is shifting
		 * @return {Object} The Plugin instance
		 */
		updateCurWideHeading: function (xDiff) {
			
			if (!this.checkCurWideHeading(null, xDiff) && this.wideHeadings.length > 0) {
				this.wideHeadings.each((i, elem) => {
					this.setCurWideHeading($(elem), xDiff);
				});
			}
			
			return this;
			
		},
		
		/**
		 * Check if the current wide heading is still in visible bounds
		 * @param {Object?} elem The optional jQuery heading th element
		 * @param {number} xDiff The shift x difference if table is shifting
		 * @return {bool}
		 */
		checkCurWideHeading: function (elem, xDiff) {
			
			const e = elem || this.curWideHeading;
			
			if (!e || e.length < 1) { return false; }
			
			const left = e.offset().left - (xDiff || 0),
				textSpan = e.data('textSpan');
			
			return ((left + e.data('span') - textSpan - this.viewData.halfX) > this.viewData.left
				&& (left + textSpan + this.viewData.halfX) < this.viewData.offsetX);
			
		},
		
		/**
		 * Set the currently visible wide heading
		 * @param {Object} elem The jQuery heading th element
		 * @param {number} xDiff The shift x difference if table is shifting
		 * @return {Object} The Plugin instance
		 */
		setCurWideHeading: function (elem, xDiff) {
			
			const ts = this;
			
			let lastHeading = null;
			
			if (this.checkCurWideHeading(elem, xDiff)) {
				
				// Remove current title clamp if exists
				if (this.curWideHeading) {
					this.curWideHeading.children('span').css('opacity', 1);
				}
				
				// Set up new clone title for heading clamp
				this.curWideHeading = elem;
				elem.children('span').css('opacity', 0)
					.clone()
					.addClass(classes.titleClamp)
					.prependTo(this.tableContainer)
					.css('top', (this.viewData.headerHeight / 2) - (this.viewData.headerLineHeight / 2))
					.animate({ opacity: 1 }, 250);
				
			} else if (this.curWideHeading
				&& this.curWideHeading[0] === elem[0]) {
				
				// Current wide heading is no longer within view range
				this.curWideHeading.children('span').css('opacity', 1);
				lastHeading = this.curWideHeading;
				this.curWideHeading = null;
				
				// Fade out old clamp and remove if not needed
				this.tableContainer.find('.' + classes.titleClamp).animate({ 'opacity' : 0 }, 250, function () {
					
					// Only remove if not still in use
					if (!ts.curWideHeading || ts.curWideHeading[0] !== lastHeading[0]) {
						$(this).remove();
					}
					
				});
				
			}
			
			return this;
			
		},
		
		/**
		 * Set up navigation interval for holding down left or right nav buttons
		 * @param {string} dir 'left' or 'right'
		 * @return {Object} The Plugin instance
		 */
		setNavInterval: function (dir) {
			
			this.navInterval.dir = dir;
			this.navigate(dir, -1);
			this.navInterval.timer = setInterval(() => {
				
				this.navInterval.engaged = true;
				this.navigate(dir, -1, 'linear');
				
			}, 200);
			
			return this;
			
		},
		
		/**
		 * Clear navigation interval
		 * @return {Object} The Plugin instance
		 */
		clearNavInterval: function () {
			
			if (this.navInterval.timer) {
				
				clearInterval(this.navInterval.timer);
				this.navInterval.timer = null;
				
				if (this.navInterval.engaged) {
					
					this.navInterval.engaged = false;
					this.navigate((this.navInterval.dir === 'left')
						? -this.options.markerWidth : this.options.markerWidth, -1);
					
				}
				
			}
			
			return this;
			
		},
		
		/**
		 * Navigate the time table in a direction or by a specified amount
		 * @param {string|number} direction 'left', 'right', or a positive or negative amount
		 * @param {number} duration The duration in seconds, or -1
		 * @param {string} ease The transition ease type
		 * @param {bool} isTableShift If the direction amount is the actual table shiftPos
		 * @return {Object} The Plugin instance
		 */
		navigate: function (dir, duration, ease, isTableShift) {
			
			let x = dir,
				y = 0;
			
			this.transition = duration;
			this.transitionEase = ease;
			this.setTimeShiftState(false);
			
			if (Array.isArray(dir)) {
				
				x = dir[0];
				y = dir[1];
				
			}
			
			if (typeof x === 'number') {
				
				// If shifting table or navigating by an amount
				if (isTableShift) {
					
					this.shiftDirX = (x > 0) ? '>' : '<';
					this.shiftPosX = x;
					
				} else {
					
					this.shiftDirX = (x > 0) ? '<' : '>';
					this.shiftPosX = this.getTablePosition() - x;
					
				}
				
				if (y) {
					
					this.shiftDirY = (y > 0) ? '<' : '>';
					this.shiftPosY = this.getTableBodyPosition() - y;
					
				}
				
				this.timeShift(false);
				
			} else {
				
				// If direction is left, the table is shifted to the right
				x = (x === 'left') ? '>' : '<';
				this.timeShift(false, x);
				
			}
			
			return this;
			
		},
		
		/**
		 * Set the time table and container states for shifting
		 * @return {Object} The Plugin instance
		 */
		setTimeShiftState: function (on) {
			
			const tables = this.tableContainer.add(this.timeTable);
			
			// Reset Transition
			this.timeTableBody.removeClass(classes.animated);
			tables.removeClass(classes.animated).css({
				transitionDuration: '',
				transitionTimingFunction: '',
			});
			
			if (on) {
				
				this.timeTable.addClass(classes.shifting);
				this.transition = -1; // Reset the custom transition duration
				
			} else {
				
				this.timeTableBody.addClass(classes.animated);
				tables.addClass(classes.animated);
				this.timeTable.removeClass(classes.shifting);
				
				// Check if custom transition time is used
				if (this.transition >= 0) {
					tables.css('transitionDuration', this.transition + 's');
				}
				
				// Check if custom transition ease is used
				if (!utility.isEmpty(this.transitionEase)) {
					tables.css('transitionTimingFunction', this.transitionEase);
				}
				
			}
			
			return this;
			
		},
		
		/**
		 * Shift the time table
		 * @param {Object|bool} e The jQuery Event object or false if finished
		 * @param {string} navX The x direction to shift '<' or '>'
		 * @return {Object} The Plugin instance
		 */
		timeShift: function (e, navX) {
			
			const opts = this.options,
				canShiftX = this.shiftXEnabled,
				canShiftY = this.shiftYEnabled;
			
			if (!canShiftX && !canShiftY) { return this; }
			
			let finished = (e === false),
				x = (finished) ? 0 : e.pageX,
				y = (finished) ? 0 : e.pageY;
			
			if (navX) {
				
				this.shiftDirX = navX;
				this.shiftPosX = (navX === '<') ? this.getTablePosition() - opts.navigateAmount
					: this.getTablePosition() + opts.navigateAmount;
				
			}
			if (canShiftX) {
				
				this.timeShiftPos('X')
					.updateCurWideHeading(
						(this.shiftPosX) ? parseInt(this.timeTable.css('left')) - this.shiftPosX : 0
					)
					.timeShiftCache('X', x, finished);
				
			}
			if (canShiftY) {
				
				this.timeShiftPos('Y')
					.timeShiftCache('Y', y, finished);
				
			}
			
			return this;
			
		},
		
		/**
		 * Apply the new position to the time table
		 * @param {string} plane 'X' or 'Y'
		 * @return {Object} The Plugin instance
		 */
		timeShiftPos: function (plane) {
			
			if (this['shiftPos' + plane] === null) { return this; }
			
			const isX = plane === 'X',
				target = (isX) ? 'timeTable' : 'timeTableBody',
				shiftPos = 'shiftPos' + plane,
				shiftDir = 'shiftDir' + plane,
				tableOffset = 'tableOffset' + plane,
				css = (isX) ? 'left' : 'top';
			
			// Table must be moved within bounds
			if ((this[shiftDir] === '<' && this[shiftPos] >= -this.viewData[tableOffset])
				|| (this[shiftDir] === '>' && this[shiftPos] <= 0)) {
				
				this[target].css(css, this[shiftPos] + 'px');
				if (isX) { this.tableContainer.css('backgroundPosition', `bottom 0 left ${Math.floor(this[shiftPos] / 3)}px`); }
				
			} else if (this[shiftDir] === '<' && this[shiftPos] < -this.viewData[tableOffset]) {
				
				this[shiftPos] = -this.viewData[tableOffset];
				this[target].css(css, -this.viewData[tableOffset] + 'px');
				if (isX) { this.tableContainer.css('backgroundPosition', `bottom 0 left ${Math.floor(-this.viewData[tableOffset] / 3)}px`); }
				
			} else if (this[shiftDir] === '>' && this[shiftPos] > 0) {
				
				this[shiftPos] = 0;
				this[target].css(css, 0);
				if (isX) { this.tableContainer.css('backgroundPosition', 'bottom 0 left 0'); }
			}
			
			return this;
			
		},
		
		/**
		 * Cache new position for next mousemove event
		 * @param {string} plane 'X' or 'Y'
		 * @param {number} val The x or y value
		 * @param {bool} finished If the time shift is finished
		 * @return {Object} The Plugin instance
		 */
		timeShiftCache: function (plane, val, finished) {
			
			const isX = (plane === 'X'),
				lastMousePos = 'lastMousePos' + plane,
				shiftPos = 'shiftPos' + plane,
				shiftDir = 'shiftDir' + plane,
				dragMultiplier = `drag${plane}Multiplier`,
				posMethod = (isX) ? 'getTablePosition' : 'getTableBodyPosition';
			
			let dir = 0;
			
			if (val !== this[lastMousePos] && !finished) {
				
				dir = val - this[lastMousePos];
				this[shiftPos] = this[posMethod]() + (dir * this.options[dragMultiplier]);
				this[shiftDir] = (dir < 0) ? '<' : '>';
				this[lastMousePos] = val;
				
			} else {
				this[shiftPos] = null;
			}
			
			return this;
			
		},
		
		/**
		 * Display a time event
		 * @param {Object} elem The time event jQuery element
		 * @param {bool} preventScroll If the height overhang scroll should be prevented
		 * @return {Object} The Plugin instance
		 */
		displayEvent: function (elem, preventScroll) {
			
			let top = elem.offset().top;
			
			this.curEvent = elem;
			this.timeEvents.removeClass(classes.eventSelected);
			this.display.show();
			this.displayTitle.html(elem.data('title'));
			this.displayBody.empty().append(elem.data('description'));
			elem.addClass(classes.eventSelected);
			
			if (!utility.isEmpty(elem.data('time'))) {
				
				this.displayTime.text(elem.data('time'))
					.addClass(classes.timeframe);
				
			} else {
				this.displayTime.removeClass(classes.timeframe);
			}
			
			if (this.options.scrollToDisplayBox
				&& !preventScroll
				&& this.viewData.heightOverhang
				&& elem.data('description').length > 0) {
				
				// Scroll to the Event Display Box if it has a description
				$('html, body').animate({ scrollTop: this.display.offset().top });
				
			}
			
			if (this.options.shiftOnEventSelect) {
				
				// Shift the time table to the selected event
				this.navigate([
					this.timeTableLine.position().left - elem.parents('div').position().left,
					top - (this.viewData.offsetY - this.viewData.halfY),
				], -1, null, true);
				
			}
			
			elem.data('eventCallback')();
			
			return this;
			
		},
		
		/**
		 * Get the time table's left position
		 * @param {bool} offset If the offset is needed
		 * @return {number}
		 */
		getTablePosition: function (offset) {
			return parseFloat((offset) ? this.timeTable.offset().left : this.timeTable.css('left'));
		},
		
		/**
		 * Get the time table body's top position
		 * @return {number}
		 */
		getTableBodyPosition: function () {
			return parseFloat(this.timeTableBody.css('top'));
		},
		
		/**
		 * Get a time string appropriate for displaying
		 * @param {number} time The time integer
		 * @return {string|null}
		 */
		getDisplayTime: function (time) {
			
			if (!utility.isEmpty(time)) {
				
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
				// Correct if time is 0 AD
				return (time === 0) ? 1 : Math.abs(time);
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
		 * Get the full start and end date string
		 * @param {number} start The start date with the suffix
		 * @param {number} end The end date with the suffix
		 * @return {string}
		 */
		getFullDate: function (start, end) {
			
			let time = (!utility.isEmpty(start)) ? this.getDisplayTime(start) : '';
			time += (!utility.isEmpty(end) && end !== start) ? ` – ${this.getDisplayTime(end)}` : '';
			
			return time;
			
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
			
			start = this.roundToIncrement('round', increment, start);
			end = this.roundToIncrement('round', increment, end);
			
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
			
			time1 = this.roundToIncrement('round', increment, time1);
			time2 = this.roundToIncrement('round', increment, time2);
			
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
		 * Check if a variable is empty
		 * @param {any} v The variable to check
		 * @return {bool}
		 */
		isEmpty: (v) => (v === null || v === undefined || v === ''),
		
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
