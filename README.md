# jQuery Timespace

The jQuery Timespace plugin is a way to handle the display of event data in a horizontal table that can be dragged left and right. Each event in the time table can be clicked on to display more details about the event.

## Example

See the example.html file for more details.

## API

We can call the Timespace plugin on an empty container and send in some data. See the example.html file for more information on the options argument and how to format the data.

```js
$('#timeContainer').timespace(options, callback);
```

### Options

| Key | Description | Default |
| :---: | --- | :---: |
| maxWidth | The maximum width for the Timespace container | 1000 |
| navigateAmount | The amount of pixels to move the Timespace on navigation (0 to disable) | 200 |
| selectedEvent | The index number of the event to start on (0 for first event, -1 to disable) | 0 |
| shiftOnEventSelect | If the time table should shift when an event is selected | true |
| startTime | The starting time number | 0 |
| endTime | The ending time number | 24 |
| markerAmount | The amount of time markers to use (0 to calculate from startTime, endTime, and markerIncrement) | 0 |
| markerIncrement | The amount of time between each marker | 1 |
| markerWidth | The width of each time marker | 100 |
| data | The data to use for the Timespace instance. See below for more info | null |

```js
let data = {
	headings: [
		{
			start: number // The start time for the heading
			end:   number // The end time for the heading / Optional only for the last heading
			title: string // The text for the heading
		}
	],
	events: [
		{
			start:       number        // The start time for the event
			end:         number        // The optional end time for the event
			title:       string        // The text for the event title
			description: string||jQuery // The optional text or jQuery Object for the event description
			width:       number        // The optional width for the event box
			height:      number        // The optional height for the event box
			noDetails:   bool          // If the time event should not have a display
			callback:    Function      // The optional callback to run on event selection. The callback Cannot be an arrow function if calling any API methods within the callback
		}
	]
}
```

### Methods & Properties

These methods can only be accessed from within a callback function using the this keyword

### .navigateTime(direction)

Navigate the time table in a direction or by a specified amount
 - direction : 'left', 'right', or a positive or negative amount

## License

[MIT](https://github.com/AdventCoding/???/blob/master/LICENSE)
