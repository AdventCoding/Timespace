# jQuery Timespace

The jQuery Timespace plugin provides a way to handle the display of event data in a horizontal table that can be dragged in all directions. Each event in the time table can be selected to display more details about the event.
>Important: This Plugin uses features that are not supported by any Internet Explorer version.

## Example

See the example.html file for more details.
>[Codepen Example](https://codepen.io/adventcoding/full/pLXGOO/)

## API

We can call the Timespace plugin on an empty container and send in some data. See the example.html file for more information on the options argument and how to format the data.

```js
$('#timeContainer').timespace(options, callback);
```
 - options : The options object
 - callback : A callback function to execute on completion. If using a URL for the data option and it fails to load, the callback will receive the jqxhr object.

### Options

| Key | Description | Default |
| :---: | --- | :---: |
| data | The data to use for the Timespace instance (See data variable below), or a URL for loading the data object with jQuery.get() | null |
| startTime | The starting time of the time table | 0 |
| endTime | The ending time of the time table | 24 |
| markerAmount | The amount of time markers to use (0 to calculate from startTime, endTime, and markerIncrement) | 0 |
| markerIncrement | The amount of time each marker spans | 1 |
| markerWidth | The width of each time marker td element (0 to calculate from maxWidth and markerAmount) | 100 |
| maxWidth | The maximum width for the time table container | 1000 |
| maxHeight | The maximum height for the time table container | 280 |
| navigateAmount | The amount of pixels to move the time table on navigation (0 to disable) | 400 |
| dragXMultiplier | The multiplier to use with navigateAmount when dragging the time table horizontally | 1 |
| dragYMultiplier | The multiplier to use with navigateAmount when dragging the time table vertically | 1 |
| selectedEvent | The index number of the event to start on (0 for first event, -1 to disable) | 0 |
| shiftOnEventSelect | If the time table should shift on event selection | true |
| scrollToDisplayBox | If the window should scroll to the display box on event selection (only applies if the time table height is greater than the window height, and if the event has a description) | true |
| customEventDisplay | The jQuery Object of the element to use for the display box | null |
| timeType | Use 'hour' or 'date' for the type of time being used. Note: If using 'date', 0 AD will display as 1 AD | 'hour' |
| use12HourTime | If using 12-Hour time (e.g. '2:00 PM' instead of '14:00') | true |
| useTimeSuffix | If a suffix should be added to the displayed time (e.g. '12 AM' or '300 AD') - No time suffix is used if timeType is 'hour' and use12HourTime is false | true |
| timeSuffixFunction | The function that receives the lowercase suffix string and returns a formatted string | s => ' ' + s[0].toUpperCase() + s[1].toUpperCase() |
| controlText | The object of title texts for the various control elements | (See controlText variable below) |

```js
let data = {
	headings: [
		{
			// Important: The start and end times for the headings are rounded to the increment
			//   e.g. If my increment is 10, a start time of 35 will round to 40, and 34 will round to 30.
			start: number, // The start time for the heading
			end:   number, // The end time for the heading (only optional for the last heading)
			title: string, // The text for the heading
		}
	],
	events: [
		{
			start:       number,         // The start time for the event
			end:         number,         // The optional end time for the event
			title:       string,         // The text for the event title
			description: string||jQuery, // The optional text or jQuery Object for the event description
			width:       number,         // The optional width for the event box
			noDetails:   bool,           // If the time event should not have a display (If noDetails and a description exists, it will be used for the event's title attribute)
			class:       string,         // The optional CSS class to use for the event's <p> element
			callback:    Function,       // The optional callback to run on event selection.
			// The callback cannot be an arrow function if calling any API methods within the callback
		}
	]
};

let controlText = {
	navLeft: 'Move Left',
	navRight: 'Move Right',
	drag: 'Drag',
	eventLeft: 'Previous Event',
	eventRight: 'Next Event',
};
```

### Methods & Properties

These methods and properties can only be accessed from within a callback function using the this keyword.

### .shiftOnEventSelect

To set the shiftOnEventSelect option from within a callback function:
```js
this.shiftOnEventSelect = true;
```

### .navigateAmount

To set the navigateAmount option from within a callback function:
```js
this.navigateAmount = true;
```

### .container

To get the jQuery container element of the Timespace instance from within a callback function:
```js
let myContainer = this.container;
```

### .event

To get the currently selected event's jQuery div element of the Timespace instance from within a callback function:
Note: Returns null if no event is currently selected.
```js
let eventBox = this.event;
```

### .navigateTime(direction, duration)

Navigate the time table in a direction or by a specified amount.
 - direction : An [x, y] Array with x = 'left' or 'right', y = 'up' or 'down', or positive or negative numbers
 - duration : The amount of seconds for the time table to animate its position

## License

[MIT](https://github.com/AdventCoding/Timespace/blob/master/LICENSE)
