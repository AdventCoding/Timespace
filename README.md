# jQuery Timespace

The jQuery Timespace plugin is a way to handle the display of event data in a horizontal table that can be dragged left and right. Each event in the time table can be clicked on to display more details about the event.
>Important: This Plugin is not intended to support any version of Internet Explorer unless transpiled

## Example

See the example.html file for more details.

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
| maxWidth | The maximum width for the Timespace container | 1000 |
| maxHeight | The maximum height for the Timespace container | 320 |
| navigateAmount | The amount of pixels to move the Timespace on navigation (0 to disable) | 400 |
| dragXMultiplier | The multiplier to use with navigateAmount when dragging the time table horizontally | 1 |
| dragYMultiplier | The multiplier to use with navigateAmount when dragging the time table vertically | 1 |
| selectedEvent | The index number of the event to start on (0 for first event, -1 to disable) | 0 |
| shiftOnEventSelect | If the time table should shift on event selection | true |
| scrollToDisplayBox | If the window should scroll to the event display box on event selection (only applies if the time table height is greater than the window height, and if the event has a description) | true |
| customEventDisplay | The jQuery Object of the element to use for the event display box | null |
| timeType | Use 'hour' or 'date' for the type of time being used. Note: If using 'date', 0 AD will display as 1 AD | 'hour' |
| use12HourTime | If using 12-Hour time (e.g. '2:00 PM' instead of '14:00') | true |
| useTimeSuffix | If a suffix should be added to the displayed time (e.g. '12 AM' or '300 AD') - No time suffix is used if timeType is 'hour' and use12HourTime is false | true |
| timeSuffixFunction | A function that receives the lowercase suffix string and returns a formatted string | s => ' ' + s[0].toUpperCase() + s[1].toUpperCase() |
| startTime | The starting time | 0 |
| endTime | The ending time | 24 |
| markerAmount | The amount of time markers to use (0 to calculate from startTime, endTime, and markerIncrement) | 0 |
| markerIncrement | The amount of time each marker spans | 1 |
| markerWidth | The width of each time marker td element (0 to calculate from maxWidth and markerAmount) | 100 |
| data | The data to use for the Timespace instance (See below for more info), or a URL for loading the data object with jQuery.get() | null |

```js
let data = {
	headings: [
		{
			// Important: The start and end times for the headings are rounded to the increment
			//   e.g. If my increment is 10, a start time of 35 will round to 40, and 34 will round to 30.
			start: number // The start time for the heading
			end:   number // The end time for the heading / Optional only for the last heading
			title: string // The text for the heading
		}
	],
	events: [
		{
			start:       number         // The start time for the event
			end:         number         // The optional end time for the event
			title:       string         // The text for the event title
			description: string||jQuery // The optional text or jQuery Object for the event description
			width:       number         // The optional width for the event box
			noDetails:   bool           // If the time event should not have a display (If noDetails and a description exists, it will be used for the event's title attribute)
			class:       string         // The optional CSS class to use for the event's <p> element
			callback:    Function       // The optional callback to run on event selection.
			// The callback Cannot be an arrow function if calling any API methods within the callback
		}
	]
}
```

### Methods & Properties

These methods and properties can only be accessed from within a callback function using the this keyword.

### .shiftOnEventSelect

To set the shiftOnEventSelect option inside a callback function:
```js
this.shiftOnEventSelect = true;
```

### .shiftOnEventSelect

To set the navigateAmount option inside a callback function:
```js
this.navigateAmount = true;
```

### .container

To get the jQuery container object of the Timespace instance inside a callback function:
```js
let myContainer = this.container;
```

### .navigateTime(direction, duration)

Navigate the time table in a direction or by a specified amount.
 - direction : 'left', 'right', or a positive or negative amount
 - duration : The amount of seconds for the time table to animate its position

## License

[MIT](https://github.com/AdventCoding/Timespace/blob/master/LICENSE)
